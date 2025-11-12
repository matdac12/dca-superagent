# DCA Simple - Autonomous Bitcoin & Cardano Accumulation

Smart DCA system that uses AI to make intelligent allocation decisions based on market conditions.

## Features

- 🤖 AI-powered decision making (OpenAI Responses API)
- 💰 Conservative tier-based deployment strategy
- 📊 Technical analysis (RSI, Bollinger Bands)
- 😱 Fear & Greed Index integration
- 🔔 Telegram notifications
- 📝 Complete execution logging
- 🧪 Dry run mode for testing
- 🛡️ Smart balance management

## Deployment Strategy

The system deploys **less percentage** as your balance grows (conservative approach):

- **€10-20**: 95% deployment (uses almost all with small fee cushion)
- **€20-50**: 50% deployment
- **€50-100**: 35% deployment
- **€100-500**: 25% deployment
- **€500+**: 20% deployment

For balances €10-20, it automatically skips if the deployable amount is below €10 (minimum order size).

## Setup

### 1. Clone and Navigate
```bash
cd /path/to/dca-simple
```

### 2. Create Virtual Environment
```bash
python3.12 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment
Create a `.env` file:
```bash
# Binance API (Production)
BINANCE_API_KEY=your_api_key_here
BINANCE_API_SECRET=your_secret_key_here
BINANCE_TESTNET=false

# OpenAI API
OPENAI_API_KEY=your_openai_key_here

# Telegram Notifications (Optional)
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# Execution Mode
DRY_RUN=true  # Set to false for live trading
```

### 5. Test Configuration
```bash
python config.py
```

### 6. Run DCA Session
```bash
python dca_simple.py
```

## Cron Job Setup

Run daily at 9 AM:
```bash
crontab -e
```

Add:
```
0 9 * * * cd /path/to/dca-simple && source venv/bin/activate && python dca_simple.py
```

## File Structure

```
dca-simple/
├── dca_simple.py           # Main orchestrator
├── config.py               # Configuration & tiers
├── decision_agent.py       # AI decision logic
├── market_orders.py        # Order execution
├── binance_integration.py  # EUR market data
├── requirements.txt        # Dependencies
├── .env                    # API keys (create this!)
└── logs/                   # Execution history
```

## Important Notes

⚠️ **This system uses real money in production mode**
- Always test with `DRY_RUN=true` first
- Start with small amounts
- Monitor logs regularly
- Ensure Binance API permissions are correct
