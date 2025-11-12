"""
Market order execution for DCA Simple system

Extends the existing BinanceExecutor to support market orders.
"""
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path to import from existing system
parent_dir = Path(__file__).parent.parent
openai_agents_dir = parent_dir / "openai-agents-dca"
sys.path.insert(0, str(parent_dir))
sys.path.insert(0, str(openai_agents_dir))

from binance_executor import BinanceExecutor
from schemas import Action, ActionType, ExecutionResult
import config


class SimpleMarketExecutor:
    """
    Simplified executor for market orders only.

    Wraps the existing BinanceExecutor and adds market order support.
    """

    def __init__(self):
        """Initialize with Binance executor"""
        self.executor = BinanceExecutor()
        print("✅ Market executor initialized")

    def execute_market_buy(self, asset: str, usd_amount: float) -> ExecutionResult:
        """
        Execute a market buy order.

        Args:
            asset: Trading pair (e.g., 'BTCEUR', 'ADAEUR')
            usd_amount: EUR amount to spend

        Returns:
            ExecutionResult with order details

        Raises:
            Exception: If order execution fails
        """
        print(f"🔄 Executing market buy: €{usd_amount:.2f} {asset}")

        if config.DRY_RUN:
            print(f"   🧪 [DRY RUN] Would buy €{usd_amount:.2f} {asset}")
            return ExecutionResult(
                success=True,
                asset=asset,
                action_type=ActionType.PLACE_MARKET_BUY,
                order_id="DRY_RUN_12345",
                executed_price=0.0,
                executed_quantity=0.0,
                usd_amount=usd_amount,
                fee=usd_amount * 0.001,  # 0.1% fee estimate
                timestamp=datetime.now().isoformat()
            )

        try:
            # Create action for existing executor
            action = Action(
                type=ActionType.PLACE_MARKET_BUY,
                asset=asset,
                quantity=usd_amount,  # Field named 'quantity' but holds EUR amount
                reasoning=f"Market buy €{usd_amount:.2f}"
            )

            # Execute using existing BinanceExecutor
            # Note: We need to adapt this to work with market orders
            # The existing executor only supports limit orders, so we'll
            # use the Binance client directly

            from binance_integration import BinanceMarketData
            binance_data = BinanceMarketData(testnet=config.BINANCE_TESTNET)

            # Get current price for the asset (works for any pair)
            current_price = binance_data.get_ticker_24h(asset)['price']

            # Calculate quantity to buy
            # Get symbol info for precision
            from binance.spot import Spot
            client = Spot(
                api_key=config.BINANCE_API_KEY,
                api_secret=config.BINANCE_SECRET_KEY,
                base_url='https://testnet.binance.vision' if config.BINANCE_TESTNET else 'https://api.binance.com'
            )

            # Get symbol filters
            exchange_info = client.exchange_info(symbol=asset)
            symbol_info = exchange_info['symbols'][0]

            # Find LOT_SIZE filter for quantity precision
            lot_size_filter = next(
                (f for f in symbol_info['filters'] if f['filterType'] == 'LOT_SIZE'),
                None
            )

            if lot_size_filter:
                step_size = float(lot_size_filter['stepSize'])
                precision = int(round(-1 * (step_size.bit_length() - 1) / 3.32193)) if step_size < 1 else 0
            else:
                precision = 8  # Default

            # Calculate quantity
            quantity = usd_amount / current_price
            # Round to correct precision
            quantity = round(quantity, precision)

            print(f"   Price: ${current_price:.8f}, Quantity: {quantity:.8f} (precision: {precision})")

            # Place market order
            order_response = client.new_order(
                symbol=asset,
                side='BUY',
                type='MARKET',
                quantity=quantity
            )

            # Parse response
            filled_qty = float(order_response['executedQty'])
            filled_price = float(order_response['fills'][0]['price']) if order_response['fills'] else current_price
            filled_usd = filled_qty * filled_price
            fee = sum(float(fill['commission']) for fill in order_response['fills']) if order_response['fills'] else 0.0

            result = ExecutionResult(
                success=True,
                asset=asset,
                action_type=ActionType.PLACE_MARKET_BUY,
                order_id=str(order_response['orderId']),
                executed_price=filled_price,
                executed_quantity=filled_qty,
                usd_amount=filled_usd,
                fee=fee,
                timestamp=datetime.now().isoformat()
            )

            print(f"   ✅ Order filled: {filled_qty:.8f} @ ${filled_price:.8f} (${filled_usd:.2f})")
            print(f"   Order ID: {result.order_id}, Fee: ${fee:.4f}")

            return result

        except Exception as e:
            error_msg = f"Market buy failed: {str(e)}"
            print(f"   ❌ {error_msg}")

            return ExecutionResult(
                success=False,
                asset=asset,
                action_type=ActionType.PLACE_MARKET_BUY,
                usd_amount=usd_amount,
                error=error_msg,
                timestamp=datetime.now().isoformat()
            )

    def execute_actions(self, actions: list[Action]) -> list[ExecutionResult]:
        """
        Execute a list of actions (market buys only).

        Args:
            actions: List of Action objects

        Returns:
            List of ExecutionResult objects
        """
        results = []

        for action in actions:
            if action.type == ActionType.HOLD:
                print("✋ HOLD - No orders to execute")
                continue

            elif action.type == ActionType.PLACE_MARKET_BUY:
                result = self.execute_market_buy(action.asset, action.quantity)
                results.append(result)

            else:
                print(f"⚠️  Unsupported action type: {action.type}")
                results.append(ExecutionResult(
                    success=False,
                    asset=action.asset or "UNKNOWN",
                    action_type=action.type,
                    error=f"Unsupported action type: {action.type}",
                    timestamp=datetime.now().isoformat()
                ))

        return results


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

def execute_simple_dca(btc_amount: float, ada_amount: float) -> list[ExecutionResult]:
    """
    Simple convenience function for DCA execution.

    Args:
        btc_amount: USD amount for BTC (0 = skip)
        ada_amount: USD amount for ADA (0 = skip)

    Returns:
        List of ExecutionResult objects
    """
    executor = SimpleMarketExecutor()
    actions = []

    if btc_amount >= config.MIN_ORDER_SIZE:
        actions.append(Action(
            type=ActionType.PLACE_MARKET_BUY,
            asset=config.ASSETS["BTC"],
            quantity=btc_amount,
            reasoning="DCA BTC buy"
        ))

    if ada_amount >= config.MIN_ORDER_SIZE:
        actions.append(Action(
            type=ActionType.PLACE_MARKET_BUY,
            asset=config.ASSETS["ADA"],
            quantity=ada_amount,
            reasoning="DCA ADA buy"
        ))

    if not actions:
        print("No actions to execute (amounts below minimum)")
        return []

    return executor.execute_actions(actions)


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("Testing Market Order Executor\n")

    # Ensure DRY_RUN is enabled for testing
    config.DRY_RUN = True

    print("DRY_RUN mode enabled for testing\n")

    # Test individual order
    print("1. Test individual market buy:")
    executor = SimpleMarketExecutor()
    result = executor.execute_market_buy(config.ASSETS["BTC"], 100.0)
    print(f"   {result}\n")

    # Test multiple orders
    print("2. Test multiple orders:")
    results = execute_simple_dca(btc_amount=100, ada_amount=50)
    for r in results:
        print(f"   {r}")

    print("\n✅ Market executor test complete")
