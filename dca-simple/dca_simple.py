"""
DCA Simple - Main Orchestrator

Single-agent DCA system for smart BTC/ADA accumulation.
Runs daily (via cron) or on-demand for irregular USDT deposits.
"""
import sys
from pathlib import Path
from datetime import datetime

# Load our local .env file FIRST (before any other imports)
from dotenv import load_dotenv
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path, override=True)  # override=True ensures our .env takes precedence

# Import our local config FIRST (before adding other paths to sys.path)
import config

# Ensure local directory is checked first for imports (for our EUR-modified binance_integration)
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Add parent directory to path for imports from existing system
parent_dir = Path(__file__).parent.parent
openai_agents_dir = parent_dir / "openai-agents-dca"
sys.path.insert(1, str(openai_agents_dir))  # Insert at position 1, after current dir

# Import local binance_integration (EUR support), but other modules from parent
from binance_integration import BinanceMarketData  # Local EUR version
from safety_validator import SafetyValidator  # From parent
from telegram_notifier import TelegramNotifier  # From parent
from schemas import SimpleDCADecision, DCASession, SessionType, ExecutionResult
from decision_agent import get_decision
from market_orders import SimpleMarketExecutor
from utils import (
    get_fear_greed_index,
    get_fear_greed_label,
    save_execution_log,
    log_info,
    log_success,
    log_warning,
    log_error,
    validate_deployment_amounts,
    get_iso_timestamp,
    format_market_snapshot
)


# ============================================================================
# MAIN DCA EXECUTION FLOW
# ============================================================================

async def run_dca_session() -> DCASession:
    """
    Execute a complete DCA session.

    Steps:
    1. Check USDT balance and calculate deployment cap
    2. Gather market intelligence (prices, RSI, Fear & Greed)
    3. Get AI decision (allocations, reasoning, confidence)
    4. Validate and execute market orders
    5. Send Telegram notification
    6. Save execution log

    Returns:
        DCASession object with complete execution record
    """
    print("\n" + "="*60)
    print("DCA SIMPLE - AUTONOMOUS ACCUMULATION SESSION")
    print("="*60)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Mode: {'🧪 DRY RUN' if config.DRY_RUN else '💰 LIVE TRADING'}")
    print("="*60 + "\n")

    timestamp = get_iso_timestamp()

    try:
        # ====================================================================
        # STEP 1: CHECK BALANCE AND CALCULATE DEPLOYMENT CAP
        # ====================================================================
        log_info("Step 1/6: Checking EUR balance...")

        binance_data = BinanceMarketData(testnet=config.BINANCE_TESTNET)
        portfolio = binance_data.get_portfolio_balances()

        eur_balance = portfolio['EUR']['free']
        max_deploy = config.calculate_deployment_amount(eur_balance)
        deployment_pct = config.get_deployment_percentage(eur_balance)

        print(f"   EUR Balance: €{eur_balance:.2f}")
        print(f"   Deployment Cap: €{max_deploy:.2f} ({deployment_pct*100:.0f}%)")

        # Check if balance is too low
        if eur_balance < config.MIN_EUR_THRESHOLD:
            log_warning(f"Balance €{eur_balance:.2f} < minimum €{config.MIN_EUR_THRESHOLD}")
            print("   ⏭️  Skipping session - insufficient balance\n")

            # Create SKIP session
            session = DCASession(
                timestamp=timestamp,
                session_type=SessionType.SKIP,
                eur_balance=eur_balance,
                max_deploy=0.0,
                deployment_percentage=0.0,
                btc_price=0.0,
                ada_price=0.0,
                btc_rsi=0.0,
                ada_rsi=0.0,
                fear_greed=50,
                decision=SimpleDCADecision(
                    btc_amount=0.0,
                    ada_amount=0.0,
                    reasoning=f"Balance €{eur_balance:.2f} below minimum €{config.MIN_EUR_THRESHOLD}",
                    confidence=5
                ),
                remaining_balance=eur_balance
            )

            send_notification(session)
            save_execution_log(session)
            return session

        # Check if deployable amount is too low for €10-20 tier (BEFORE calling AI)
        # Only check this for small balances to avoid wasting AI calls
        if eur_balance < 20 and max_deploy < config.MIN_ORDER_SIZE:
            log_warning(f"Deployable amount €{max_deploy:.2f} < minimum order size €{config.MIN_ORDER_SIZE}")
            print(f"   ⏭️  Skipping session - deployable amount too small for orders\n")

            # Create SKIP session
            session = DCASession(
                timestamp=timestamp,
                session_type=SessionType.SKIP,
                eur_balance=eur_balance,
                max_deploy=max_deploy,
                deployment_percentage=deployment_pct,
                btc_price=0.0,
                ada_price=0.0,
                btc_rsi=0.0,
                ada_rsi=0.0,
                fear_greed=50,
                decision=SimpleDCADecision(
                    btc_amount=0.0,
                    ada_amount=0.0,
                    reasoning=f"Deployable amount €{max_deploy:.2f} below minimum order size €{config.MIN_ORDER_SIZE}",
                    confidence=5
                ),
                remaining_balance=eur_balance
            )

            send_notification(session)
            save_execution_log(session)
            return session

        # ====================================================================
        # STEP 2: GATHER MARKET INTELLIGENCE
        # ====================================================================
        log_info("Step 2/6: Gathering market intelligence...")

        intelligence = binance_data.get_complete_market_intelligence()

        btc = intelligence['btc']
        ada = intelligence['ada']

        print(format_market_snapshot(intelligence))

        # Get Fear & Greed
        fear_greed = get_fear_greed_index()
        fg_label = get_fear_greed_label(fear_greed)
        print(f"   Fear & Greed: {fear_greed}/100 ({fg_label})\n")

        # ====================================================================
        # STEP 3: GET AI DECISION
        # ====================================================================
        log_info("Step 3/6: Requesting AI decision...")

        decision = await get_decision(intelligence, max_deploy)

        print(f"\n   📋 DECISION:")
        print(f"      {decision}")
        print()

        # ====================================================================
        # STEP 4: VALIDATE DEPLOYMENT AMOUNTS
        # ====================================================================
        log_info("Step 4/6: Validating deployment amounts...")

        is_valid, validation_msg = validate_deployment_amounts(
            btc_amount=decision.btc_amount,
            ada_amount=decision.ada_amount,
            max_deploy=max_deploy,
            eur_balance=eur_balance
        )

        if not is_valid:
            log_error(f"Validation failed: {validation_msg}")
            raise ValueError(f"Invalid deployment amounts: {validation_msg}")

        log_success(validation_msg)

        # Check if this is a HOLD decision
        if decision.is_hold:
            log_info("Decision: HOLD - No orders to execute\n")

            session = DCASession(
                timestamp=timestamp,
                session_type=SessionType.HOLD,
                eur_balance=eur_balance,
                max_deploy=max_deploy,
                deployment_percentage=deployment_pct,
                btc_price=btc['price'],
                ada_price=ada['price'],
                btc_rsi=btc['indicators']['rsi'],
                ada_rsi=ada['indicators']['rsi'],
                fear_greed=fear_greed,
                decision=decision,
                remaining_balance=eur_balance
            )

            send_notification(session)
            save_execution_log(session)
            return session

        # ====================================================================
        # STEP 5: EXECUTE MARKET ORDERS
        # ====================================================================
        log_info("Step 5/6: Executing market orders...")

        executor = SimpleMarketExecutor()
        results: list[ExecutionResult] = []

        # Execute BTC order
        if decision.btc_amount >= config.MIN_ORDER_SIZE:
            btc_result = executor.execute_market_buy("BTCEUR", decision.btc_amount)
            results.append(btc_result)

        # Execute ADA order
        if decision.ada_amount >= config.MIN_ORDER_SIZE:
            ada_result = executor.execute_market_buy("ADAEUR", decision.ada_amount)
            results.append(ada_result)

        # Calculate totals
        total_deployed = sum(r.usd_amount for r in results if r.success and r.usd_amount)
        total_fees = sum(r.fee for r in results if r.success and r.fee)
        remaining_balance = eur_balance - total_deployed - total_fees

        print(f"\n   💰 EXECUTION SUMMARY:")
        print(f"      Total Deployed: €{total_deployed:.2f}")
        print(f"      Total Fees: €{total_fees:.4f}")
        print(f"      Remaining Balance: €{remaining_balance:.2f}")
        print()

        # Create BUY session
        session = DCASession(
            timestamp=timestamp,
            session_type=SessionType.BUY,
            eur_balance=eur_balance,
            max_deploy=max_deploy,
            deployment_percentage=deployment_pct,
            btc_price=btc['price'],
            ada_price=ada['price'],
            btc_rsi=btc['indicators']['rsi'],
            ada_rsi=ada['indicators']['rsi'],
            fear_greed=fear_greed,
            decision=decision,
            execution_results=results,
            total_deployed=total_deployed,
            total_fees=total_fees,
            remaining_balance=remaining_balance
        )

        # ====================================================================
        # STEP 6: SEND NOTIFICATION AND SAVE LOG
        # ====================================================================
        log_info("Step 6/6: Sending notification and saving log...")

        send_notification(session)
        save_execution_log(session)

        if session.was_successful:
            log_success("DCA session completed successfully! 🎉\n")
        else:
            log_warning("DCA session completed with errors ⚠️\n")

        return session

    except Exception as e:
        log_error(f"DCA session failed: {e}")
        print(f"\n❌ Fatal error: {e}\n")
        raise


# ============================================================================
# TELEGRAM NOTIFICATIONS
# ============================================================================

def send_notification(session: DCASession):
    """
    Send Telegram notification for session result.

    Args:
        session: DCASession to notify about
    """
    try:
        notifier = TelegramNotifier()

        # Format timestamp
        dt = datetime.fromisoformat(session.timestamp)
        timestamp_str = dt.strftime("%Y-%m-%d %H:%M:%S")

        # Build message based on session type
        if session.session_type == SessionType.SKIP:
            message = f"""
🚫 **DCA SESSION - SKIPPED**

**Time**: {timestamp_str}
**Balance**: €{session.eur_balance:.2f} EUR
**Reason**: Balance below minimum threshold (€{config.MIN_EUR_THRESHOLD})

✋ Waiting for more EUR deposit...
"""

        elif session.session_type == SessionType.HOLD:
            fg_label = get_fear_greed_label(session.fear_greed)

            message = f"""
✋ **DCA SESSION - HOLD**

**Time**: {timestamp_str}
**Balance**: €{session.eur_balance:.2f} EUR
**Max Deploy**: €{session.max_deploy:.2f} ({session.deployment_percentage*100:.0f}%)

📊 **Market Snapshot**:
BTC: €{session.btc_price:,.2f} (RSI: {session.btc_rsi:.1f})
ADA: €{session.ada_price:.4f} (RSI: {session.ada_rsi:.1f})
Fear & Greed: {session.fear_greed}/100 ({fg_label})

🤖 **AI Decision**: HOLD
**Reasoning**: {session.decision.reasoning}
**Confidence**: {session.decision.confidence}/5

💡 Waiting for better market conditions...
"""

        else:  # BUY
            fg_label = get_fear_greed_label(session.fear_greed)

            # Build order details
            order_details = []
            for result in session.execution_results:
                if result.success:
                    symbol = "BTC" if "BTC" in result.asset else "ADA"
                    order_details.append(
                        f"   • {symbol}: €{result.usd_amount:.2f} @ €{result.executed_price:.8f}"
                    )
                else:
                    symbol = "BTC" if "BTC" in result.asset else "ADA"
                    order_details.append(f"   • {symbol}: ❌ {result.error}")

            orders_str = "\n".join(order_details)

            message = f"""
{"✅" if session.was_successful else "⚠️"} **DCA SESSION - BUY**

**Time**: {timestamp_str}
**Balance**: €{session.eur_balance:.2f} EUR
**Deployed**: €{session.total_deployed:.2f} ({session.deployment_percentage*100:.0f}%)

📊 **Market Snapshot**:
BTC: €{session.btc_price:,.2f} (RSI: {session.btc_rsi:.1f})
ADA: €{session.ada_price:.4f} (RSI: {session.ada_rsi:.1f})
Fear & Greed: {session.fear_greed}/100 ({fg_label})

🤖 **AI Decision**:
**Reasoning**: {session.decision.reasoning}
**Confidence**: {session.decision.confidence}/5

📦 **Orders Executed**:
{orders_str}

💰 **Summary**:
Total Deployed: €{session.total_deployed:.2f}
Total Fees: €{session.total_fees:.4f}
Remaining: €{session.remaining_balance:.2f} EUR

{"✅ All orders successful!" if session.was_successful else "⚠️ Some orders failed - check logs"}
"""

        # Send notification
        notifier.send_message(message)
        print("   ✅ Telegram notification sent\n")

    except Exception as e:
        print(f"   ⚠️  Failed to send Telegram notification: {e}\n")
        # Don't raise - notification failure shouldn't stop execution


# ============================================================================
# CLI ENTRY POINT
# ============================================================================

async def main():
    """Main entry point for CLI execution"""
    try:
        # Validate configuration
        config.validate_config()

        # Display configuration
        if config.DRY_RUN:
            config.print_config()

        # Run DCA session
        session = await run_dca_session()

        # Exit with appropriate code
        sys.exit(0 if session.was_successful else 1)

    except KeyboardInterrupt:
        print("\n\n⚠️  Session interrupted by user\n")
        sys.exit(130)

    except Exception as e:
        print(f"\n❌ Fatal error: {e}\n")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
