# DCA Simple - Streamlined Dollar-Cost Averaging System

A simplified, reliable DCA system for long-term Bitcoin and Cardano accumulation.

## Overview

This system provides a streamlined approach to DCA investing with:
- ✅ Single AI agent (vs 7-stage pipeline)
- ✅ Market orders (reliable execution)
- ✅ Smart deployment percentages (20-50% based on balance)
- ✅ Daily execution (< 10 seconds)
- ✅ Triple safety validation
- ✅ Beautiful Telegram notifications

## Key Differences from 7-Stage System

| Feature | 7-Stage System | DCA Simple |
|---------|----------------|------------|
| Agents | 7 specialists | 1 decision agent |
| Research | Web search | Market data only |
| Orders | Limit orders | Market orders |
| Time | 60-120s | < 10s |
| Cost | $0.10-0.20/run | < $0.01/run |
| Use Case | Active trading | Long-term DCA |

## How It Works

### Daily Execution Flow

1. **Check Balance**: Query Binance USDT balance
2. **Calculate Cap**: Deploy 20-50% based on balance
3. **Gather Data**: Fetch BTC/ADA prices, RSI, Fear & Greed
4. **AI Decision**: Single agent decides allocation
5. **Validate**: Triple safety checks
6. **Execute**: Market orders if conditions favorable
7. **Notify**: Telegram notification with details

### Deployment Logic

```
Balance < $10:     Skip (insufficient funds)
Balance $10-100:   Deploy up to 50%
Balance $100-500:  Deploy up to 35%
Balance $500+:     Deploy up to 20%
```

Always leaves $5 cushion for fees.

## Configuration

### Environment Variables

Required in `.env`:
```bash
# Binance API (testnet or production)
BINANCE_API_KEY=your_key_here
BINANCE_SECRET_KEY=your_secret_here

# Telegram Notifications
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# OpenAI API
OPENAI_API_KEY=your_openai_key

# Optional
DRY_RUN=false  # Set to true for testing without real orders
```

### Configuration Files

- `config.py`: All constants and deployment logic
- Adjust `MIN_USDT_THRESHOLD`, deployment percentages, etc.

## Usage

### Manual Run
```bash
cd dca-simple
python dca_simple.py
```

### Automated (Cron)
```bash
# Run daily at 10:00 AM
0 10 * * * cd /path/to/dca-simple && python dca_simple.py
```

### Dry Run Mode
```bash
DRY_RUN=true python dca_simple.py
```

## Safety Features

### Triple Protection Layer

1. **Hard-Coded Constraints** (before AI)
   - Minimum balance threshold ($10)
   - Maximum deployment percentage
   - Minimum order size ($10)

2. **AI Decision Bounds** (in prompt)
   - Max deploy amount specified
   - Guidelines for RSI/sentiment
   - Can choose HOLD if conditions poor

3. **Safety Validator** (after AI)
   - Order count limits
   - Exposure caps (50% max)
   - Price sanity checks
   - Balance verification

## Telegram Notifications

### Skip Notification
```
💤 DCA Simple - Jan 15, 10:00 AM
Status: SKIPPED
Reason: Balance too low ($8.45 < $10 minimum)
```

### Hold Notification
```
✋ DCA Simple - Jan 15, 10:00 AM
Decision: HOLD
Reason: Both assets overbought (RSI>70)
Market: BTC $103k (+12%), ADA $0.98 (+9%)
Available: $523 USDT
```

### Buy Notification
```
✅ DCA Simple - Jan 15, 10:00 AM
Decision: BUY
Deployed: $150 / $183 available

Orders Executed:
🟢 BTC: $100 @ $96,234 (0.00104 BTC)
🟢 ADA: $50 @ $0.876 (57.08 ADA)

Reasoning: Both oversold (RSI~30), extreme fear (F&G=18)
Remaining: $373 USDT
```

## Logging

### Console Output
- Rich-formatted CLI output
- Color-coded status messages
- Progress indicators

### File Logging
- **Daily logs**: `logs/daily/YYYY-MM-DD.log`
- **Execution history**: `logs/executions/YYYY-MM-DD_HH-MM-SS.json`

### JSON Execution Format
```json
{
  "timestamp": "2025-01-15T10:00:00Z",
  "usdt_balance": 523.45,
  "max_deploy": 183.21,
  "decision": {
    "btc_amount": 100.00,
    "ada_amount": 50.00,
    "reasoning": "..."
  },
  "execution": {
    "btc_order": {...},
    "ada_order": {...}
  },
  "market_data": {...}
}
```

## Troubleshooting

### No orders executing
- Check USDT balance >= $10
- Verify DRY_RUN=false
- Check Binance API keys are correct
- Review AI decision reasoning in logs

### Binance API errors
- Verify API keys have trading permissions
- Check IP whitelist if enabled
- Ensure testnet keys for testnet URL
- Review minimum order sizes ($10 USD)

### Telegram not working
- Verify TELEGRAM_BOT_TOKEN is correct
- Check TELEGRAM_CHAT_ID is your chat
- Test with @BotFather first
- Review logs for error messages

## File Structure

```
dca-simple/
├── dca_simple.py          # Main orchestrator
├── config.py              # Configuration
├── decision_agent.py      # AI agent (Responses API)
├── schemas.py             # Data models
├── market_orders.py       # Market order execution
├── utils.py               # Helper functions
├── .env                   # Environment variables
├── logs/                  # Execution logs
│   ├── daily/            # Daily logs
│   └── executions/       # JSON history
└── README.md             # This file
```

## Dependencies

Reuses infrastructure from parent `openai-agents-dca/` project:
- `BinanceMarketData` - Market data fetching
- `BinanceExecutor` - Order execution
- `TelegramNotifier` - Notifications
- `SafetyValidator` - Safety checks

## Development

### Adding New Features

1. Modify `config.py` for new constants
2. Update `decision_agent.py` for AI behavior
3. Extend `market_orders.py` for new order types
4. Test in DRY_RUN mode first

### Testing Checklist

- [ ] Skip scenario (low balance)
- [ ] Hold scenario (poor conditions)
- [ ] Buy scenario (good conditions)
- [ ] Error handling (API failures)
- [ ] Telegram notifications
- [ ] Log file creation
- [ ] Safety validator edge cases

## License

Personal use only.

## Support

For issues or questions, review logs in `logs/daily/` and `logs/executions/`.
