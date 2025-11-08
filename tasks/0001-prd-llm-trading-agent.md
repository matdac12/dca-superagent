# PRD: LLM-Powered Autonomous Trading Agent

## Introduction/Overview

The LLM Trading Agent is an AI-powered autonomous trading system that analyzes cryptocurrency market data and executes spot trades on Binance testnet. The agent uses Large Language Models (specifically OpenAI gpt-5-nano initially, with planned support for Claude, Grok, and Gemini) to make trading decisions based on comprehensive market analysis.

**Problem Statement:** Manual cryptocurrency trading requires constant market monitoring, technical analysis skills, and emotional discipline. Traders often miss opportunities or make impulsive decisions based on fear or greed.

**Solution:** An AI agent that analyzes market data objectively, makes data-driven trading decisions, and executes trades automatically while adhering to predefined risk parameters.

## Goals

1. Create a functional AI trading agent that can analyze BTC/USDT market data and execute profitable trades autonomously
2. Provide transparency into the agent's decision-making process through detailed reasoning logs
3. Track trading performance with clear P&L (Profit & Loss) metrics
4. Build a foundation that can be extended to multiple LLM providers and additional trading pairs
5. Maintain a safe testing environment using Binance testnet with no risk of real fund loss

## User Stories

1. **As a trader**, I want to trigger the AI agent to analyze the current market so that I can see what trading decision it would make based on recent data.

2. **As a trader**, I want the AI agent to automatically execute trades when I trigger an analysis so that I don't have to manually place orders based on its recommendations.

3. **As a trader**, I want to see the agent's reasoning for each decision so that I can understand its strategy and learn from its analysis.

4. **As a trader**, I want to track my total P&L over time so that I can measure the agent's trading performance.

5. **As a developer**, I want the system to enforce a 20% maximum position size per trade so that the agent cannot risk the entire portfolio on a single decision.

6. **As a trader**, I want to see a history of all trades executed by the agent so that I can audit its decisions and track what worked.

## Functional Requirements

### Market Data Intelligence

1. The system must fetch the last 24 hours of 1-minute candlestick (OHLCV) data for BTC/USDT from Binance testnet
2. The system must retrieve current account balances for BTC, ADA, and USDT
3. The system must fetch current 24-hour ticker statistics (price, volume, high, low, price change %)
4. The system must aggregate all market data into a structured format suitable for LLM analysis
5. The system must create an API endpoint `/api/market-intelligence` that returns consolidated market data

### LLM Integration

6. The system must integrate with OpenAI Responses API using gpt-5-nano model with Structured Outputs
7. The system must define a Zod schema for trading decisions with fields: action (enum: BUY/SELL/HOLD), asset (literal: "BTC"), quantity (positive number), reasoning (string)
8. The system must use `responses.parse()` with `response_format` parameter to guarantee schema-compliant responses
9. The system must design a system prompt that defines the agent as a cryptocurrency trader operating in a testnet environment
10. The system must include risk parameters in the prompt (max 20% portfolio per trade)
11. The system must provide clear market data context to the LLM including price trends, volume, and current holdings

### Trading Decision Execution

12. The system must validate that the trade quantity does not exceed 20% of total portfolio value (calculated in USDT equivalent) (note: LLM response structure validation is guaranteed by Structured Outputs)
13. The system must check that sufficient balance exists before executing any trade
14. For BUY orders: verify USDT balance is sufficient for the purchase
15. For SELL orders: verify BTC balance is sufficient for the sale
16. The system must execute MARKET orders only using Binance `newOrder()` API
17. The system must handle API errors gracefully and log failed order attempts
18. The system must create an API endpoint `/api/trading-agent` that orchestrates the full decision-making and execution flow

### User Interface

19. The system must add a "Run AI Analysis" button to the main dashboard
20. The system must display a loading state while the agent is analyzing and executing
21. The system must show the agent's decision (BUY/SELL/HOLD) and reasoning immediately after completion
22. The system must display the executed order details (price, quantity, order ID) if a trade was placed
23. The system must show error messages if the analysis or execution fails

### Trade History & Tracking

24. The system must log every agent decision to a persistent storage (JSON file or database)
25. Each log entry must include: timestamp, market data snapshot, LLM reasoning, action taken, price, quantity, order ID (if executed), success/failure status
26. The system must calculate and display cumulative P&L in USDT
27. The system must display a trade history table showing the last 20 decisions
28. The system must show which trades resulted in profit vs loss (when positions are closed)

### Portfolio Calculation

29. The system must calculate total portfolio value in USDT by converting all asset balances at current market prices
30. The system must enforce the 20% max position rule based on this total portfolio value
31. The system must recalculate portfolio value before each trade decision

## Non-Goals (Out of Scope)

1. **Multiple Trading Pairs**: The first version will only trade BTC/USDT (no ADA, ETH, or other pairs)
2. **Limit Orders**: Only MARKET orders will be supported initially; LIMIT orders are a future enhancement
3. **Scheduled/Automated Execution**: No automatic scheduling or continuous monitoring; decisions are triggered manually only
4. **Emergency Controls**: No stop-loss, daily loss limits, or emergency stop buttons in v1 (to be added later)
5. **Multiple LLM Providers**: Initially only OpenAI gpt-5-nano; Claude, Grok, and Gemini support will be added in future versions
6. **Advanced Technical Indicators**: No RSI, MACD, Bollinger Bands calculations; agent relies on raw OHLCV data
7. **Backtesting**: No historical simulation capabilities; testing happens in real-time on testnet
8. **User Authentication**: Single-user system; no login or multi-user support

## Design Considerations

### UI Components

- **Agent Control Panel**: A card-based section on the main page with:
  - "Run AI Analysis" button (primary CTA)
  - Status indicator (Idle/Analyzing/Executing/Error)
  - Last decision display (action, reasoning, timestamp)

- **Recent Decisions Table**: Factory.ai-style minimal table showing:
  - Timestamp
  - Action (BUY/SELL/HOLD with color coding)
  - Asset
  - Quantity
  - Price
  - Reasoning (truncated with expand option)
  - P&L impact

- **Performance Summary**: Simple metrics card showing:
  - Total P&L (USDT)
  - Win rate (% of profitable trades)
  - Total trades executed

### Styling

- Follow existing factory.ai aesthetic: clean, minimal, monospace fonts for data
- Use color coding: green for BUY/profit, red for SELL/loss, gray for HOLD
- Terminal/code-style display for LLM reasoning (monospace font, syntax highlighting)

## Technical Considerations

### API Structure

```
/api/market-intelligence
  - GET: Returns aggregated market data (klines, ticker, balances)

/api/trading-agent
  - POST: Triggers AI analysis and execution
  - Request body: { trigger: "manual" }
  - Response: { decision, reasoning, orderResult, error? }

/api/trade-history
  - GET: Returns paginated trade history
  - POST: Logs a new decision/trade
```

### Data Storage

- **Trade History**: Store in JSON file initially (`trade-history.json`)
- Structure: Array of objects with schema:
  ```json
  {
    "id": "uuid",
    "timestamp": "ISO-8601",
    "marketData": { /* snapshot */ },
    "llmReasoning": "string",
    "decision": { "action": "BUY", "asset": "BTC", "quantity": 0.001 },
    "executedOrder": { "orderId": "123", "price": 50000, "status": "FILLED" },
    "portfolioValueBefore": 1000,
    "portfolioValueAfter": 999.5
  }
  ```

### Environment Variables

```
OPENAI_API_KEY=sk-...
BINANCE_API_KEY=...
BINANCE_SECRET_KEY=...
```

### Dependencies

- `openai` - OpenAI SDK with Responses API and Structured Outputs support
- `zod@^3.24.1` - Schema validation for type-safe LLM responses (v3 required for compatibility with OpenAI helpers)
- `@binance/connector` - Already installed
- `uuid` - For generating unique trade IDs
- `dotenv` - For loading environment variables in development

### Risk Management Logic

```javascript
// Pseudo-code for 20% rule enforcement
const portfolioValueUSD = calculateTotalPortfolioValue(balances, currentPrices);
const maxTradeValueUSD = portfolioValueUSD * 0.20;

if (decision.action === "BUY") {
  const requestedValueUSD = decision.quantity * currentPrice;
  if (requestedValueUSD > maxTradeValueUSD) {
    // Reduce quantity to max allowed
    decision.quantity = maxTradeValueUSD / currentPrice;
  }
}
```

### Error Handling

- Binance API errors → Log and display to user, don't crash
- OpenAI API errors → Retry once, then fail gracefully
- Invalid LLM responses → Log raw response, show error, don't execute
- Insufficient balance → Show clear error, log attempt, don't execute

## Success Metrics

### Primary Metric
- **Total P&L (USDT)**: The cumulative profit or loss from all trades executed by the agent

### Secondary Metrics (for monitoring, not enforced in v1)
- Number of trades executed
- Win rate (when positions are closed and P&L can be calculated)
- Average trade size (% of portfolio)
- LLM decision distribution (% BUY vs SELL vs HOLD)

### Acceptance Criteria for Launch
- Agent can successfully fetch market data and analyze it with OpenAI
- Agent correctly enforces 20% position size limit
- Agent successfully executes at least one BUY and one SELL order on testnet
- Trade history is logged and displayed correctly
- P&L calculation is accurate
- No trades executed on mainnet (testnet verification works)

## Open Questions

1. **Prompt Engineering Iteration**: How many rounds of prompt refinement will be needed to get good trading decisions? Should we version the prompts?

2. **P&L Calculation Method**: Since we're only tracking BTC/USDT trades, should P&L be:
   - Realized only (when BTC is sold back to USDT)?
   - Unrealized included (mark-to-market current BTC holdings)?
   - **Decision**: Start with unrealized P&L (portfolio value change over time)

3. **Data Retention**: How long should we keep trade history? Should there be a purge/archive mechanism?
   - **Decision**: Keep all history for testnet; implement pagination for display

4. **Rate Limiting**: Should we prevent users from spamming the "Run Analysis" button?
   - **Decision**: Add simple debouncing (3-second minimum between requests)

5. **Future LLM Provider Integration**: Should the system be architected from day one to support multiple providers, or refactor later?
   - **Decision**: Keep OpenAI-specific for v1, abstract in v2 when adding Claude/Grok/Gemini

## Implementation Notes

### Phase 1: Market Intelligence API (Milestone 1)
- Create `/api/market-intelligence` endpoint
- Fetch and format klines, ticker, balances
- Test data quality and format

### Phase 2: OpenAI Integration (Milestone 2)
- Install OpenAI SDK
- Design trading prompt
- Test LLM responses for consistency
- Build JSON parsing and validation

### Phase 3: Order Execution (Milestone 3)
- Implement 20% position size validation
- Add balance checking logic
- Integrate Binance `newOrder()` for MARKET trades
- Handle errors and edge cases

### Phase 4: UI & Trade Tracking (Milestone 4)
- Add "Run Analysis" button and status display
- Create trade history table
- Implement P&L calculation
- Build decision display panel

### Phase 5: Testing & Refinement (Milestone 5)
- Execute multiple test trades
- Refine prompt based on results
- Verify P&L accuracy
- Polish UI and error messages

---

**Document Version**: 1.0
**Last Updated**: 2025-10-12
**Author**: AI Assistant (based on user requirements)
**Target Completion**: TBD (iterative development)
