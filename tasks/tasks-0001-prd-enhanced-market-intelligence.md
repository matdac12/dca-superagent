# Tasks: Enhanced Market Intelligence System

**Based on**: `0001-prd-enhanced-market-intelligence.md`

---

## Relevant Files

- `src/app/api/market-intelligence/route.ts` - Main API endpoint that fetches market data from Binance and serves it to LLMs. Needs major updates for new timeframe, order book, and indicators.
- `src/lib/utils/technicalIndicators.ts` - NEW file to calculate RSI, MACD, Bollinger Bands, and EMAs.
- `src/lib/utils/tradeHistoryFormatter.ts` - NEW file to format last 10 trades with P&L and time elapsed.
- `src/lib/utils/orderBookAnalyzer.ts` - NEW file to analyze order book depth and identify support/resistance.
- `src/lib/storage/tradeHistory.ts` - Existing file that needs to be extended for fetching last N trades.
- `src/lib/openai/tradingAgent.ts` - OpenAI agent prompts need updating with new data sections.
- `src/lib/xai/tradingAgentGrok.ts` - Grok agent prompts need updating with new data sections.
- `src/lib/openrouter/tradingAgentGemini.ts` - Gemini agent prompts need updating with new data sections.
- `src/lib/council/prompts.ts` - Council debate prompts need updating with new data sections.
- `package.json` - Add `technicalindicators` npm package as dependency.

### Notes

- This is a data enhancement project. No frontend changes required.
- All changes are backward compatible with existing API structure.
- Install `technicalindicators` package: `npm install technicalindicators`
- Test each phase independently before moving to next phase.

---

## Tasks

- [ ] 1.0 Adjust Market Data Timeframe (Phase 1)
- [x] 1.1 Update klines API call in `market-intelligence/route.ts` from `'1m'` to `'15m'`
  - [x] 1.2 Change klines limit from `1440` to `288` candles
  - [x] 1.3 Update price range calculation to use all 288 candles instead of last 60
  - [x] 1.4 Update comments to reference "72-hour window" instead of "24 hours"
  - [x] 1.5 Test API response to verify 288 candles are returned with correct 15m intervals
  - [x] 1.6 Verify backward compatibility: ensure existing response structure is preserved

- [ ] 2.0 Integrate Trade History Context (Phase 2)
  - [x] 2.1 Add `getLastNTrades(limit: number)` function to `src/lib/storage/tradeHistory.ts`
  - [x] 2.2 Create `src/lib/utils/tradeHistoryFormatter.ts` with `formatTradeHistory()` function
  - [x] 2.3 Implement time elapsed calculation (e.g., "2h ago", "5h ago") using Date utility
  - [x] 2.4 Implement P&L calculation for trades: compare entry price vs current price
  - [x] 2.5 Format each trade as: `"[time] ago: [ACTION] [qty] BTC @ $[price] → Current: $[current] ([P&L%], [P&L$])"`
  - [x] 2.6 Generate summary statement: identify last BUY/SELL action and current position status
  - [x] 2.7 Handle edge cases: no trades, fewer than 10 trades, HOLD actions
  - [x] 2.8 Integrate `formatTradeHistory()` into `market-intelligence/route.ts`
  - [x] 2.9 Add new `tradeHistory` field to API response with formatted string
  - [x] 2.10 Test with empty trade history and with 10+ trades

- [ ] 3.0 Implement Technical Indicators (Phase 3)
  - [x] 3.1 Install `technicalindicators` package: `npm install technicalindicators`
  - [x] 3.2 Create `src/lib/utils/technicalIndicators.ts` utility file
  - [x] 3.3 Import required indicators: `RSI`, `MACD`, `BollingerBands`, `EMA` from `technicalindicators`
  - [x] 3.4 Implement `calculateRSI(candles, period = 14)` function
  - [x] 3.5 Implement `calculateMACD(candles, fast = 12, slow = 26, signal = 9)` function
  - [x] 3.6 Implement `calculateBollingerBands(candles, period = 20, stdDev = 2)` function
  - [x] 3.7 Implement `calculateEMAs(candles, periods = [20, 50, 200])` function
  - [x] 3.8 Create `formatIndicators()` function to generate hybrid format with interpretations
  - [x] 3.9 Add RSI interpretation: overbought (>70), oversold (<30), neutral (30-70)
  - [x] 3.10 Add MACD interpretation: bullish/bearish crossover, momentum direction
  - [x] 3.11 Add Bollinger Bands interpretation: price position relative to bands
  - [x] 3.12 Add EMA interpretation: trend strength based on price vs EMAs
  - [x] 3.13 Generate summary insight line (e.g., "Price above all EMAs: Strong uptrend")
  - [x] 3.14 Integrate `calculateIndicators()` into `market-intelligence/route.ts`
  - [x] 3.15 Add new `indicators` field to API response with formatted string
  - [x] 3.16 Test indicator calculations with sample candle data

- [ ] 4.0 Add Order Book Depth Analysis (Phase 4)
  - [x] 4.1 Add order book fetch to `market-intelligence/route.ts`: `client.depth(symbol, { limit: 10 })`
  - [x] 4.2 Create `src/lib/utils/orderBookAnalyzer.ts` utility file
  - [x] 4.3 Implement `analyzeOrderBook(bids, asks)` function
  - [x] 4.4 Calculate best bid, best ask, and spread (absolute and percentage)
  - [x] 4.5 Identify top 3 strongest bid levels (by quantity) as support levels
  - [x] 4.6 Identify top 3 strongest ask levels (by quantity) as resistance levels
  - [x] 4.7 Format order book as structured list with annotations (e.g., "← Strong support")
  - [x] 4.8 Generate summary statement about liquidity and key levels
  - [x] 4.9 Implement simple in-memory caching with 10-second TTL
  - [x] 4.10 Add error handling: if order book fetch fails, log warning and continue without section
  - [x] 4.11 Integrate `analyzeOrderBook()` into `market-intelligence/route.ts`
  - [x] 4.12 Add new `orderBook` field to API response with formatted string
  - [x] 4.13 Test with live Binance data

- [ ] 5.0 Update LLM Prompts Across All Agents (Phase 5)
  - [x] 5.1 Update `src/lib/openai/tradingAgent.ts` system prompt to reference new data sections
  - [x] 5.2 Update `src/lib/openai/tradingAgent.ts` user prompt to include trade history, indicators, order book
  - [x] 5.3 Update `src/lib/xai/tradingAgentGrok.ts` system prompt to reference new data sections
  - [x] 5.4 Update `src/lib/xai/tradingAgentGrok.ts` user prompt to include trade history, indicators, order book
  - [x] 5.5 Update `src/lib/openrouter/tradingAgentGemini.ts` system prompt to reference new data sections
  - [x] 5.6 Update `src/lib/openrouter/tradingAgentGemini.ts` user prompt to include trade history, indicators, order book
  - [x] 5.7 Update `src/lib/council/prompts.ts` - `getProposalUserPrompt()` to include all new sections
  - [x] 5.8 Test that all prompts maintain existing structure and risk parameters
  - [x] 5.9 Verify hybrid format: structured sections with clear headers and narrative summaries
  - [x] 5.10 Ensure scannable formatting with proper spacing and bullet points

- [ ] 6.0 Testing and Validation (Phase 6)
  - [x] 6.1 Test `/api/market-intelligence` endpoint manually and verify all new fields are present
  - [x] 6.2 Validate timeframe: confirm 288 candles with 15m intervals spanning 72 hours
  - [x] 6.3 Validate trade history: confirm last 10 trades with correct P&L and time elapsed
  - [x] 6.4 Validate indicators: verify RSI, MACD, BB, EMA values are mathematically correct
  - [x] 6.5 Validate order book: confirm top 10 bids/asks with accurate spread calculation
  - [x] 6.6 Test OpenAI agent: trigger trade, verify LLM references new data in reasoning
  - [x] 6.7 Test Grok agent: trigger trade, verify LLM references new data in reasoning
  - [x] 6.8 Test Gemini agent: trigger trade, verify LLM references new data in reasoning
  - [x] 6.9 Test Council debate: verify all 3 models receive and reference enhanced data
  - [x] 6.10 Monitor for overtrading: run 5-10 trades and check if hold time increases
  - [x] 6.11 Check error handling: verify graceful degradation if order book or indicators fail
  - [x] 6.12 Verify API performance: confirm response time is acceptable (<2 seconds)
