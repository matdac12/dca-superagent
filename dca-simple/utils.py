"""
Utility functions for DCA Simple system
"""
import json
import requests
from datetime import datetime
from pathlib import Path
from typing import Dict, Any
import config
from schemas import DCASession, SessionType


# ============================================================================
# FEAR & GREED INDEX
# ============================================================================

_fear_greed_cache = {
    "value": None,
    "timestamp": None
}


def get_fear_greed_index() -> int:
    """
    Fetch current Crypto Fear & Greed Index (0-100).

    Uses alternative.me free API. Cached for 6 hours to reduce API calls.

    Returns:
        Integer 0-100 where:
        - 0-24: Extreme Fear
        - 25-44: Fear
        - 45-55: Neutral
        - 56-75: Greed
        - 76-100: Extreme Greed

    Raises:
        Exception: If API fails and no cache available
    """
    global _fear_greed_cache

    # Check cache
    now = datetime.now()
    if _fear_greed_cache["value"] is not None and _fear_greed_cache["timestamp"]:
        cache_age_hours = (now - _fear_greed_cache["timestamp"]).total_seconds() / 3600
        if cache_age_hours < config.FEAR_GREED_CACHE_HOURS:
            print(f"📊 Using cached Fear & Greed: {_fear_greed_cache['value']} (age: {cache_age_hours:.1f}h)")
            return _fear_greed_cache["value"]

    # Fetch fresh data
    try:
        response = requests.get(config.FEAR_GREED_API, timeout=5)
        response.raise_for_status()
        data = response.json()

        value = int(data["data"][0]["value"])
        label = data["data"][0]["value_classification"]

        # Update cache
        _fear_greed_cache["value"] = value
        _fear_greed_cache["timestamp"] = now

        print(f"📊 Fear & Greed Index: {value} ({label})")
        return value

    except Exception as e:
        print(f"⚠️  Failed to fetch Fear & Greed Index: {e}")

        # Use cache if available
        if _fear_greed_cache["value"] is not None:
            print(f"   Using stale cache: {_fear_greed_cache['value']}")
            return _fear_greed_cache["value"]

        # No cache, return neutral value
        print("   Defaulting to neutral (50)")
        return 50


def get_fear_greed_label(value: int) -> str:
    """
    Get human-readable label for Fear & Greed Index value.

    Args:
        value: Index value (0-100)

    Returns:
        Label string
    """
    if value < 25:
        return "Extreme Fear"
    elif value < 45:
        return "Fear"
    elif value < 55:
        return "Neutral"
    elif value < 75:
        return "Greed"
    else:
        return "Extreme Greed"


# ============================================================================
# LOGGING FUNCTIONS
# ============================================================================

def save_execution_log(session: DCASession) -> Path:
    """
    Save execution session as JSON file.

    Args:
        session: DCASession to save

    Returns:
        Path to saved file
    """
    # Generate filename with timestamp
    timestamp = datetime.fromisoformat(session.timestamp)
    filename = timestamp.strftime("%Y-%m-%d_%H-%M-%S.json")
    filepath = config.EXECUTION_LOG_DIR / filename

    # Save as formatted JSON
    with open(filepath, 'w') as f:
        json.dump(session.model_dump(), f, indent=2)

    print(f"💾 Saved execution log: {filepath}")
    return filepath


def append_daily_log(message: str):
    """
    Append message to today's daily log file.

    Args:
        message: Log message to append
    """
    today = datetime.now().strftime("%Y-%m-%d")
    logfile = config.DAILY_LOG_DIR / f"{today}.log"

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_line = f"[{timestamp}] {message}\n"

    with open(logfile, 'a') as f:
        f.write(log_line)


def log_info(message: str):
    """Log info message to console and daily log"""
    print(f"ℹ️  {message}")
    append_daily_log(f"INFO: {message}")


def log_success(message: str):
    """Log success message to console and daily log"""
    print(f"✅ {message}")
    append_daily_log(f"SUCCESS: {message}")


def log_warning(message: str):
    """Log warning message to console and daily log"""
    print(f"⚠️  {message}")
    append_daily_log(f"WARNING: {message}")


def log_error(message: str):
    """Log error message to console and daily log"""
    print(f"❌ {message}")
    append_daily_log(f"ERROR: {message}")


# ============================================================================
# MARKET DATA FORMATTING
# ============================================================================

def format_market_snapshot(intelligence: Dict[str, Any]) -> str:
    """
    Format market intelligence into readable text.

    Args:
        intelligence: Output from BinanceMarketData.get_complete_market_intelligence()

    Returns:
        Formatted multi-line string
    """
    btc = intelligence['btc']
    ada = intelligence['ada']
    portfolio = intelligence['portfolio']

    # RSI interpretations
    def rsi_status(rsi: float) -> str:
        if rsi < 30:
            return "🟢 Oversold"
        elif rsi > 70:
            return "🔴 Overbought"
        else:
            return "🟡 Neutral"

    snapshot = f"""
╔══════════════════════════════════════════════════════════════╗
║ MARKET SNAPSHOT - {datetime.now().strftime('%Y-%m-%d %H:%M')}                      ║
╠══════════════════════════════════════════════════════════════╣
║ BITCOIN (BTC)                                                ║
║   Price:     ${btc['price']:>10,.2f}  ({btc['change_24h']:>+6.2f}% 24h)        ║
║   RSI(14):   {btc['indicators']['rsi']:>10.1f}  {rsi_status(btc['indicators']['rsi'])}                    ║
║   Volume:    ${btc['volume_24h']:>10,.0f}                               ║
╠══════════════════════════════════════════════════════════════╣
║ CARDANO (ADA)                                                ║
║   Price:     ${ada['price']:>10.4f}  ({ada['change_24h']:>+6.2f}% 24h)        ║
║   RSI(14):   {ada['indicators']['rsi']:>10.1f}  {rsi_status(ada['indicators']['rsi'])}                    ║
║   Volume:    ${ada['volume_24h']:>10,.0f}                               ║
╠══════════════════════════════════════════════════════════════╣
║ PORTFOLIO                                                    ║
║   EUR:       €{portfolio['eur']['free']:>10,.2f}                               ║
║   BTC:       {portfolio['btc']['free']:>10.8f}  (€{portfolio['btc']['value_usd']:>8,.2f})     ║
║   ADA:       {portfolio['ada']['free']:>10.2f}  (€{portfolio['ada']['value_usd']:>8,.2f})     ║
║   Total:     €{portfolio['total_value_usd']:>10,.2f}                               ║
╚══════════════════════════════════════════════════════════════╝
"""
    return snapshot


def format_rsi_emoji(rsi: float) -> str:
    """Get emoji for RSI level"""
    if rsi < 30:
        return "🟢"  # Oversold (opportunity)
    elif rsi > 70:
        return "🔴"  # Overbought (caution)
    else:
        return "🟡"  # Neutral


def format_change_emoji(change_pct: float) -> str:
    """Get emoji for price change"""
    if change_pct > 5:
        return "🚀"  # Strong up
    elif change_pct > 0:
        return "📈"  # Up
    elif change_pct > -5:
        return "📉"  # Down
    else:
        return "💥"  # Strong down


# ============================================================================
# VALIDATION HELPERS
# ============================================================================

def validate_deployment_amounts(
    btc_amount: float,
    ada_amount: float,
    max_deploy: float,
    eur_balance: float
) -> tuple[bool, str]:
    """
    Validate deployment amounts against safety constraints.

    Args:
        btc_amount: EUR for BTC
        ada_amount: EUR for ADA
        max_deploy: Maximum allowed deployment
        eur_balance: Available EUR

    Returns:
        Tuple of (is_valid, error_message)
    """
    total = btc_amount + ada_amount

    # Check: Total within max deploy cap
    if total > max_deploy:
        return False, f"Total €{total:.2f} exceeds max deploy €{max_deploy:.2f}"

    # Check: Total within available balance
    if total > eur_balance:
        return False, f"Total €{total:.2f} exceeds balance €{eur_balance:.2f}"

    # Check: Individual orders meet minimum
    if btc_amount > 0 and btc_amount < config.MIN_ORDER_SIZE:
        return False, f"BTC amount €{btc_amount:.2f} below minimum €{config.MIN_ORDER_SIZE}"

    if ada_amount > 0 and ada_amount < config.MIN_ORDER_SIZE:
        return False, f"ADA amount €{ada_amount:.2f} below minimum €{config.MIN_ORDER_SIZE}"

    # Check: At least one order if not hold
    if total > 0 and btc_amount == 0 and ada_amount == 0:
        return False, "Must allocate to at least one asset if not holding"

    return True, "Validation passed"


# ============================================================================
# TIMESTAMP HELPERS
# ============================================================================

def get_iso_timestamp() -> str:
    """Get current timestamp in ISO format"""
    return datetime.now().isoformat()


def format_timestamp(iso_timestamp: str) -> str:
    """Format ISO timestamp for display"""
    dt = datetime.fromisoformat(iso_timestamp)
    return dt.strftime("%Y-%m-%d %H:%M:%S")


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("Testing DCA Simple Utilities\n")

    # Test Fear & Greed
    print("1. Fear & Greed Index:")
    try:
        fg = get_fear_greed_index()
        label = get_fear_greed_label(fg)
        print(f"   Value: {fg} ({label})")
    except Exception as e:
        print(f"   Error: {e}")

    # Test validation
    print("\n2. Validation Tests:")
    tests = [
        (100, 50, 200, 300, True),   # Valid
        (100, 50, 100, 300, False),  # Exceeds max_deploy
        (5, 50, 200, 300, False),    # BTC below minimum
        (100, 5, 200, 300, False),   # ADA below minimum
        (200, 200, 200, 300, False), # Exceeds balance
    ]

    for btc, ada, max_dep, bal, expected in tests:
        valid, msg = validate_deployment_amounts(btc, ada, max_dep, bal)
        status = "✅" if valid == expected else "❌"
        print(f"   {status} BTC=${btc}, ADA=${ada}, max=${max_dep}, bal=${bal}")
        print(f"      {msg}")

    # Test logging
    print("\n3. Logging Test:")
    log_info("Test info message")
    log_success("Test success message")
    log_warning("Test warning message")

    print("\n✅ Utilities test complete")
