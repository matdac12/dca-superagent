"""
Binance Trade Executor

Executes validated trading actions on Binance (testnet or production).
"""
import os
from typing import Dict, List
from datetime import datetime
from binance.client import Client
from binance.exceptions import BinanceAPIException
from loguru import logger


class BinanceExecutor:
    """Execute trades on Binance after safety validation"""

    def __init__(self, testnet: bool = True):
        """
        Initialize Binance executor

        Args:
            testnet: If True, use Binance testnet. If False, use production.
        """
        self.testnet = testnet

        # Initialize client
        self.client = Client(
            api_key=os.getenv('BINANCE_API_KEY'),
            api_secret=os.getenv('BINANCE_API_SECRET'),
            testnet=testnet
        )

        logger.info(f"Initialized Binance executor (testnet={testnet})")

    def execute_actions(self, actions: List[Dict]) -> Dict:
        """
        Execute a list of validated trading actions

        Args:
            actions: List of action dictionaries:
                {
                    'type': 'PLACE_LIMIT_BUY' or 'PLACE_LIMIT_SELL',
                    'asset': 'BTCUSDT' or 'ADAUSDT',
                    'price': float,
                    'amount_usd': float
                }

        Returns:
            {
                'success': bool,
                'executed': int,
                'failed': int,
                'results': [
                    {
                        'action': {...},
                        'success': bool,
                        'order': {...} or None,
                        'error': str or None
                    }
                ]
            }
        """
        logger.info(f"🚀 Executing {len(actions)} trading actions...")

        results = []
        executed_count = 0
        failed_count = 0

        for i, action in enumerate(actions, 1):
            logger.info(f"  [{i}/{len(actions)}] {action['type']} {action['asset']} "
                       f"@ ${action['price']:,.4f} (${action['amount_usd']:,.2f})")

            try:
                # Execute the action
                if action['type'] == 'PLACE_LIMIT_BUY':
                    order = self._execute_limit_buy(action)
                elif action['type'] == 'PLACE_LIMIT_SELL':
                    order = self._execute_limit_sell(action)
                else:
                    raise ValueError(f"Unknown action type: {action['type']}")

                # Record success
                results.append({
                    'action': action,
                    'success': True,
                    'order': order,
                    'error': None
                })
                executed_count += 1

                logger.info(f"    ✅ Success - Order ID: {order['orderId']}")

            except Exception as e:
                # Record failure
                error_msg = str(e)
                results.append({
                    'action': action,
                    'success': False,
                    'order': None,
                    'error': error_msg
                })
                failed_count += 1

                logger.error(f"    ❌ Failed: {error_msg}")

        # Summary
        logger.info(f"✓ Execution complete: {executed_count} succeeded, {failed_count} failed")

        return {
            'success': failed_count == 0,
            'executed': executed_count,
            'failed': failed_count,
            'results': results
        }

    def _execute_limit_buy(self, action: Dict) -> Dict:
        """
        Execute a limit buy order

        Args:
            action: Action dictionary with 'asset', 'price', 'amount_usd'

        Returns:
            Order response from Binance
        """
        symbol = action['asset']
        original_price = action['price']
        amount_usd = action['amount_usd']

        # Normalize price to match Binance tick size
        limit_price = self._normalize_price(symbol, original_price)
        if limit_price != original_price:
            logger.info(f"  Price normalized: ${original_price:.8f} → ${limit_price:.8f}")

        # Calculate quantity based on normalized price
        quantity = amount_usd / limit_price

        # Normalize quantity to match Binance lot size
        original_quantity = quantity
        quantity = self._normalize_quantity(symbol, quantity)
        if quantity != original_quantity:
            logger.info(f"  Quantity normalized: {original_quantity:.8f} → {quantity:.8f}")

        # Place limit buy order
        try:
            # Format price and quantity as strings with appropriate precision
            price_str = f"{limit_price:.8f}".rstrip('0').rstrip('.')
            quantity_str = f"{quantity:.8f}".rstrip('0').rstrip('.')

            order = self.client.order_limit_buy(
                symbol=symbol,
                quantity=quantity_str,
                price=price_str
            )

            logger.debug(f"Limit BUY order placed: {symbol} qty={quantity_str} @ ${price_str}")

            return order

        except BinanceAPIException as e:
            logger.error(f"Binance API error placing BUY order: {e}")
            logger.error(f"  Order details: {symbol} qty={quantity_str} price={price_str}")
            raise

    def _execute_limit_sell(self, action: Dict) -> Dict:
        """
        Execute a limit sell order

        Args:
            action: Action dictionary with 'asset', 'price', 'amount_usd'

        Returns:
            Order response from Binance
        """
        symbol = action['asset']
        original_price = action['price']
        amount_usd = action['amount_usd']

        # Normalize price to match Binance tick size
        limit_price = self._normalize_price(symbol, original_price)
        if limit_price != original_price:
            logger.info(f"  Price normalized: ${original_price:.8f} → ${limit_price:.8f}")

        # Calculate quantity based on normalized price
        quantity = amount_usd / limit_price

        # Normalize quantity to match Binance lot size
        original_quantity = quantity
        quantity = self._normalize_quantity(symbol, quantity)
        if quantity != original_quantity:
            logger.info(f"  Quantity normalized: {original_quantity:.8f} → {quantity:.8f}")

        # Place limit sell order
        try:
            # Format price and quantity as strings with appropriate precision
            price_str = f"{limit_price:.8f}".rstrip('0').rstrip('.')
            quantity_str = f"{quantity:.8f}".rstrip('0').rstrip('.')

            order = self.client.order_limit_sell(
                symbol=symbol,
                quantity=quantity_str,
                price=price_str
            )

            logger.debug(f"Limit SELL order placed: {symbol} qty={quantity_str} @ ${price_str}")

            return order

        except BinanceAPIException as e:
            logger.error(f"Binance API error placing SELL order: {e}")
            logger.error(f"  Order details: {symbol} qty={quantity_str} price={price_str}")
            raise

    def _normalize_price(self, symbol: str, price: float) -> float:
        """
        Normalize price to match Binance tick size filters

        Args:
            symbol: Trading pair (e.g., 'BTCUSDT')
            price: Raw price

        Returns:
            Normalized price that meets Binance requirements
        """
        try:
            # Get symbol info
            info = self.client.get_symbol_info(symbol)

            # Find PRICE_FILTER
            price_filter = next(
                (f for f in info['filters'] if f['filterType'] == 'PRICE_FILTER'),
                None
            )

            if price_filter:
                tick_size = float(price_filter['tickSize'])
                min_price = float(price_filter['minPrice'])
                max_price = float(price_filter['maxPrice'])

                # Round to nearest tick size
                # Use round() instead of floor to get closest valid price
                price = round(price / tick_size) * tick_size

                # Ensure within min/max bounds
                if price < min_price:
                    logger.warning(f"Price {price} below minimum {min_price}, using minimum")
                    price = min_price
                elif price > max_price:
                    logger.warning(f"Price {price} above maximum {max_price}, using maximum")
                    price = max_price

            return price

        except Exception as e:
            logger.error(f"Failed to normalize price: {e}")
            # Return original price as fallback
            return price

    def _normalize_quantity(self, symbol: str, quantity: float) -> float:
        """
        Normalize quantity to match Binance lot size filters

        Args:
            symbol: Trading pair (e.g., 'BTCUSDT')
            quantity: Raw quantity

        Returns:
            Normalized quantity that meets Binance requirements
        """
        try:
            # Get symbol info
            info = self.client.get_symbol_info(symbol)

            # Find LOT_SIZE filter
            lot_size_filter = next(
                (f for f in info['filters'] if f['filterType'] == 'LOT_SIZE'),
                None
            )

            if lot_size_filter:
                step_size = float(lot_size_filter['stepSize'])
                min_qty = float(lot_size_filter['minQty'])

                # Round down to nearest step size
                quantity = (quantity // step_size) * step_size

                # Ensure meets minimum
                if quantity < min_qty:
                    logger.warning(f"Quantity {quantity} below minimum {min_qty}, using minimum")
                    quantity = min_qty

            return quantity

        except Exception as e:
            logger.error(f"Failed to normalize quantity: {e}")
            # Return original quantity as fallback
            return quantity

    def cancel_order(self, symbol: str, order_id: int) -> Dict:
        """
        Cancel an open order

        Args:
            symbol: Trading pair (e.g., 'BTCUSDT')
            order_id: Order ID to cancel

        Returns:
            Cancellation response from Binance
        """
        try:
            result = self.client.cancel_order(symbol=symbol, orderId=order_id)
            logger.info(f"✓ Cancelled order {order_id} for {symbol}")
            return result

        except BinanceAPIException as e:
            logger.error(f"Failed to cancel order {order_id}: {e}")
            raise

    def cancel_all_orders(self, symbol: str) -> List[Dict]:
        """
        Cancel all open orders for a symbol

        Args:
            symbol: Trading pair (e.g., 'BTCUSDT')

        Returns:
            List of cancellation responses
        """
        try:
            result = self.client.cancel_open_orders(symbol=symbol)
            logger.info(f"✓ Cancelled all open orders for {symbol}")
            return result

        except BinanceAPIException as e:
            logger.error(f"Failed to cancel all orders for {symbol}: {e}")
            raise

    def generate_execution_report(self, execution_result: Dict) -> str:
        """
        Generate a detailed execution report

        Args:
            execution_result: Result dictionary from execute_actions()

        Returns:
            Formatted execution report text
        """
        results = execution_result['results']

        report = f"""
EXECUTION REPORT
{'='*80}

Timestamp: {datetime.now().isoformat()}
Testnet: {self.testnet}

SUMMARY:
  Total Actions: {len(results)}
  Executed: {execution_result['executed']} ✅
  Failed: {execution_result['failed']} ❌
  Overall Status: {'SUCCESS' if execution_result['success'] else 'PARTIAL FAILURE'}

DETAILS:
"""

        for i, result in enumerate(results, 1):
            action = result['action']
            report += f"""
  {i}. {action['type']} {action['asset']}
     Price: ${action['price']:,.4f}
     Amount: ${action['amount_usd']:,.2f}
     Status: {'✅ SUCCESS' if result['success'] else '❌ FAILED'}
"""

            if result['success']:
                order = result['order']
                report += f"     Order ID: {order['orderId']}\n"
                report += f"     Quantity: {float(order['origQty']):.8f}\n"
                report += f"     Status: {order['status']}\n"
            else:
                report += f"     Error: {result['error']}\n"

        return report


if __name__ == '__main__':
    """Test executor (DRY RUN - no actual trades)"""
    from binance_integration import BinanceMarketData
    from safety_validator import SafetyValidator
    from dotenv import load_dotenv

    load_dotenv()

    # Fetch market data
    market = BinanceMarketData(testnet=True)
    intelligence = market.get_complete_market_intelligence()

    # Create test actions
    test_actions = [
        {
            'type': 'PLACE_LIMIT_BUY',
            'asset': 'BTCUSDT',
            'price': intelligence['btc']['price'] * 0.98,  # 2% below market
            'amount_usd': 20.00  # Small test amount
        }
    ]

    # Validate first
    validator = SafetyValidator(intelligence)
    is_valid, errors = validator.validate_trading_decision(test_actions)

    print("\n" + "="*80)
    print("EXECUTOR TEST (TESTNET)")
    print("="*80)

    if is_valid:
        print("\n✅ Actions validated. Ready to execute on testnet.")
        print("\n⚠️  This will place REAL orders on Binance testnet.")
        print("Uncomment the execution code below to proceed.\n")

        # UNCOMMENT TO ACTUALLY EXECUTE:
        # executor = BinanceExecutor(testnet=True)
        # result = executor.execute_actions(test_actions)
        # report = executor.generate_execution_report(result)
        # print(report)
    else:
        print("\n❌ Validation failed:")
        for error in errors:
            print(f"  • {error}")

    print("\n✅ Executor module ready!\n")
