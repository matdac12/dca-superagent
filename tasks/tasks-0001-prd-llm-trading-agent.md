# Task List: LLM-Powered Autonomous Trading Agent

Based on PRD: `0001-prd-llm-trading-agent.md`

## Relevant Files

- `trade-wars/src/app/api/market-intelligence/route.ts` - New API endpoint that aggregates klines, ticker data, and balances for LLM consumption
- `trade-wars/src/app/api/trading-agent/route.ts` - Main trading agent endpoint that orchestrates LLM decision-making and order execution
- `trade-wars/src/app/api/trade-history/route.ts` - API for logging and retrieving trade history
- `trade-wars/src/lib/openai/tradingAgent.ts` - OpenAI integration logic, prompt engineering, and response parsing
- `trade-wars/src/lib/binance/orderExecution.ts` - Order placement logic with risk validation
- `trade-wars/src/lib/binance/marketData.ts` - Utility functions for fetching and formatting Binance market data
- `trade-wars/src/lib/utils/portfolioCalculator.ts` - Portfolio value calculation and 20% position size enforcement
- `trade-wars/src/lib/storage/tradeHistory.ts` - JSON file storage operations for trade history
- `trade-wars/src/app/components/TradingAgent.tsx` - Main UI component with "Run Analysis" button and status display
- `trade-wars/src/app/components/TradeHistory.tsx` - Trade history table component
- `trade-wars/src/app/components/PerformanceMetrics.tsx` - P&L and performance summary component
- `trade-wars/src/types/trading.ts` - Zod schemas and TypeScript interfaces for trading decisions, market data, and trade records
- `trade-wars/.env.local` - Environment variables (add OPENAI_API_KEY)
- `trade-wars/data/trade-history.json` - JSON file for persisting trade history

### Notes

- **✅ OpenAI Responses API Tested**: Successfully tested `responses.parse()` with `zodTextFormat()` and Structured Outputs. Test file: `test-openai.ts` demonstrates working integration with Binance market data and gpt-5-nano model.
- **Important**: Must use Zod v3.x (not v4) for compatibility with OpenAI's `zodTextFormat` helper which relies on `zod-to-json-schema`.
- This project does not currently have a test setup. Tests will be added in a future iteration.
- All new TypeScript files should follow the existing patterns in `/api/market/route.ts` and components like `MarketData.tsx`
- Use the same Binance client initialization pattern as seen in existing API routes

## Tasks

- [x] 1.0 Set up Market Intelligence API
  - [x] 1.1 Create `/api/market-intelligence/route.ts` endpoint
  - [x] 1.2 Implement klines fetching function in `lib/binance/marketData.ts` (last 24 hours of 1-min candles for BTC/USDT)
  - [x] 1.3 Extend existing account balance logic to format data for LLM consumption
  - [x] 1.4 Aggregate klines, current ticker, and balances into a single structured response
  - [x] 1.5 Test endpoint manually to verify data format and completeness

- [x] 2.0 Integrate OpenAI for trading decisions
  - [x] 2.1 Install `openai` and `zod` npm packages (`npm install openai zod@^3.24.1` - note: must use Zod v3 for compatibility with OpenAI helpers)
  - [x] 2.2 Add `OPENAI_API_KEY` to `.env.local` file
  - [x] 2.3 Define Zod schema for trading decisions in `types/trading.ts` (action enum: BUY/SELL/HOLD, asset literal: "BTC", quantity number, reasoning string)
  - [x] 2.4 Create `lib/openai/tradingAgent.ts` with OpenAI client initialization and import `zodTextFormat` from 'openai/helpers/zod'
  - [x] 2.5 Design system prompt that defines agent role and risk parameters (20% max per trade)
  - [x] 2.6 Implement function to send market data using `responses.parse()` with `text.format: zodTextFormat(schema, "name")` (response validation is guaranteed by Structured Outputs, use model "gpt-5-nano")
  - [x] 2.7 Handle OpenAI API errors with retry logic (retry once, then fail gracefully)

- [x] 3.0 Implement order execution and risk management
  - [x] 3.1 Create `lib/utils/portfolioCalculator.ts` for total portfolio value calculation in USDT
  - [x] 3.2 Implement 20% position size validation function (calculate max trade value allowed)
  - [x] 3.3 Add quantity adjustment logic if LLM request exceeds 20% limit
  - [x] 3.4 Create `lib/binance/orderExecution.ts` with balance verification functions
  - [x] 3.5 Implement MARKET order placement using `client.newOrder()` from Binance connector
  - [x] 3.6 Add error handling for insufficient balance, API errors, and order failures
  - [x] 3.7 Create `/api/trading-agent/route.ts` that ties together: fetch intelligence → LLM decision → validate → execute
  - [x] 3.8 Return comprehensive response with decision, reasoning, order result, or error

- [x] 4.0 Build trade history tracking system
  - [x] 4.1 Create `data/` directory and `trade-history.json` file (initialize as empty array)
  - [x] 4.2 Create `lib/storage/tradeHistory.ts` with functions to read/write JSON file
  - [x] 4.3 Implement `logTrade()` function that saves: timestamp, market snapshot, decision, order result, portfolio values
  - [x] 4.4 Add unique ID generation using `uuid` package (`npm install uuid @types/uuid`)
  - [x] 4.5 Create `/api/trade-history/route.ts` with GET endpoint (returns last 20 trades, sorted by timestamp)
  - [x] 4.6 Add POST endpoint in `/api/trade-history/route.ts` for logging new trades
  - [x] 4.7 Implement P&L calculation logic (unrealized: portfolio value change over time)
  - [x] 4.8 Calculate cumulative P&L from all trades in history

- [x] 5.0 Create trading agent UI components
  - [x] 5.1 Create `components/TradingAgent.tsx` with "Run AI Analysis" button
  - [x] 5.2 Add loading state UI (spinner/text while agent is processing)
  - [x] 5.3 Display agent decision (action, asset, quantity) with color coding (green=BUY, red=SELL, gray=HOLD)
  - [x] 5.4 Show LLM reasoning in monospace/terminal style (truncated with expand option)
  - [x] 5.5 Display executed order details (price, quantity, order ID) or error message
  - [x] 5.6 Create `components/TradeHistory.tsx` table component (timestamp, action, quantity, price, reasoning, P&L)
  - [x] 5.7 Create `components/PerformanceMetrics.tsx` showing total P&L and trade count
  - [x] 5.8 Add debouncing to "Run Analysis" button (3-second minimum between clicks)
  - [x] 5.9 Integrate all components into main page (`app/page.tsx`)
  - [x] 5.10 Style components following factory.ai aesthetic (clean, minimal, proper spacing)
