# DCA Simple - AI-Powered Bitcoin & Cardano Accumulation

Autonomous DCA bot that uses AI to make smart allocation decisions based on market conditions (RSI, Fear & Greed, Bollinger Bands).

## Quick Start

### 1. Clone & Setup
```bash
git clone https://github.com/matdac12/dca-superagent
cd dca-superagent/dca-simple
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Get API Keys

**Binance API** ([binance.com/en/my/settings/api-management](https://www.binance.com/en/my/settings/api-management)):
- Create API key with **Spot Trading** enabled
- ⚠️ **IMPORTANT**: Set IP restriction to **"Unrestricted"** or add your server IP
- Save API Key and Secret Key

**OpenAI API** ([platform.openai.com/api-keys](https://platform.openai.com/api-keys)):
- Create new secret key
- Copy and save it

**Telegram Bot** (optional):
1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow instructions
3. Copy your bot token
4. Start a chat with your bot (send any message)
5. Get your chat ID: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
6. Look for `"chat":{"id":123456789}` in the response

### 3. Configure Environment

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` with your keys:
```bash
# Binance API (MUST have unrestricted IP or your server IP whitelisted)
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_SECRET_KEY=your_binance_secret_key_here
BINANCE_TESTNET=false

# OpenAI API
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Telegram Notifications (your bot will message YOUR chat)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789

# Start with dry run to test
DRY_RUN=true
```

### 4. Test Run
```bash
python dca_simple.py
```

Expected output: Balance check → Market analysis → AI decision → Dry run execution

### 5. Enable Live Trading
Once comfortable, edit `.env`:
```bash
DRY_RUN=false
```

---

## Automated Daily Runs

### Local Machine (cron)
```bash
crontab -e
```
Add (runs daily at 9 AM):
```
0 9 * * * cd ~/dca-superagent/dca-simple && source venv/bin/activate && python dca_simple.py
```

### PythonAnywhere (Scheduled Tasks)
1. Go to **Tasks** tab
2. Add scheduled task:
   - **Time**: `09:00` (UTC)
   - **Command**: `cd ~/dca-superagent/dca-simple && source venv/bin/activate && python dca_simple.py`

---

## How It Works

**Conservative Deployment Strategy** (deploys less % as balance grows):
- €10-20: 95% deployment
- €20-50: 50% deployment
- €50-100: 35% deployment
- €100-500: 25% deployment
- €500+: 20% deployment

**Each Run:**
1. Checks EUR balance (skips if < €10)
2. Fetches BTC/ADA prices, RSI, Fear & Greed index
3. AI decides allocation (BTC/ADA split or HOLD)
4. Executes market orders (or simulates if dry run)
5. Sends Telegram notification with results
6. Logs execution to `logs/executions/`

---

## Safety Features

✅ Skips if balance too low
✅ AI validates before execution
✅ Exact EUR spending (no overspend)
✅ Dry run mode for testing
✅ Full audit trail in logs

⚠️ **Uses real money when `DRY_RUN=false`** - test thoroughly first!
