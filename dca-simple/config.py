"""
Configuration for Streamlined DCA System
"""
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv()

# ============================================================================
# API CONFIGURATION
# ============================================================================

# Binance API
BINANCE_API_KEY = os.getenv("BINANCE_API_KEY")
BINANCE_SECRET_KEY = os.getenv("BINANCE_SECRET_KEY")
BINANCE_TESTNET = os.getenv("BINANCE_TESTNET", "true").lower() == "true"

# Telegram Notifications
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

# OpenAI API
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MODEL = "gpt-5-nano"  # Fast, cheap, proven in existing system

# ============================================================================
# DCA LOGIC CONFIGURATION
# ============================================================================

# Balance thresholds
MIN_EUR_THRESHOLD = 10.0  # Skip if balance < €10 EUR
MIN_ORDER_SIZE = 10.0     # Binance minimum order size
FEE_CUSHION = 5.0        # Always leave €5 for fees

# Assets to trade
ASSETS = {
    "BTC": "BTCEUR",
    "ADA": "ADAEUR"
}

# Safety limits (matching existing system for consistency)
MAX_ORDERS_PER_RUN = 2        # BTC + ADA max
MAX_EXPOSURE_PCT = 50.0       # Max 50% of EUR per decision
PRICE_DEVIATION_PCT = 5.0     # For safety validator

# ============================================================================
# DEPLOYMENT LOGIC
# ============================================================================

def calculate_deployment_amount(eur_balance: float) -> float:
    """
    Calculate deployment amount based on balance.

    Strategy:
    - Small balances (€10-100): Deploy up to 50% (need minimum €10 orders)
    - Medium balances (€100-500): Deploy up to 35%
    - Large balances (€500+): Deploy up to 20%

    Args:
        eur_balance: Current EUR balance

    Returns:
        Maximum EUR amount to deploy this session

    Examples:
        >>> calculate_deployment_amount(30)
        15.0  # 50% of €30

        >>> calculate_deployment_amount(200)
        70.0  # 35% of €200

        >>> calculate_deployment_amount(1000)
        200.0  # 20% of €1000
    """
    if eur_balance < MIN_EUR_THRESHOLD:
        return 0.0

    # Determine percentage based on balance tier
    if eur_balance <= 100:
        percentage = 0.50  # 50% for small balances
    elif eur_balance <= 500:
        percentage = 0.35  # 35% for medium balances
    else:
        percentage = 0.20  # 20% for large balances

    # Calculate deployment amount
    deploy = eur_balance * percentage

    # Always leave cushion for fees and rounding
    max_deploy = eur_balance - FEE_CUSHION

    return min(deploy, max(0, max_deploy))


def get_deployment_percentage(eur_balance: float) -> float:
    """
    Get the deployment percentage for a given balance.

    Args:
        eur_balance: Current EUR balance

    Returns:
        Deployment percentage as decimal (0.20 = 20%)
    """
    if eur_balance < MIN_EUR_THRESHOLD:
        return 0.0
    elif eur_balance <= 100:
        return 0.50
    elif eur_balance <= 500:
        return 0.35
    else:
        return 0.20


# ============================================================================
# LOGGING CONFIGURATION
# ============================================================================

# Directories
LOG_DIR = Path(__file__).parent / "logs"
DAILY_LOG_DIR = LOG_DIR / "daily"
EXECUTION_LOG_DIR = LOG_DIR / "executions"

# Create directories if they don't exist
DAILY_LOG_DIR.mkdir(parents=True, exist_ok=True)
EXECUTION_LOG_DIR.mkdir(parents=True, exist_ok=True)

# Log levels
LOG_LEVEL = "INFO"

# ============================================================================
# EXECUTION MODE
# ============================================================================

# Dry run mode (no real orders placed)
DRY_RUN = os.getenv("DRY_RUN", "false").lower() == "true"

# ============================================================================
# MARKET DATA CONFIGURATION
# ============================================================================

# Fear & Greed Index
FEAR_GREED_API = "https://api.alternative.me/fng/"
FEAR_GREED_CACHE_HOURS = 6  # Cache for 6 hours

# RSI periods
RSI_PERIOD = 14

# Technical analysis thresholds (for context in prompts)
RSI_OVERSOLD = 30
RSI_OVERBOUGHT = 70
FEAR_EXTREME_FEAR = 25
GREED_EXTREME_GREED = 75

# ============================================================================
# VALIDATION
# ============================================================================

def validate_config():
    """
    Validate that all required configuration is present.

    Raises:
        ValueError: If required configuration is missing
    """
    errors = []

    # Check API keys
    if not BINANCE_API_KEY:
        errors.append("BINANCE_API_KEY not set in .env")
    if not BINANCE_SECRET_KEY:
        errors.append("BINANCE_SECRET_KEY not set in .env")
    if not OPENAI_API_KEY:
        errors.append("OPENAI_API_KEY not set in .env")

    # Telegram is optional for testing but warn if missing
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("⚠️  Warning: Telegram credentials not set - notifications disabled")

    if errors:
        raise ValueError(
            "Configuration errors:\n" + "\n".join(f"  - {e}" for e in errors)
        )

    print("✅ Configuration validated")


# ============================================================================
# DISPLAY CONFIGURATION (for debugging)
# ============================================================================

def print_config():
    """Print current configuration (masks sensitive data)"""
    print("\n" + "="*60)
    print("DCA SIMPLE - CONFIGURATION")
    print("="*60)
    print(f"Mode: {'🧪 DRY RUN' if DRY_RUN else '💰 LIVE TRADING'}")
    print(f"Environment: {'🧪 Testnet' if BINANCE_TESTNET else '🏦 Production'}")
    print(f"Model: {MODEL}")
    print(f"\nBalance Thresholds:")
    print(f"  Min EUR: €{MIN_EUR_THRESHOLD}")
    print(f"  Min Order: €{MIN_ORDER_SIZE}")
    print(f"  Fee Cushion: €{FEE_CUSHION}")
    print(f"\nDeployment Strategy:")
    print(f"  €0-100:    50% deployment")
    print(f"  €100-500:  35% deployment")
    print(f"  €500+:     20% deployment")
    print(f"\nSafety Limits:")
    print(f"  Max Orders/Run: {MAX_ORDERS_PER_RUN}")
    print(f"  Max Exposure: {MAX_EXPOSURE_PCT}%")
    print(f"\nAssets: {', '.join(ASSETS.keys())}")
    print(f"\nTelegram: {'✅ Enabled' if TELEGRAM_BOT_TOKEN else '❌ Disabled'}")
    print("="*60 + "\n")


if __name__ == "__main__":
    # Test configuration
    validate_config()
    print_config()

    # Test deployment calculation
    print("\nDeployment Calculation Examples:")
    test_balances = [5, 10, 30, 50, 100, 250, 500, 1000, 5000]
    for balance in test_balances:
        deploy = calculate_deployment_amount(balance)
        pct = get_deployment_percentage(balance)
        print(f"  €{balance:>5} EUR → Deploy €{deploy:>6.2f} ({pct*100:.0f}%)")
