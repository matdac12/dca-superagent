# PRD: Enhanced Market Intelligence System

## Introduction/Overview

The current trading system feeds LLMs basic market data (24h ticker stats and 60-minute price action) without historical context, order book depth, or technical indicators. This leads to myopic decision-making, where agents constantly flip-flop between BUY/SELL without understanding their position history or market structure.

This PRD outlines enhancements to the Market Intelligence API to provide LLMs with:
- **Extended timeframes** (72-hour window with 15-minute candles)
- **Trade history context** (last 10 executed trades)
- **Order book depth** (top 10 bid/ask levels)
- **Technical indicators** (RSI, MACD, Bollinger Bands, EMAs)

**Goal:** Enable LLMs to make strategic, position-aware trading decisions by providing comprehensive market intelligence in an easily digestible format.

---

## Goals

1. **Reduce overtrading** by giving LLMs awareness of recent positions and entry prices
2. **Improve decision quality** through technical analysis indicators
3. **Enhance market understanding** with order book liquidity data
4. **Maintain performance** while reducing API calls (from 1440 to 288 candles)
5. **Standardize data format** across all AI agents (OpenAI, Grok, Gemini, Council)

---

## User Stories

1. **As an LLM trading agent**, I want to see my recent trade history so that I can avoid flip-flopping and hold positions strategically.

2. **As an LLM trading agent**, I want to see technical indicators (RSI, MACD, Bollinger Bands, EMAs) so that I can identify overbought/oversold conditions and trend strength.

3. **As an LLM trading agent**, I want to see order book depth so that I can assess liquidity and identify support/resistance levels.

4. **As an LLM trading agent**, I want to see 72 hours of price action (not just 24h) so that I can identify multi-day trends and patterns.

5. **As a developer**, I want all AI agents to receive the same enhanced data format so that trading behavior is consistent and debuggable.

---

## Functional Requirements

### **1. Timeframe Adjustment**

**FR-1.1:** The system MUST fetch 15-minute candles instead of 1-minute candles from Binance.

**FR-1.2:** The system MUST fetch 288 candles (15m × 288 = 72 hours / 3 days) instead of 1440 candles.

**FR-1.3:** The system MUST calculate price range statistics from all 288 candles (high, low, average) instead of just the last 60 minutes.

**FR-1.4:** The system MUST preserve backward compatibility with existing market intelligence response structure.

---

### **2. Trade History Integration**

**FR-2.1:** The system MUST fetch the last 10 trades from the trade history database.

**FR-2.2:** For each trade, the system MUST include:
- Action (BUY, SELL, HOLD)
- Price at execution
- Quantity
- Timestamp
- Time elapsed since trade (e.g., "2h ago")
- Current P&L if position is still held (e.g., "+0.4%")

**FR-2.3:** The system MUST format trade history as a scannable list in the user prompt.

**FR-2.4:** The system MUST include a summary statement (e.g., "Last action was BUY 2 hours ago at $112k. Currently up +$25.").

**FR-2.5:** If there are fewer than 10 trades, the system MUST show all available trades.

**FR-2.6:** If there are no trades, the system MUST display "No trade history available."

---

### **3. Order Book Depth**

**FR-3.1:** The system MUST fetch order book data from Binance using the `depth` endpoint.

**FR-3.2:** The system MUST retrieve the top 10 bid levels and top 10 ask levels.

**FR-3.3:** For each level, the system MUST include:
- Price
- Quantity (in BTC)

**FR-3.4:** The system MUST calculate and display:
- Best bid and best ask
- Bid-ask spread (absolute and percentage)

**FR-3.5:** The system MUST identify key support levels (strongest bid concentrations in top 10).

**FR-3.6:** The system MUST identify key resistance levels (strongest ask concentrations in top 10).

**FR-3.7:** The system MUST format order book data as a structured section with narrative summary.

---

### **4. Technical Indicators**

**FR-4.1:** The system MUST calculate RSI (14-period) from the 288 candles.

**FR-4.2:** The system MUST calculate MACD (12, 26, 9) from the 288 candles.

**FR-4.3:** The system MUST calculate Bollinger Bands (20-period, 2 standard deviations) from the 288 candles.

**FR-4.4:** The system MUST calculate EMA (20-period, 50-period, 200-period) from the 288 candles.

**FR-4.5:** For each indicator, the system MUST provide:
- Raw value
- Contextual interpretation (e.g., "RSI: 68 (Approaching overbought)")

**FR-4.6:** The system MUST format indicators as a structured section with summary insights (e.g., "Price above all EMAs: Strong uptrend").

**FR-4.7:** The system MUST use a technical analysis library (e.g., `technicalindicators` npm package) for calculations.

---

### **5. Data Structure & Format**

**FR-5.1:** The system MUST present enhanced data in a **hybrid format**: structured sections + narrative summaries.

**FR-5.2:** The system MUST organize data into clearly labeled sections:
- `=== TRADE HISTORY (Last 10 Trades) ===`
- `=== MARKET DATA (72-hour window, 15m candles) ===`
- `=== TECHNICAL INDICATORS ===`
- `=== ORDER BOOK (Top 10 levels) ===`

**FR-5.3:** Each section MUST include:
- Key numbers in structured format
- Contextual interpretations
- Summary insights where applicable

**FR-5.4:** The system MUST maintain scannable formatting for LLMs (clear hierarchies, bullet points, concise language).

---

### **6. API Integration & Performance**

**FR-6.1:** The system MUST update the `/api/market-intelligence` endpoint to return enhanced data structure.

**FR-6.2:** The system MUST fetch all required data in parallel (klines, ticker, account, order book, trade history).

**FR-6.3:** The system MUST calculate technical indicators server-side (not client-side).

**FR-6.4:** The system MUST cache order book data for 10 seconds to reduce API calls.

**FR-6.5:** The system MUST handle Binance API rate limits gracefully with exponential backoff.

---

### **7. LLM Prompt Updates**

**FR-7.1:** The system MUST update prompts for all AI agents:
- OpenAI (gpt-5-nano)
- Grok (grok-4-fast)
- Gemini (gemini-2.5-flash)
- Council debate system (all 3 models)

**FR-7.2:** The system MUST update system prompts to reference new data sections.

**FR-7.3:** The system MUST update user prompts to include all enhanced data sections.

**FR-7.4:** The system MUST maintain existing prompt structure and risk parameters.

---

## Non-Goals (Out of Scope)

1. **Multi-asset support** - Still BTC/USDT only (ADA remains in portfolio but not actively traded)
2. **Real-time streaming** - Still polling-based, not WebSocket
3. **Custom indicator parameters** - Using standard periods (RSI-14, MACD 12-26-9, etc.)
4. **Order book visualization** - Data only, no UI charts
5. **Trade execution changes** - Only data enhancements, not execution logic
6. **Historical backtesting** - Focus on live trading only
7. **Multi-timeframe analysis** - Single 15m timeframe only (not combining 1h + 4h + 1d)

---

## Design Considerations

### **Data Format Example**

```
=== TRADE HISTORY (Last 10 Trades) ===
1. 2h ago: BUY 0.05 BTC @ $112,000 → Current: $112,503 (+0.4%, +$25.15)
2. 5h ago: HOLD
3. 8h ago: SELL 0.03 BTC @ $111,500 → Entry was $110,800 (+0.6%, +$21)
...

Summary: Last action was BUY 2 hours ago at $112k. Currently up +$25.

=== MARKET DATA (72-hour window, 15m candles) ===
Current Price: $112,503.15
24h Change: +0.39% (+$441.96)
72h Range: $108,200 - $114,800 (6.1% range)
Volume (24h): 1,028 BTC
Quote Volume (24h): $114.4M

=== TECHNICAL INDICATORS ===
RSI (14): 68 (Approaching overbought - neutral to bullish)
MACD: 145.3 (Signal: 132.1) → Bullish crossover, momentum increasing
Bollinger Bands: Price at upper band ($114,200) - potential resistance
EMA-20: $111,800 | EMA-50: $110,200 | EMA-200: $108,500
→ Analysis: Price above all EMAs indicates strong uptrend

=== ORDER BOOK (Top 10 levels) ===
Best Bid: $112,480 (2.5 BTC) | Best Ask: $112,520 (1.8 BTC)
Spread: $40 (0.035%)

Top Bids (Support):
  $112,480: 2.5 BTC
  $112,450: 3.2 BTC
  $112,400: 5.2 BTC ← Strong support
  $112,350: 2.1 BTC
  $112,300: 8.1 BTC ← Major support
  ...

Top Asks (Resistance):
  $112,520: 1.8 BTC
  $112,550: 2.4 BTC
  $112,600: 6.3 BTC ← Strong resistance
  $112,650: 3.5 BTC
  $112,700: 4.2 BTC
  ...

Summary: Strong bid support at $112,300-$112,400. Large ask wall at $112,600 may cap upside.
```

---

## Technical Considerations

### **Dependencies**

1. **Technical Analysis Library**: Install `technicalindicators` npm package
   ```bash
   npm install technicalindicators
   ```

2. **Binance API Endpoints**:
   - Klines: `client.klines(symbol, '15m', { limit: 288 })`
   - Order Book: `client.depth(symbol, { limit: 10 })`
   - Ticker: `client.ticker24hr(symbol)` (unchanged)
   - Account: `client.account()` (unchanged)

3. **Database Query**: Extend trade history query to return last 10 trades with P&L calculations.

### **Performance Optimizations**

1. **Reduced API calls**: 288 candles vs 1440 = 5× fewer data points
2. **Parallel fetching**: All Binance calls in `Promise.all()`
3. **Order book caching**: 10-second TTL to reduce rate limit pressure
4. **Indicator calculation**: Memoize results for same candle dataset

### **Error Handling**

1. If order book fetch fails → Log warning, continue without order book section
2. If indicator calculation fails → Log error, show raw data only
3. If trade history empty → Display "No trade history available"
4. If Binance rate limit hit → Exponential backoff + retry (max 3 attempts)

---

## Implementation Phases

### **Phase 1: Timeframe Adjustment** (Priority: HIGH)
- Update klines fetch from 1m to 15m, 288 candles
- Update price range calculation to use all 288 candles
- Update prompts to reference "72-hour window"
- Test with all agents

### **Phase 2: Trade History Integration** (Priority: HIGH)
- Fetch last 10 trades from database
- Calculate time elapsed and current P&L for open positions
- Format as scannable list with summary
- Add to user prompts
- Test position awareness in agent decisions

### **Phase 3: Technical Indicators** (Priority: MEDIUM)
- Install `technicalindicators` package
- Implement RSI, MACD, Bollinger Bands, EMA calculations
- Format with contextual interpretations
- Add to user prompts
- Test indicator-driven decisions

### **Phase 4: Order Book Depth** (Priority: MEDIUM)
- Fetch order book with 10 levels
- Calculate spread and identify key levels
- Format with support/resistance summary
- Add caching (10s TTL)
- Test liquidity-aware decisions

### **Phase 5: Testing & Refinement** (Priority: HIGH)
- Run multiple test trades with enhanced data
- Monitor for overtrading reduction
- Compare decision quality vs baseline
- Gather feedback and iterate

---

## Success Metrics

1. **Overtrading reduction**: 30% fewer trades with same or better P&L
2. **Position hold time**: Average trade duration increases from <1h to 2-4h
3. **Decision confidence**: LLM reasoning references trade history, indicators, and order book
4. **API efficiency**: Total Binance API calls reduced by 40%
5. **Error rate**: <1% of market intelligence API calls fail
6. **Agent consensus**: Council debates show higher agreement rates (50%+ unanimous)

---

## Open Questions

1. Should we add volume indicators (OBV, Volume MA) in a future phase?
2. Should we implement alert thresholds (e.g., "RSI > 80, consider selling")?
3. Should we log indicator values to trade history for post-analysis?
4. Should we add a "market regime" classifier (trending vs ranging)?
5. Do we need to adjust the 50% max position size rule based on volatility (Bollinger Band width)?

---

## Acceptance Criteria

✅ Market Intelligence API returns 288 × 15m candles for 72-hour window
✅ Last 10 trades displayed with time elapsed and current P&L
✅ Order book shows top 10 bids/asks with support/resistance summary
✅ Technical indicators (RSI, MACD, BB, EMAs) calculated and formatted
✅ All AI agents (OpenAI, Grok, Gemini, Council) receive enhanced data
✅ Data format is scannable with structured sections + narrative summaries
✅ API calls reduced from 1440 to 288 candles
✅ System handles Binance rate limits gracefully
✅ LLM decisions reference new data sections in reasoning
✅ Integration tests pass for all 4 agents

---

## Timeline Estimate

- **Phase 1 (Timeframe)**: 2-3 hours
- **Phase 2 (Trade History)**: 3-4 hours
- **Phase 3 (Indicators)**: 4-6 hours
- **Phase 4 (Order Book)**: 2-3 hours
- **Phase 5 (Testing)**: 4-6 hours

**Total**: 15-22 hours of development + testing

---

**Document Status**: Draft v1.0
**Created**: 2025-10-12
**Target Audience**: Junior Developer
**Related Systems**: Market Intelligence API, Trading Agent, Council Debate
