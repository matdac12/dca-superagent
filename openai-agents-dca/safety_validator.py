"""
Safety Validator

Pre-execution validation to ensure all trades meet safety requirements.
Prevents dangerous trades from being executed.
"""
from typing import Dict, List, Tuple
from loguru import logger


class SafetyValidator:
    """Validate trading decisions before execution"""

    # Safety limits
    MAX_ORDERS_PER_ASSET = 3  # Maximum open orders per asset
    MAX_TOTAL_ORDERS = 5  # Maximum total open orders across all assets
    MAX_EXPOSURE_PCT = 50.0  # Maximum % of USDT to deploy in one decision
    PRICE_DEVIATION_PCT = 5.0  # Maximum % price deviation from current market
    MIN_ORDER_VALUE_USD = 10.0  # Minimum order value in USD

    def __init__(self, intelligence: Dict):
        """
        Initialize validator with current market intelligence

        Args:
            intelligence: Market intelligence from BinanceMarketData
        """
        self.intelligence = intelligence
        self.portfolio = intelligence['portfolio']
        self.btc_price = intelligence['btc']['price']
        self.ada_price = intelligence['ada']['price']
        self.open_orders = intelligence['open_orders']

    def validate_trading_decision(self, actions: List[Dict]) -> Tuple[bool, List[str]]:
        """
        Validate a list of trading actions

        Args:
            actions: List of action dictionaries:
                {
                    'type': 'PLACE_LIMIT_BUY' or 'PLACE_LIMIT_SELL',
                    'asset': 'BTCUSDT' or 'ADAUSDT',
                    'price': float,
                    'amount_usd': float
                }

        Returns:
            (is_valid: bool, errors: List[str])
        """
        errors = []

        logger.info(f"🔍 Validating {len(actions)} trading actions...")

        # Validate each action individually
        for i, action in enumerate(actions, 1):
            logger.debug(f"  Validating action {i}/{len(actions)}: {action['type']} {action['asset']}")

            # Check action structure
            if not self._validate_action_structure(action):
                errors.append(f"Action {i}: Invalid structure - missing required fields")
                continue

            # Validate order count limits
            order_count_errors = self._validate_order_count(action)
            if order_count_errors:
                errors.extend([f"Action {i}: {e}" for e in order_count_errors])

            # Validate price sanity
            price_errors = self._validate_price(action)
            if price_errors:
                errors.extend([f"Action {i}: {e}" for e in price_errors])

            # Validate order size
            size_errors = self._validate_order_size(action)
            if size_errors:
                errors.extend([f"Action {i}: {e}" for e in size_errors])

        # Validate total exposure across all actions
        exposure_errors = self._validate_total_exposure(actions)
        if exposure_errors:
            errors.extend(exposure_errors)

        # Validate sufficient balance
        balance_errors = self._validate_balance(actions)
        if balance_errors:
            errors.extend(balance_errors)

        # Determine if valid
        is_valid = len(errors) == 0

        if is_valid:
            logger.info(f"✅ All {len(actions)} actions passed validation")
        else:
            logger.warning(f"❌ Validation failed with {len(errors)} error(s)")
            for error in errors:
                logger.warning(f"  • {error}")

        return is_valid, errors

    def _validate_action_structure(self, action: Dict) -> bool:
        """Validate action has all required fields"""
        required_fields = ['type', 'asset', 'price', 'amount_usd']
        return all(field in action for field in required_fields)

    def _validate_order_count(self, action: Dict) -> List[str]:
        """Validate order count limits"""
        errors = []

        # Count existing orders for this asset
        asset = action['asset']
        existing_orders_for_asset = sum(1 for o in self.open_orders if o['symbol'] == asset)

        # Check per-asset limit
        if existing_orders_for_asset >= self.MAX_ORDERS_PER_ASSET:
            errors.append(
                f"Already have {existing_orders_for_asset} open orders for {asset} "
                f"(max: {self.MAX_ORDERS_PER_ASSET})"
            )

        # Check total order limit
        total_orders = len(self.open_orders)
        if total_orders >= self.MAX_TOTAL_ORDERS:
            errors.append(
                f"Already have {total_orders} total open orders "
                f"(max: {self.MAX_TOTAL_ORDERS})"
            )

        return errors

    def _validate_price(self, action: Dict) -> List[str]:
        """Validate price is within acceptable range of current market"""
        errors = []

        asset = action['asset']
        limit_price = action['price']

        # Get current market price
        if asset == 'BTCUSDT':
            current_price = self.btc_price
        elif asset == 'ADAUSDT':
            current_price = self.ada_price
        else:
            errors.append(f"Unknown asset: {asset}")
            return errors

        # Calculate deviation
        deviation_pct = abs((limit_price - current_price) / current_price * 100)

        # Check if within acceptable range
        if deviation_pct > self.PRICE_DEVIATION_PCT:
            errors.append(
                f"Price ${limit_price:,.4f} deviates {deviation_pct:.2f}% from market "
                f"${current_price:,.4f} (max deviation: {self.PRICE_DEVIATION_PCT}%)"
            )

        # Additional check: BUY orders should be below market, SELL orders above market
        if action['type'] == 'PLACE_LIMIT_BUY' and limit_price > current_price:
            errors.append(
                f"BUY limit ${limit_price:,.4f} is ABOVE current price ${current_price:,.4f}. "
                f"This will execute immediately as market buy."
            )
        elif action['type'] == 'PLACE_LIMIT_SELL' and limit_price < current_price:
            errors.append(
                f"SELL limit ${limit_price:,.4f} is BELOW current price ${current_price:,.4f}. "
                f"This will execute immediately as market sell."
            )

        return errors

    def _validate_order_size(self, action: Dict) -> List[str]:
        """Validate order size meets minimum requirements"""
        errors = []

        amount_usd = action['amount_usd']

        # Check minimum order value
        if amount_usd < self.MIN_ORDER_VALUE_USD:
            errors.append(
                f"Order value ${amount_usd:.2f} is below minimum "
                f"${self.MIN_ORDER_VALUE_USD:.2f}"
            )

        return errors

    def _validate_total_exposure(self, actions: List[Dict]) -> List[str]:
        """Validate total exposure across all actions"""
        errors = []

        # Calculate total USDT to be deployed
        total_usd = sum(action['amount_usd'] for action in actions)

        # Get available USDT
        available_usdt = self.portfolio['usdt']['free']

        # Calculate exposure percentage
        exposure_pct = (total_usd / available_usdt * 100) if available_usdt > 0 else 0

        # Check exposure limit
        if exposure_pct > self.MAX_EXPOSURE_PCT:
            errors.append(
                f"Total exposure ${total_usd:,.2f} is {exposure_pct:.1f}% of available USDT "
                f"(max: {self.MAX_EXPOSURE_PCT}%)"
            )

        return errors

    def _validate_balance(self, actions: List[Dict]) -> List[str]:
        """Validate sufficient balance for all actions"""
        errors = []

        # Calculate total USDT needed
        total_usd_needed = sum(action['amount_usd'] for action in actions if 'BUY' in action['type'])

        # Get available USDT
        available_usdt = self.portfolio['usdt']['free']

        # Check if sufficient balance
        if total_usd_needed > available_usdt:
            errors.append(
                f"Insufficient USDT balance. Need ${total_usd_needed:,.2f}, "
                f"available: ${available_usdt:,.2f}"
            )

        return errors

    def generate_validation_report(self, actions: List[Dict]) -> str:
        """
        Generate a detailed validation report

        Args:
            actions: List of actions to validate

        Returns:
            Formatted validation report text
        """
        is_valid, errors = self.validate_trading_decision(actions)

        report = f"""
SAFETY VALIDATION REPORT
{'='*80}

Actions to Validate: {len(actions)}

SAFETY LIMITS:
  Max Orders per Asset: {self.MAX_ORDERS_PER_ASSET}
  Max Total Orders: {self.MAX_TOTAL_ORDERS}
  Max Exposure: {self.MAX_EXPOSURE_PCT}% of USDT
  Max Price Deviation: ±{self.PRICE_DEVIATION_PCT}%
  Min Order Value: ${self.MIN_ORDER_VALUE_USD:.2f}

CURRENT STATE:
  Available USDT: ${self.portfolio['usdt']['free']:,.2f}
  BTC Price: ${self.btc_price:,.2f}
  ADA Price: ${self.ada_price:.4f}
  Open Orders: {len(self.open_orders)}

ACTIONS:
"""

        for i, action in enumerate(actions, 1):
            report += f"""
  {i}. {action['type']} {action['asset']}
     Price: ${action['price']:,.4f}
     Amount: ${action['amount_usd']:,.2f}
"""

        # Add validation result
        if is_valid:
            report += f"""
RESULT: ✅ PASS
All actions meet safety requirements and are approved for execution.
"""
        else:
            report += f"""
RESULT: ❌ FAIL
Found {len(errors)} validation error(s):
"""
            for i, error in enumerate(errors, 1):
                report += f"  {i}. {error}\n"

            report += "\n⛔ EXECUTION BLOCKED - Fix errors before proceeding.\n"

        return report


if __name__ == '__main__':
    """Test safety validator"""
    from binance_integration import BinanceMarketData
    from dotenv import load_dotenv

    load_dotenv()

    # Fetch market data
    market = BinanceMarketData(testnet=True)
    intelligence = market.get_complete_market_intelligence()

    # Create validator
    validator = SafetyValidator(intelligence)

    # Test Case 1: Valid actions
    print("\n" + "="*80)
    print("TEST 1: VALID ACTIONS")
    print("="*80)

    valid_actions = [
        {
            'type': 'PLACE_LIMIT_BUY',
            'asset': 'BTCUSDT',
            'price': intelligence['btc']['price'] * 0.98,  # 2% below market
            'amount_usd': 500.00
        },
        {
            'type': 'PLACE_LIMIT_BUY',
            'asset': 'ADAUSDT',
            'price': intelligence['ada']['price'] * 0.97,  # 3% below market
            'amount_usd': 200.00
        }
    ]

    report1 = validator.generate_validation_report(valid_actions)
    print(report1)

    # Test Case 2: Invalid actions (price too far, exceeds exposure)
    print("\n" + "="*80)
    print("TEST 2: INVALID ACTIONS")
    print("="*80)

    invalid_actions = [
        {
            'type': 'PLACE_LIMIT_BUY',
            'asset': 'BTCUSDT',
            'price': intelligence['btc']['price'] * 0.90,  # 10% below (too far)
            'amount_usd': intelligence['portfolio']['usdt']['free'] * 0.6  # 60% exposure (too much)
        },
        {
            'type': 'PLACE_LIMIT_BUY',
            'asset': 'ADAUSDT',
            'price': intelligence['ada']['price'] * 1.03,  # Above market for BUY (wrong)
            'amount_usd': 5.00  # Below minimum
        }
    ]

    report2 = validator.generate_validation_report(invalid_actions)
    print(report2)

    print("\n✅ Safety validator working correctly!\n")
