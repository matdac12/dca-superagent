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
MIN_ORDER_SIZE = 10.0     # Binance minimum order size per asset

# Assets to trade
ASSETS = {
    "BTC": "BTCEUR",
    "ADA": "ADAEUR"
}

# ============================================================================
# DEPLOYMENT LOGIC
# ============================================================================

def calculate_deployment_amount(eur_balance: float) -> float:
    """
    Calculate deployment amount based on balance.

    Strategy (conservative - deploy LESS as balance grows):
    - €10-15: Deploy 95% (must meet €10 minimum order size)
    - €15-25: Deploy 70% (transition zone, smooths the curve)
    - €25-50: Deploy 50% (medium amount, deploy half)
    - €50-100: Deploy 35% (larger amount, more conservative)
    - €100-500: Deploy 25% (even more conservative)
    - €500+: Deploy 20% (very conservative)

    Note: Fees are paid in the purchased asset (BTC/ADA), not EUR.
    The percentage-based approach naturally leaves cushion for any rounding needs.

    Args:
        eur_balance: Current EUR balance

    Returns:
        Maximum EUR amount to deploy this session

    Examples:
        >>> calculate_deployment_amount(12)
        11.4  # 95% of €12

        >>> calculate_deployment_amount(20)
        14.0  # 70% of €20

        >>> calculate_deployment_amount(30)
        15.0  # 50% of €30

        >>> calculate_deployment_amount(100)
        25.0  # 25% of €100
    """
    if eur_balance < MIN_EUR_THRESHOLD:
        return 0.0

    # Determine percentage based on balance tier (decreases as balance grows)
    if eur_balance < 15:
        percentage = 0.95  # 95% (must meet €10 minimum)
    elif eur_balance < 25:
        percentage = 0.70  # 70% (transition zone)
    elif eur_balance < 50:
        percentage = 0.50  # 50%
    elif eur_balance < 100:
        percentage = 0.35  # 35%
    elif eur_balance <= 500:
        percentage = 0.25  # 25%
    else:
        percentage = 0.20  # 20%

    # Calculate deployment amount
    return eur_balance * percentage


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
    elif eur_balance < 15:
        return 0.95  # 95%
    elif eur_balance < 25:
        return 0.70  # 70%
    elif eur_balance < 50:
        return 0.50  # 50%
    elif eur_balance < 100:
        return 0.35  # 35%
    elif eur_balance <= 500:
        return 0.25  # 25%
    else:
        return 0.20  # 20%


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
    print(f"  Min EUR Balance: €{MIN_EUR_THRESHOLD}")
    print(f"  Min Order Size: €{MIN_ORDER_SIZE} per asset")
    print(f"\nDeployment Strategy (% decreases as balance grows):")
    print(f"  €10-15:     95% deployment (must meet €10 minimum)")
    print(f"  €15-25:     70% deployment (transition zone)")
    print(f"  €25-50:     50% deployment")
    print(f"  €50-100:    35% deployment")
    print(f"  €100-500:   25% deployment")
    print(f"  €500+:      20% deployment")
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
