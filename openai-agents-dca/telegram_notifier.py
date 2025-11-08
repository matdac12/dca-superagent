"""
Telegram Notifier

Sends formatted notifications to Telegram when DCA decisions are made.
"""
import os
import requests
from typing import Dict, Optional
from loguru import logger


class TelegramNotifier:
    """Send notifications via Telegram"""

    def __init__(self):
        """Initialize Telegram notifier with bot token and chat ID from env"""
        self.bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
        self.chat_id = os.getenv('TELEGRAM_CHAT_ID')

        if not self.bot_token or not self.chat_id:
            logger.warning("Telegram credentials not found in .env - notifications disabled")
            self.enabled = False
        else:
            self.enabled = True
            logger.info("Telegram notifier initialized")

    def send_message(self, message: str) -> bool:
        """
        Send a message to Telegram

        Args:
            message: Text message to send

        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            return False

        try:
            url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
            payload = {
                'chat_id': self.chat_id,
                'text': message,
                'parse_mode': 'Markdown'
            }

            response = requests.post(url, json=payload, timeout=10)

            if response.status_code == 200:
                logger.debug("Telegram notification sent successfully")
                return True
            else:
                logger.error(f"Telegram API error: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            logger.error(f"Failed to send Telegram notification: {e}")
            return False

    def send_execution_report(self, report: Dict) -> bool:
        """
        Send a formatted execution report to Telegram

        Args:
            report: Execution report dictionary from AutonomousDCASystem

        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            return False

        try:
            # Build formatted message
            success_emoji = "✅" if report.get('success', False) else "❌"
            mode = "🧪 TESTNET" if report['testnet'] else "⚠️ PRODUCTION"
            dry_run = " (DRY RUN)" if report.get('dry_run', False) else ""

            message = f"""
🤖 *DCA Agent Decision Complete* {success_emoji}

*Mode:* {mode}{dry_run}
*Duration:* {report['duration_seconds']:.1f}s
*Timestamp:* {report['timestamp']}

━━━━━━━━━━━━━━━━━━━━
📊 *MARKET CONDITIONS*
━━━━━━━━━━━━━━━━━━━━

*Portfolio:* ${report['market_data']['portfolio']['total_value_usd']:,.2f}
• USDT: ${report['market_data']['portfolio']['usdt']['total']:,.2f}
• BTC: {report['market_data']['portfolio']['btc']['total']:.8f} (${report['market_data']['portfolio']['btc']['value_usd']:,.2f})
• ADA: {report['market_data']['portfolio']['ada']['total']:,.2f} (${report['market_data']['portfolio']['ada']['value_usd']:,.2f})

*BTC:* ${report['market_data']['btc']['price']:,.2f}
• RSI: {report['market_data']['btc']['indicators']['rsi']:.1f} ({report['market_data']['btc']['indicators']['rsi_signal']})
• 24h: {report['market_data']['btc']['change_24h']:+.2f}%

*ADA:* ${report['market_data']['ada']['price']:.4f}
• RSI: {report['market_data']['ada']['indicators']['rsi']:.1f} ({report['market_data']['ada']['indicators']['rsi_signal']})
• 24h: {report['market_data']['ada']['change_24h']:+.2f}%
"""

            # Add decision details
            decision = report['decision']
            message += f"""
━━━━━━━━━━━━━━━━━━━━
⚖️ *DECISION*
━━━━━━━━━━━━━━━━━━━━

*Strategy:* {decision['strategy_name']}
*Conviction:* {decision['conviction']}/10

*Reasoning:*
{decision['reasoning'][:300]}{'...' if len(decision['reasoning']) > 300 else ''}
"""

            # Add actions
            actions = report['actions']
            if actions:
                message += f"\n━━━━━━━━━━━━━━━━━━━━\n📋 *ACTIONS* ({len(actions)})\n━━━━━━━━━━━━━━━━━━━━\n"
                for i, action in enumerate(actions, 1):
                    message += f"\n{i}. {action['type']} {action['asset']}\n"
                    message += f"   • Price: ${action['price']:,.4f}\n"
                    message += f"   • Amount: ${action['amount_usd']:,.2f}\n"
            else:
                message += "\n📋 *ACTIONS:* HOLD (no trades)\n"

            # Add execution results if not dry run
            if not report.get('dry_run', False):
                execution = report['execution']
                message += f"""
━━━━━━━━━━━━━━━━━━━━
🚀 *EXECUTION*
━━━━━━━━━━━━━━━━━━━━

*Executed:* {execution['executed']} ✅
*Failed:* {execution['failed']} ❌
"""
                if execution['results']:
                    for result in execution['results']:
                        action = result['action']
                        status = "✅" if result['success'] else "❌"
                        message += f"\n{status} {action['type']} {action['asset']}"
                        if result['success']:
                            message += f" - Order #{result['order']['orderId']}"
                        else:
                            message += f" - {result['error'][:50]}"

            # Add verification status
            verification = report['verification']
            message += f"""
━━━━━━━━━━━━━━━━━━━━
🔍 *VERIFICATION*
━━━━━━━━━━━━━━━━━━━━

*Status:* {verification['status']}
"""
            if verification['issues']:
                message += f"*Issues:* {len(verification['issues'])}\n"
                for issue in verification['issues'][:3]:
                    message += f"• {issue}\n"

            if verification['recommendations']:
                message += f"\n*Recommendations:*\n"
                for rec in verification['recommendations'][:3]:
                    message += f"• {rec}\n"

            # Add footer
            message += "\n━━━━━━━━━━━━━━━━━━━━"

            return self.send_message(message)

        except Exception as e:
            logger.error(f"Failed to format Telegram report: {e}")
            # Try sending a simple error notification
            try:
                error_msg = f"🤖 DCA Agent Run {'✅ Complete' if report.get('success') else '❌ Failed'}\n\nError formatting report: {str(e)}"
                return self.send_message(error_msg)
            except:
                return False


if __name__ == '__main__':
    """Test Telegram notifications"""
    from dotenv import load_dotenv
    load_dotenv()

    notifier = TelegramNotifier()

    if notifier.enabled:
        print("Testing Telegram notification...")
        test_message = "🤖 *DCA Agent Test*\n\nThis is a test notification from your DCA agent system!\n\n✅ Everything is working correctly."

        if notifier.send_message(test_message):
            print("✅ Test notification sent successfully! Check your Telegram.")
        else:
            print("❌ Failed to send test notification. Check your credentials.")
    else:
        print("❌ Telegram not configured. Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to .env file.")
