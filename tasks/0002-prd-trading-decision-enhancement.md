# PRD: Enhanced Trading Decision System with Advanced Signals & Unified Prompts

## Introduction/Overview

The current TradeWarriors LLM trading agents (OpenAI, Gemini, Grok) make autonomous BTC/USDT spot trading decisions using technical indicators (RSI, MACD, Bollinger Bands, EMAs), order book analysis, trade history, and market news. However, the system has several critical gaps:

1. **Missing volatility context** - Agents don't understand if markets are calm vs. chaotic
2. **No trend strength confirmation** - Momentum signals can be false in ranging markets
3. **Lack of volume validation** - Price moves without volume confirmation lead to false breakouts
4. **Inconsistent prompts** - Each model has duplicated, slightly different prompts (hard to maintain)
5. **Vague decision rules** - "AGGRESSIVE" guidance leads to inconsistent behavior
6. **No multi-signal alignment gates** - Agents act on single indicators without confluence

**The goal**: Transform the system into a **medium-term, spot-only swing trading strategy** with objective, data-driven decision-making backed by volatility, trend strength, volume, and order book microstructure signals.

---

## Goals

1. **Add 4 new compact, high-signal indicators**: ATR/ATR%, ADX, RVOL, Order Book Imbalance & Near-Depth
2. **Create unified prompt builder** for consistent behavior across all LLM agents
3. **Implement objective decision rules** requiring multi-signal confluence (≥2 aligned signals)
4. **Reduce overtrading** through file-based daily caps (≤2 orders/24h, enforced at code level) and stricter entry gates
5. **Enhance Exa research** with daily deep analysis including thesis and key drivers
6. **Lower model temperature to 0.0** for deterministic, repeatable decisions
7. **Keep token footprint ~1200 tokens** (flexible guideline) with concise "Derived Signals" presentation
8. **Establish clear success metrics** (win rate, reduced whipsaws, growth vs. BTC hold)

---

## User Stories

### Story 1: Volatility-Aware Trading
**As a** trading agent
**I want to** know if the market is in a high, normal, or low volatility regime
**So that** I can avoid entries during chaotic periods or size positions appropriately

**Acceptance Criteria:**
- ATR (14-period) and ATR% (ATR/price) are calculated for every decision
- ATR% is classified as: Low (<1%), Normal (1-2%), High (>2%)
- When ATR% > 2.5 AND RVOL < 1.2, new entries are blocked (HOLD enforced)

### Story 2: Trend Strength Validation
**As a** trading agent
**I want to** distinguish between real trends and choppy ranges
**So that** I only follow momentum signals during confirmed trends

**Acceptance Criteria:**
- ADX (14-period) is calculated and interpreted as: Ranging (<20), Building (20-25), Trending (≥25)
- Trend-following entries only allowed when ADX ≥ 25
- Mean-reversion strategies only allowed when ADX < 20

### Story 3: Volume Confirmation
**As a** trading agent
**I want to** validate price moves with volume participation
**So that** I avoid false breakouts with low conviction

**Acceptance Criteria:**
- RVOL (current volume / SMA(volume, 20)) is calculated
- RVOL is classified as: Low (↓ <0.8), Normal (≈ 0.8-1.3), High (↑ ≥1.3)
- Breakout trades require RVOL ≥ 1.3

### Story 4: Order Book Microstructure
**As a** trading agent
**I want to** see near-price buy/sell pressure
**So that** I can gauge immediate liquidity and directional tilt

**Acceptance Criteria:**
- Order book imbalance is calculated: `(Σ top-10 bids - Σ top-10 asks) / Σ total`
- Strong imbalance threshold: |imbalance| ≥ 0.2
- Depth within ±0.5% of mid price is calculated and displayed
- Top 5 bid/ask levels shown (reduced from 10 for token efficiency)

### Story 5: Unified Prompt System
**As a** developer
**I want** a single source of truth for prompt generation
**So that** updates apply consistently across all LLM models

**Acceptance Criteria:**
- New file `trade-wars/src/lib/prompts/tradingPromptBuilder.ts` created
- All three agents (OpenAI, Gemini, Grok) use this shared builder
- Builder accepts `tone` parameter for per-model personality
- Prompt includes all 4 new signals in a "DERIVED SIGNALS" summary line

### Story 6: Confluence-Based Decisions
**As a** trading agent
**I want** clear rules for signal alignment
**So that** I only trade when multiple indicators agree

**Acceptance Criteria:**
- System prompt requires ≥2 aligned signals for BUY/SELL
- Alignment candidates: RSI, MACD, Bollinger, EMA, ADX, RVOL (6 total)
- Default action is HOLD when signals conflict
- Daily order cap of ≤2 trades enforced at code level (file-based persistence)

### Story 7: Enhanced Daily Research
**As a** trading agent
**I want** one comprehensive daily research report
**So that** I can factor in fundamental drivers alongside technicals

**Acceptance Criteria:**
- Exa research runs once per day (on first decision request of calendar day)
- Research prompt expanded to request thesis and key drivers
- Schema includes: `{ thesis: string, keyDrivers: string }`
- significantEvent flag downgrades position sizing when risk-negative

---

## Functional Requirements

### FR-1: Technical Indicator Enhancements

**FR-1.1** Implement ATR (Average True Range) calculation in `trade-wars/src/lib/utils/technicalIndicators.ts`
- Use `technicalindicators` library ATR function
- Default period: 14
- Calculate ATR% as `(ATR / currentPrice) * 100`
- Return interpretation: "Low" (<1%), "Normal" (1-2%), "High" (>2%), "Extreme" (>2.5%)

**FR-1.2** Implement ADX (Average Directional Index) calculation
- Use `technicalindicators` library ADX function
- Default period: 14
- Return interpretation: "Ranging" (<20), "Building" (20-25), "Trending" (≥25), "Strong Trend" (>40)

**FR-1.3** Implement RVOL (Relative Volume) calculation
- Formula: `currentVolume / SMA(volume, 20)`
- Use last completed candle's volume
- Return interpretation: "Low ↓" (<0.8), "Normal ≈" (0.8-1.3), "High ↑" (≥1.3), "Extreme ↑↑" (≥2.0)

**FR-1.4** Implement VWAP (Volume-Weighted Average Price) calculation
- Calculate 24-hour rolling VWAP from candles
- Compute distance: `Math.abs(currentPrice - vwap)`
- Return boolean: `farFromFairValue = distance >= ATR`
- Raw VWAP value used internally; boolean result ("Fair=Near/Far") shown in Derived Signals

**FR-1.5** Extend `IndicatorFormat` interface
```typescript
export interface IndicatorFormat {
  formatted: string;
  interpretations: IndicatorInterpretations;
  rsi: RSIResult;
  macd: MACDResult;
  bollinger: BollingerBandsResult;
  ema: EMAResult;
  atr: ATRResult;        // NEW
  adx: ADXResult;        // NEW
  rvol: RVOLResult;      // NEW
  vwap: VWAPResult;      // NEW
  derivedSignals: string; // NEW: one-line summary
}
```

**FR-1.6** Add "DERIVED SIGNALS" summary line to `formatIndicators()` output
- Format: `Vol={ATR state} | Trend={ADX state} | Flow={RVOL state} | Fair={near/far from VWAP}`
- Example: `Vol=Normal(1.4%) | Trend=Trending(ADX 28) | Flow=High↑(1.6x) | Fair=Near`

### FR-2: Order Book Enhancements

**FR-2.1** Add depth-within-range calculation to `trade-wars/src/lib/utils/orderBookAnalyzer.ts`
- Calculate total bid/ask volume within ±0.5% of mid price
- Return: `{ depthBidsNear: number, depthAsksNear: number, depthRatio: number }`
- `depthRatio = depthBidsNear / depthAsksNear` (>1.2 = bid-heavy, <0.8 = ask-heavy)

**FR-2.2** Reduce displayed order book levels from 10 to 5 per side
- Show top 5 bids and top 5 asks in formatted output
- Keep full data for imbalance calculation (top 10 each side)

**FR-2.3** Extend `OrderBookAnalysis` interface
```typescript
export interface OrderBookAnalysis {
  bestBid: OrderLevel | null;  // existing
  bestAsk: OrderLevel | null;  // existing
  spread: {                    // existing
    absolute: number | null;
    percent: number | null;
  };
  supportLevels: OrderLevel[]; // existing
  resistanceLevels: OrderLevel[]; // existing
  imbalance: number;           // NEW: (Σ top-10 bids - Σ top-10 asks) / Σ total
  totalBidVolume: number;      // NEW: sum of all bid volumes
  totalAskVolume: number;      // NEW: sum of all ask volumes
  depthBidsNear: number;       // NEW: within ±0.5%
  depthAsksNear: number;       // NEW: within ±0.5%
  depthRatio: number;          // NEW: near-depth ratio
  summary: string;             // existing
  formatted: { bids: string[], asks: string[] }; // existing
}
```

**FR-2.4** Update summary to include near-depth
- Example: `Imbalance: +15% (bid-heavy) | Near-depth ratio: 1.3 (bids stronger within 0.5%)`

### FR-3: Unified Prompt Builder

**FR-3.1** Create `trade-wars/src/lib/prompts/tradingPromptBuilder.ts` with main function:
```typescript
export interface PromptConfig {
  tone: 'cautious' | 'balanced' | 'aggressive';
  maxPositionPct: number;      // 0.20 = 20%
  minOrderUSD: number;          // 10
  decisionInterval: string;     // "4 hours"
  dailyOrderCap: number;        // 2
}

export function buildTradingPrompt(
  marketData: MarketIntelligence,
  config: PromptConfig
): { systemPrompt: string; userPrompt: string }
```

**FR-3.2** System prompt must include:
- Agent role based on tone:
  - `cautious`: "medium-term swing trader, spot-only, few high-quality trades"
  - `balanced`: "systematic trader balancing momentum and risk"
  - `aggressive`: "momentum-focused trader capitalizing on volatility" (kept for diversity)
- Risk parameters: max position %, min order value, daily cap
- Decision guidelines requiring ≥2 aligned signals
- Guardrails:
  - If ATR% > 2.5 AND RVOL < 1.2 → HOLD (skip new entries)
  - Trend entries require ADX ≥ 25
  - Breakouts require RVOL ≥ 1.3 AND order book imbalance ≥ 0.2
  - Mean-reversion only when ADX < 20 AND far from VWAP
- Position sizing tiers:
  - 10% of portfolio: weak signal (2 indicators aligned)
  - 15% of portfolio: good signal (3 indicators aligned)
  - 20% of portfolio: strong signal (4+ indicators aligned, max cap)
- Invalidation reasoning guidance:
  - "Consider position invalidated if price moves >1.5 ATR against entry"
  - "Exit thesis weakens if ADX drops below 20 after trend entry"

**FR-3.3** User prompt must include:
- Portfolio snapshot (USDT, BTC, total value, allocations)
- Max buy/sell amounts based on config.maxPositionPct
- Eligibility gates (✓ OK or ❌ BELOW MINIMUM)
- Market data (current price, 24h stats, 72h range, volume)
- Trade history (last 10 trades with P&L)
- Technical indicators section (existing + derived signals)
- Order book section (imbalance, near-depth, top 5 levels)
- Market news section (if available)
- Daily order cap warning: "Trades today: X/2 (Y remaining)"

**FR-3.4** Token budget target
- Target: ≤1200 tokens per prompt (flexible, not strict)
- Use concise formatting:
  - One-line indicator summaries
  - Top 5 order book levels (not 10)
  - Derived signals summary line
- Trade history: Keep last 10 trades with full P&L details (high value for decision context)

**FR-3.5** Update all three agents to use shared builder:
- `trade-wars/src/lib/openai/tradingAgent.ts`: `buildTradingPrompt(marketData, { tone: 'cautious', maxPositionPct: 0.20, ... })`
- `trade-wars/src/lib/openrouter/tradingAgentGemini.ts`: same config
- `trade-wars/src/lib/xai/tradingAgentGrok.ts`: same config (or `tone: 'aggressive'` for personality)

### FR-4: Model Temperature Updates

**FR-4.1** Set temperature to 0.0 for all models:
- OpenAI: Add `temperature: 0.0` to `openai.responses.parse()` call
- Gemini (OpenRouter): Add `temperature: 0.0` to `chat.completions.create()` call
- Grok (xAI): Add `temperature: 0.0` to `chat.completions.create()` call

**FR-4.2** Document rationale in code comments:
```typescript
// Temperature 0.0 ensures deterministic, repeatable decisions.
// Same inputs → same outputs (no randomness in trading logic).
```

### FR-5: Enhanced Exa Market Research

**FR-5.1** Update Exa search prompt in `trade-wars/src/lib/exa/marketNews.ts`
- Expand prompt to request:
  - Overall market thesis for BTC (bullish/bearish/neutral)
  - 3-5 key drivers influencing direction (with impact: bullish/bearish/neutral)
  - Significant events (tariffs, regulations, major institutional moves)
  - Sentiment summary

**FR-5.2** Extend `MarketNewsData` schema:
```typescript
export interface MarketNewsData {
  articles: Array<{ /* existing */ }>;
  significantEvent: boolean;
  formatted: string;
  thesis: string;          // NEW: "Bullish on institutional inflows and technical breakout"
  keyDrivers: string;      // NEW: "1. ETF approvals 2. Resistance at $96k 3. Weak macro sentiment"
}
```

**FR-5.3** Daily execution logic
- Track last Exa fetch timestamp (in-memory or file)
- On each decision request, check if current calendar day (UTC) > last fetch day
- If yes: trigger Exa research, update timestamp
- If no: use cached result
- Manual trigger still available via API endpoint

**FR-5.4** Position sizing adjustment based on news
- If `significantEvent: true` AND thesis/drivers are risk-negative:
  - Downgrade position size one tier (e.g., 15% → 10%)
  - Add to reasoning: "Position sized cautiously due to [event]"
- If risk-positive AND signals align: allow normal sizing
- If conflicting (positive news, negative technicals): default to HOLD

### FR-6: Decision Logging & Telemetry

**FR-6.1** Log enhanced decision context (console output, future: DB)
```typescript
console.log({
  timestamp: new Date().toISOString(),
  model: 'OpenAI gpt-5-nano',
  decision: { action, quantity, reasoning },
  derivedSignals: { atr, atrPct, adx, rvol, obImbalance, depthRatio },
  newsThesis: marketNews?.thesis || null,
  promptTokens: estimatedTokenCount
});
```

**FR-6.2** Track daily order count (file-based for persistence)
- Create `trade-wars/data/daily-order-cap.json` to persist counter across restarts
- Structure: `{ date: "2025-10-14", count: 1 }`
- On each trading decision, check file:
  - If date is today: increment count
  - If date is past: reset to 0, update date
- Pre-check BEFORE calling LLM: if count >= dailyOrderCap (2), immediately return HOLD decision
  - Reasoning: "Daily order limit reached (2/2). System enforces max 2 trades per 24h for risk control."
  - Saves tokens and LLM API calls
- Update count after successful trade execution (not just decision)

### FR-7: Backward Compatibility

**FR-7.1** Preserve all existing indicators:
- RSI, MACD, Bollinger Bands, EMAs (20, 50, 200)
- Keep existing interpretation functions
- Add new indicators alongside, don't replace

**FR-7.2** Maintain existing API contracts:
- Trading agent functions return same `TradingDecision` schema
- No breaking changes to API routes
- UI components continue to work without modification

---

## Non-Goals (Out of Scope)

1. **Multi-asset support** - BTC/USDT only for now; ADA and others deferred
2. **Multi-timeframe candles** - Keep 15m candles; 1h/4h/1d analysis deferred
3. **Automated backtesting** - Manual performance tracking for now
4. **Persistent metrics dashboard** - Use existing trade history; no new DB
5. **Stop-loss execution** - Spot-only; no automated exits (reasoning only)
6. **Leverage/futures trading** - Explicitly out of scope (spot only)
7. **Real-time streaming** - Keep current polling model
8. **Custom indicator creation UI** - Code-based indicator addition only

---

## Design Considerations

### UI/UX Requirements
- **No UI changes required** - All enhancements are backend/prompt-level
- Existing components (`PerformanceMetrics`, `TradeHistory`, etc.) continue to work
- Future: Could display "Derived Signals" in a new dashboard widget

### Token Budget
- **Target**: ~1200 tokens per prompt (flexible guideline, not strict limit)
- **Strategy**:
  - Use abbreviations (Vol, Trend, Flow instead of verbose descriptions)
  - One-line summaries instead of multi-line explanations
  - Top 5 order book levels instead of 10
  - Trade history: Keep last 10 full entries (high-value context worth the tokens)

### Data Flow
```
Binance API (klines, ticker, order book)
  ↓
Calculate Technical Indicators (existing + ATR, ADX, RVOL, VWAP)
  ↓
Analyze Order Book (imbalance + near-depth)
  ↓
Fetch/Cache Exa Research (daily, includes thesis/drivers)
  ↓
Build Unified Prompt (shared builder)
  ↓
Call LLM (OpenAI/Gemini/Grok) at temp 0.0
  ↓
Parse Decision (BUY/SELL/HOLD with reasoning)
  ↓
Log Decision + Context
  ↓
Execute Trade (if valid) or Display Decision
```

---

## Technical Considerations

### Dependencies
- **Existing**: `technicalindicators` package (already installed)
- **No new packages required** - ATR, ADX available in `technicalindicators`
- RVOL and VWAP are simple calculations (no library needed)

### Performance
- **Indicator calculations**: +10-20ms (ATR, ADX, RVOL are fast)
- **Order book analysis**: +5ms (depth within range is O(n) where n=20)
- **Prompt generation**: Negligible (<1ms)
- **LLM latency**: Unchanged (same API calls, just different prompts)
- **Target total decision time**: <3 seconds (well within bounds)

### Rate Limits
- **Binance API**: No change (same klines/ticker/orderBook requests)
- **Exa API**: Reduced from potential 6x/day (every 4h) to 1x/day (safer)
- **LLM APIs**: No change in call frequency

### Code Organization
```
trade-wars/src/lib/
  prompts/
    tradingPromptBuilder.ts    # NEW: Shared prompt logic
  utils/
    technicalIndicators.ts     # UPDATED: Add ATR, ADX, RVOL, VWAP
    orderBookAnalyzer.ts       # UPDATED: Add near-depth calculation
  openai/
    tradingAgent.ts            # UPDATED: Use shared builder, temp 0.0
  openrouter/
    tradingAgentGemini.ts      # UPDATED: Use shared builder, temp 0.0
  xai/
    tradingAgentGrok.ts        # UPDATED: Use shared builder, temp 0.0
  exa/
    marketNews.ts              # UPDATED: Expand prompt, add thesis/drivers
trade-wars/data/
  daily-order-cap.json         # NEW: Persistent daily order counter
```

---

## Success Metrics

### Primary Metrics
1. **Win Rate Improvement**
   - Baseline: Current win rate from last 20 trades
   - Target: +10% improvement (e.g., 45% → 55%)
   - Measured: After 30 decisions with new system

2. **Reduced Whipsaws**
   - Baseline: Count of BUY→SELL or SELL→BUY reversals within 8 hours
   - Target: 50% reduction in whipsaws
   - Indicates better signal confluence and trend-following

3. **Decision Stability**
   - Baseline: Count of consecutive different decisions (HOLD→BUY→HOLD→SELL churn)
   - Target: Increased HOLD frequency (40%+ of decisions)
   - Indicates agents waiting for high-quality setups

4. **Growth vs. BTC Hold**
   - Baseline: BTC buy-and-hold return over test period
   - Target: Outperform or match BTC hold with lower volatility
   - Risk-adjusted: Measure Sharpe ratio (return / volatility)

### Secondary Metrics
5. **Average Trade Quality**
   - Measure: Average profit/loss per trade (in %)
   - Target: Positive expectancy (avg win > avg loss)

6. **Prompt Token Count** (informational only, not a constraint)
   - Measure: Actual tokens per prompt (log in telemetry)
   - Target: ~1200 tokens as guideline (cost efficiency, but quality > cost)

7. **Decision Latency**
   - Measure: Time from API call to decision return
   - Target: <3 seconds end-to-end

8. **Model Consistency**
   - Measure: Given same market data, do all 3 models produce similar decisions?
   - Target: 70%+ agreement rate (BUY/SELL/HOLD classification)

---

## Open Questions

1. **Daily order cap enforcement**: Should we add code-level blocking (prevent LLM from choosing BUY/SELL when cap hit) or trust prompt guidance?
   - **Decision**: Code-level pre-check with file-based persistence (FR-6.2). Hard-blocks trades when cap hit, saves tokens by skipping LLM call entirely.

2. **Exa caching mechanism**: In-memory (lost on restart) or file-based (persistent)?
   - **Decision**: File-based (aligns with existing implementation in `marketNews.ts`); persist timestamp and cached results to disk for reliability

3. **VWAP calculation window**: 24h rolling or session-based (00:00 UTC reset)?
   - **Decision**: 24h rolling (simpler, more consistent)

4. **Order book snapshot timing**: Should we fetch order book immediately before LLM call or use cached data (up to 1 min old)?
   - **Decision**: Use existing timing (no changes to data fetch logic)

5. **Temperature for council decisions**: Should council voting also use temp 0.0?
   - **Deferred**: Not in scope for this PRD (council is separate feature)

6. **ATR period sensitivity**: Should we test ATR(10) vs ATR(14) vs ATR(20)?
   - **Decision**: Start with ATR(14) (industry standard); optimize later if needed

7. **Multi-signal alignment weighting**: Should some indicators count more (e.g., ADX > RSI)?
   - **Decision**: Equal weighting for now; let LLM reason about importance

8. **Position sizing for partial exits**: Should agents be able to sell 50% of holdings?
   - **Deferred**: Not in scope; BUY/SELL are all-or-nothing within position limits

---

## Implementation Checklist

### Phase 1: Technical Indicators (Priority: High)
- [ ] Implement `calculateATR()` in `technicalIndicators.ts`
- [ ] Implement `calculateADX()` in `technicalIndicators.ts`
- [ ] Implement `calculateRVOL()` in `technicalIndicators.ts`
- [ ] Implement `calculateVWAP()` in `technicalIndicators.ts`
- [ ] Extend `IndicatorFormat` interface with new result types
- [ ] Add `buildDerivedSignals()` function for one-line summary
- [ ] Update `formatIndicators()` to include new signals
- [ ] Write unit tests for new indicator calculations

### Phase 2: Order Book Enhancements (Priority: High)
- [ ] Add `calculateNearDepth()` to `orderBookAnalyzer.ts`
- [ ] Extend `OrderBookAnalysis` interface
- [ ] Update `analyzeOrderBook()` to include depth ratio
- [ ] Reduce formatted output to top 5 levels (from 10)
- [ ] Update summary text to include near-depth info

### Phase 3: Unified Prompt Builder (Priority: Critical)
- [ ] Create `trade-wars/src/lib/prompts/tradingPromptBuilder.ts`
- [ ] Define `PromptConfig` interface
- [ ] Implement `buildSystemPrompt()` with tone variants
- [ ] Implement `buildUserPrompt()` with all data sections
- [ ] Add derived signals to user prompt
- [ ] Add decision rules to system prompt (ADX gates, RVOL thresholds, etc.)
- [ ] Add position sizing tiers to system prompt
- [ ] Implement token counting utility (optional, for monitoring)

### Phase 4: Update Trading Agents (Priority: Critical)
- [ ] Update `openai/tradingAgent.ts` to use prompt builder
- [ ] Update `openrouter/tradingAgentGemini.ts` to use prompt builder
- [ ] Update `xai/tradingAgentGrok.ts` to use prompt builder
- [ ] Set `temperature: 0.0` in all three agents
- [ ] Remove old prompt code (system/user prompt strings)
- [ ] Test each agent with new prompts

### Phase 5: Exa Research Enhancement (Priority: Medium)
- [ ] Update Exa search prompt to request thesis and key drivers
- [ ] Extend `MarketNewsData` interface
- [ ] Parse thesis and keyDrivers from Exa response
- [ ] Implement daily fetch logic (check last fetch timestamp)
- [ ] Add position sizing adjustment based on significantEvent
- [ ] Test Exa research flow

### Phase 6: Decision Logging & Order Cap (Priority: Medium)
- [ ] Add enhanced console logging with derived signals
- [ ] Create `trade-wars/data/` directory if not exists
- [ ] Implement file-based daily order counter (FR-6.2)
  - [ ] Create `dailyOrderCap.ts` utility to read/write `data/daily-order-cap.json`
  - [ ] Add pre-check before LLM calls in all agents
  - [ ] Return immediate HOLD when cap reached (skip LLM entirely)
- [ ] Log prompt token estimates

### Phase 7: Testing & Validation (Priority: Critical)
- [ ] Test all three agents produce valid decisions
- [ ] Verify temperature 0.0 produces deterministic results (same input → same output)
- [ ] Log prompt token count for monitoring (informational only)
- [ ] Test guardrails (high ATR blocks entries, ADX gates work)
- [ ] Test multi-signal alignment (2+ signals required)
- [ ] Test file-based daily order cap (persistence across restarts)
- [ ] Test Exa daily fetch logic
- [ ] Manual trading test with small position sizes

### Phase 8: Documentation (Priority: Medium)
- [ ] Update code comments in modified files
- [ ] Document new indicator formulas and thresholds
- [ ] Document prompt builder usage
- [ ] Update CLAUDE.md with new decision rules
- [ ] Create decision flow diagram (optional)

---

## Appendix: Decision Rules Summary

### Entry Gates
| Scenario | Requirements |
|----------|-------------|
| Trend-following BUY | ADX ≥ 25, price above EMA-50, ≥2 signals aligned, NOT (ATR% >2.5 AND RVOL <1.2) |
| Breakout BUY | RVOL ≥ 1.3, OB imbalance ≥ 0.2 (bid-heavy), ≥2 signals aligned |
| Mean-reversion BUY (bottom) | ADX < 20, far from VWAP (≥1 ATR below), RSI oversold, Bollinger lower band |
| Trend-following SELL | Holding BTC, momentum weakening (MACD < signal, histogram declining), ADX still >20 |
| Resistance SELL (top) | RSI >70, price at upper Bollinger, ADX <20 (range-bound) |
| HOLD (default) | Fewer than 2 signals aligned, ATR% >2.5 + RVOL <1.2, daily cap hit |

### Position Sizing
| Signal Strength | % of Portfolio | Criteria |
|-----------------|----------------|----------|
| Weak | 10% | Exactly 2 indicators aligned |
| Good | 15% | 3 indicators aligned |
| Strong | 20% (max cap) | 4+ indicators aligned, all gates passed |

### Risk-Negative Event Sizing Adjustment
| Event Type | Action |
|------------|--------|
| Significant bearish news | Downgrade by 1 tier (e.g., 15% → 10%) |
| Conflicting news + technicals | HOLD |
| Bullish news + aligned signals | Normal sizing |

---

## Revision History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-14 | Claude Code | Initial PRD based on user feedback and senior engineer recommendations |
| 1.1 | 2025-10-14 | Claude Code | Applied senior engineer feedback: Fixed VWAP visibility, marked order book fields as NEW, replaced MACD divergence with simpler logic, added file-based daily order cap (FR-6.2), clarified Exa file-based caching, removed trade history compression (keep full 10 entries), updated all paths to explicit `trade-wars/src/lib/...` format |

---

**END OF PRD**
