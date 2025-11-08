# Task List: Enhanced Trading Decision System

Generated from: `0002-prd-trading-decision-enhancement.md`

## Relevant Files

### New Files to Create
- `trade-wars/src/lib/prompts/tradingPromptBuilder.ts` - Unified prompt generation for all trading agents
- `trade-wars/src/lib/utils/dailyOrderCap.ts` - File-based daily order counter utility
- `trade-wars/data/daily-order-cap.json` - Persistent daily order count data (auto-created)

### Existing Files to Modify
- `trade-wars/src/lib/utils/technicalIndicators.ts` - Add ATR, ADX, RVOL, VWAP calculations and derived signals
- `trade-wars/src/lib/utils/orderBookAnalyzer.ts` - Add imbalance, near-depth calculations, reduce to top 5 levels
- `trade-wars/src/lib/exa/marketNews.ts` - Expand prompt, add thesis/keyDrivers to schema
- `trade-wars/src/lib/openai/tradingAgent.ts` - Use prompt builder, temp 0.0, daily cap pre-check
- `trade-wars/src/lib/openrouter/tradingAgentGemini.ts` - Use prompt builder, temp 0.0, daily cap pre-check
- `trade-wars/src/lib/xai/tradingAgentGrok.ts` - Use prompt builder, temp 0.0, daily cap pre-check
- `trade-wars/src/types/trading.ts` - May need to add types for new indicator results (if not inline)

### Notes
- No unit tests required per current project standards (no existing test files found)
- The `data/` directory already exists with `market-news.json` and `trade-history.json`
- Existing agents already use structured outputs (Zod schemas), maintain this pattern

## Tasks

- [x] 1.0 Implement New Technical Indicators (ATR, ADX, RVOL, VWAP)
  - [x] 1.1 Import ATR and ADX from `technicalindicators` library at top of `technicalIndicators.ts`
  - [x] 1.2 Create `ATRResult` interface with `{ value: number | null; series: number[]; atrPercent: number | null; interpretation: string }`
  - [x] 1.3 Implement `calculateATR(candles: Candle[], period = 14): ATRResult` function
    - Calculate ATR using library
    - Calculate ATR% as `(ATR / currentPrice) * 100`
    - Add interpretation: "Low" (<1%), "Normal" (1-2%), "High" (>2%), "Extreme" (>2.5%)
  - [x] 1.4 Create `ADXResult` interface with `{ value: number | null; series: number[]; interpretation: string }`
  - [x] 1.5 Implement `calculateADX(candles: Candle[], period = 14): ADXResult` function
    - Calculate ADX using library (requires high, low, close arrays)
    - Add interpretation: "Ranging" (<20), "Building" (20-25), "Trending" (≥25), "Strong Trend" (>40)
  - [x] 1.6 Create `RVOLResult` interface with `{ value: number | null; interpretation: string }`
  - [x] 1.7 Implement `calculateRVOL(candles: Candle[], period = 20): RVOLResult` function
    - Get last candle's volume
    - Calculate SMA of volume over last 20 candles
    - RVOL = currentVolume / volumeSMA
    - Add interpretation: "Low ↓" (<0.8), "Normal ≈" (0.8-1.3), "High ↑" (≥1.3), "Extreme ↑↑" (≥2.0)
  - [x] 1.8 Create `VWAPResult` interface with `{ value: number | null; distance: number | null; farFromFairValue: boolean }`
  - [x] 1.9 Implement `calculateVWAP(candles: Candle[], atr: number | null): VWAPResult` function
    - Calculate 24h rolling VWAP: `Σ(price * volume) / Σ(volume)` using typical price `(high + low + close) / 3`
    - Calculate distance: `Math.abs(currentPrice - vwap)`
    - Set `farFromFairValue = distance >= ATR` (will need to pass ATR value)
  - [x] 1.10 Update `IndicatorFormat` interface to include new fields:
    - `atr: ATRResult`
    - `adx: ADXResult`
    - `rvol: RVOLResult`
    - `vwap: VWAPResult`
    - `derivedSignals: string` (one-line summary)
  - [x] 1.11 Create `buildDerivedSignals()` helper function that formats: `Vol={ATR state} | Trend={ADX state} | Flow={RVOL state} | Fair={Near/Far}`
  - [x] 1.12 Update `formatIndicators(candles: Candle[]): IndicatorFormat` function:
    - Call all new calculation functions
    - Call `buildDerivedSignals()` to create summary line
    - Add derived signals to formatted string output
    - Return all new fields in IndicatorFormat object

- [x] 2.0 Enhance Order Book Analysis with Imbalance and Near-Depth Calculations
  - [x] 2.1 Update `OrderBookAnalysis` interface in `orderBookAnalyzer.ts` to add:
    - `imbalance: number` - (Σ top-10 bids - Σ top-10 asks) / Σ total
    - `totalBidVolume: number` - sum of all bid volumes in top 10
    - `totalAskVolume: number` - sum of all ask volumes in top 10
    - `depthBidsNear: number` - total bid volume within ±0.5% of mid
    - `depthAsksNear: number` - total ask volume within ±0.5% of mid
    - `depthRatio: number` - depthBidsNear / depthAsksNear
  - [x] 2.2 Implement `calculateImbalance()` helper function
    - Sum top 10 bid volumes
    - Sum top 10 ask volumes
    - Calculate imbalance: `(bidVolume - askVolume) / (bidVolume + askVolume)`
    - Return imbalance as decimal (e.g., 0.15 = 15% bid-heavy)
  - [x] 2.3 Implement `calculateNearDepth()` helper function
    - Accept parsed bids, asks, and mid price
    - Calculate ±0.5% range from mid price
    - Sum bid volumes where price >= (mid * 0.995)
    - Sum ask volumes where price <= (mid * 1.005)
    - Return `{ depthBidsNear, depthAsksNear, depthRatio }`
  - [x] 2.4 Update `analyzeOrderBook()` function to call new helpers and populate new fields
  - [x] 2.5 Update `buildSummary()` to include imbalance and near-depth in summary text
    - Example format: `Imbalance: +15% (bid-heavy) | Near-depth ratio: 1.3 (bids stronger within 0.5%)`
  - [x] 2.6 Update `formatLevels()` to only return top 5 levels instead of all levels (change slice or loop)

- [x] 3.0 Create Unified Prompt Builder System
  - [x] 3.1 Create directory `trade-wars/src/lib/prompts/` if it doesn't exist
  - [x] 3.2 Create file `trade-wars/src/lib/prompts/tradingPromptBuilder.ts`
  - [x] 3.3 Import necessary types: `MarketIntelligence` from trading agents, `Balance` from trading types
  - [x] 3.4 Define `PromptConfig` interface:
    ```typescript
    export interface PromptConfig {
      tone: 'cautious' | 'balanced' | 'aggressive';
      maxPositionPct: number;      // 0.20 = 20%
      minOrderUSD: number;          // 10
      decisionInterval: string;     // "4 hours"
      dailyOrderCap: number;        // 2
    }
    ```
  - [x] 3.5 Implement `buildSystemPrompt(config: PromptConfig): string` function
    - Add agent role based on config.tone:
      - `cautious`: "You are a medium-term swing trader operating spot-only. Your philosophy: few, high-quality trades. HOLD is the default action when signals don't align."
      - `balanced`: "You are a systematic trader balancing momentum opportunities with risk management."
      - `aggressive`: "You are a momentum-focused trader capitalizing on volatility while respecting risk controls."
    - Add risk parameters section (max position %, min order, daily cap)
    - Add guardrails section:
      - "If ATR% > 2.5 AND RVOL < 1.2 → HOLD (skip new entries in extreme volatility with low participation)"
      - "Trend entries require ADX ≥ 25 (confirmed trend strength)"
      - "Breakouts require RVOL ≥ 1.3 AND order book imbalance ≥ 0.2 in direction"
      - "Mean-reversion only when ADX < 20 (ranging market) AND far from VWAP (≥1 ATR)"
    - Add decision guidelines requiring ≥2 aligned signals for BUY/SELL
    - Add position sizing tiers:
      - "10% of portfolio: weak signal (exactly 2 indicators aligned)"
      - "15% of portfolio: good signal (3 indicators aligned)"
      - "20% of portfolio: strong signal (4+ indicators aligned, maximum cap)"
    - Add invalidation reasoning guidance:
      - "Consider position invalidated if price moves >1.5 ATR against entry"
      - "Exit thesis weakens if ADX drops below 20 after a trend entry, or if MACD crosses below signal with declining histogram"
  - [x] 3.6 Implement `buildUserPrompt(marketData: MarketIntelligence, config: PromptConfig, dailyOrdersToday: number): string` function
    - Calculate portfolio metrics (USDT, BTC, total value, max buy/sell amounts)
    - Add PORTFOLIO & LIMITS section with eligibility gates (✓ OK or ❌ BELOW MINIMUM)
    - Add daily order cap warning: `Trades today: ${dailyOrdersToday}/${config.dailyOrderCap}`
    - Add MARKET DATA section (current price, 24h stats, 72h range calculated from klines)
    - Add TRADE HISTORY section (last 10 trades with P&L using existing formatter)
    - Add TECHNICAL INDICATORS section (existing indicators + derived signals line)
    - Add ORDER BOOK section (imbalance, near-depth, top 5 bids/asks)
    - Add MARKET NEWS section if available (thesis, keyDrivers, formatted text)
    - Add ACTION REQUEST section requesting BUY/SELL/HOLD decision with reasoning
  - [x] 3.7 Implement main export function:
    ```typescript
    export function buildTradingPrompt(
      marketData: MarketIntelligence,
      config: PromptConfig,
      dailyOrdersToday: number
    ): { systemPrompt: string; userPrompt: string }
    ```
    - Calls buildSystemPrompt(config)
    - Calls buildUserPrompt(marketData, config, dailyOrdersToday)
    - Returns both prompts

- [ ] 4.0 Implement File-Based Daily Order Cap System
  - [ ] 4.1 Create file `trade-wars/src/lib/utils/dailyOrderCap.ts`
  - [ ] 4.2 Import `fs` and `path` modules for file operations
  - [ ] 4.3 Define file path constant: `const DAILY_CAP_FILE = path.join(process.cwd(), 'trade-wars', 'data', 'daily-order-cap.json')`
  - [ ] 4.4 Define interface:
    ```typescript
    interface DailyOrderCapData {
      date: string; // ISO date string YYYY-MM-DD
      count: number;
    }
    ```
  - [ ] 4.5 Implement `readDailyOrderCap(): DailyOrderCapData` function
    - Try to read file, if doesn't exist return `{ date: getCurrentDate(), count: 0 }`
    - Parse JSON and return data
    - Handle errors gracefully (return default)
  - [ ] 4.6 Implement `writeDailyOrderCap(data: DailyOrderCapData): void` function
    - Ensure `data/` directory exists (create if not)
    - Write JSON to file with pretty formatting
    - Handle errors (log but don't throw)
  - [ ] 4.7 Implement `getCurrentDate(): string` helper that returns today's date in UTC as YYYY-MM-DD
  - [ ] 4.8 Implement main export `checkAndIncrementDailyOrderCap(dailyCap: number): { allowed: boolean; count: number; remaining: number }` function
    - Read current data
    - Check if date is today:
      - If yes: check if count < dailyCap
      - If no (past date): reset count to 0, update date
    - If allowed, increment count and write back to file
    - Return `{ allowed, count: newCount, remaining: dailyCap - newCount }`
  - [ ] 4.9 Export additional function `getDailyOrderCount(): number` for read-only access to current count

- [ ] 5.0 Enhance Exa Market Research with Thesis and Key Drivers
  - [ ] 5.1 Open `trade-wars/src/lib/exa/marketNews.ts` for editing
  - [ ] 5.2 Update `MarketNewsData` interface to add:
    - `thesis: string` (e.g., "Bullish on institutional inflows and technical breakout")
    - `keyDrivers: string` (e.g., "1. ETF approvals 2. Resistance at $96k 3. Weak macro sentiment")
  - [ ] 5.3 Locate the Exa search prompt in the file (likely in `fetchMarketResearch()` or similar function)
  - [ ] 5.4 Update the prompt to request:
    - "Provide an overall market thesis for Bitcoin: is the current outlook bullish, bearish, or neutral?"
    - "Identify 3-5 key drivers influencing Bitcoin's direction, with their impact (bullish/bearish/neutral)"
    - "Note any significant events (tariffs, regulations, institutional moves, major technical levels)"
    - "Summarize overall market sentiment"
  - [ ] 5.5 Update the response parsing logic to extract `thesis` and `keyDrivers` from Exa results
    - Parse LLM-generated summary into structured fields
    - Set `thesis` to the overall outlook summary
    - Set `keyDrivers` to a concise numbered list
  - [ ] 5.6 Update `formatted` string generation to include thesis and keyDrivers in human-readable format
  - [ ] 5.7 Verify file-based caching logic already exists (PRD mentions it does) - ensure timestamp check works for daily refresh

- [ ] 6.0 Update Trading Agents to Use Unified Prompts and Temperature 0.0
  - [ ] 6.1 Update OpenAI trading agent (`trade-wars/src/lib/openai/tradingAgent.ts`):
    - [ ] 6.1.1 Import `buildTradingPrompt` and `PromptConfig` from `@/lib/prompts/tradingPromptBuilder`
    - [ ] 6.1.2 Import `checkAndIncrementDailyOrderCap` from `@/lib/utils/dailyOrderCap`
    - [ ] 6.1.3 At start of `analyzeTradingOpportunity()`, add daily cap pre-check:
      - Call `checkAndIncrementDailyOrderCap(2)`
      - If not allowed, immediately return HOLD decision with reasoning: "Daily order limit reached (X/2). System enforces max 2 trades per 24h for risk control."
      - Skip LLM call entirely when capped
    - [ ] 6.1.4 Define `PromptConfig` object: `{ tone: 'cautious', maxPositionPct: 0.20, minOrderUSD: 10, decisionInterval: '4 hours', dailyOrderCap: 2 }`
    - [ ] 6.1.5 Replace existing systemPrompt and userPrompt construction with:
      ```typescript
      const { systemPrompt, userPrompt } = buildTradingPrompt(
        marketData,
        promptConfig,
        dailyOrdersCount
      );
      ```
    - [ ] 6.1.6 Add `temperature: 0.0` to `openai.responses.parse()` call
    - [ ] 6.1.7 Add comment: `// Temperature 0.0 ensures deterministic, repeatable decisions`
    - [ ] 6.1.8 Remove old prompt construction code (delete old systemPrompt and userPrompt string builders)
  - [ ] 6.2 Update Gemini trading agent (`trade-wars/src/lib/openrouter/tradingAgentGemini.ts`):
    - [ ] 6.2.1 Import `buildTradingPrompt` and `PromptConfig`
    - [ ] 6.2.2 Import `checkAndIncrementDailyOrderCap`
    - [ ] 6.2.3 Add daily cap pre-check (same as OpenAI)
    - [ ] 6.2.4 Define `PromptConfig` with `tone: 'cautious'` (or 'balanced' if you want different personality)
    - [ ] 6.2.5 Replace prompt construction with shared builder
    - [ ] 6.2.6 Add `temperature: 0.0` to `openrouter.chat.completions.create()` call
    - [ ] 6.2.7 Add temperature comment
    - [ ] 6.2.8 Remove old prompt code
  - [ ] 6.3 Update Grok trading agent (`trade-wars/src/lib/xai/tradingAgentGrok.ts`):
    - [ ] 6.3.1 Import `buildTradingPrompt` and `PromptConfig`
    - [ ] 6.3.2 Import `checkAndIncrementDailyOrderCap`
    - [ ] 6.3.3 Add daily cap pre-check (same as others)
    - [ ] 6.3.4 Define `PromptConfig` with `tone: 'aggressive'` (to maintain Grok's personality per PRD)
    - [ ] 6.3.5 Replace prompt construction with shared builder
    - [ ] 6.3.6 Add `temperature: 0.0` to `xai.chat.completions.create()` call
    - [ ] 6.3.7 Add temperature comment
    - [ ] 6.3.8 Remove old prompt code

- [ ] 7.0 Testing and Validation
  - [ ] 7.1 Test OpenAI agent produces valid decisions:
    - Make test API call with real/mock market data
    - Verify structured output (action, asset, quantity, reasoning)
    - Verify reasoning includes references to new signals (ATR, ADX, RVOL)
  - [ ] 7.2 Test Gemini agent produces valid decisions (same as 7.1)
  - [ ] 7.3 Test Grok agent produces valid decisions (same as 7.1)
  - [ ] 7.4 Test temperature 0.0 determinism:
    - Call same agent twice with identical market data
    - Verify both responses are identical (same action, quantity, reasoning)
  - [ ] 7.5 Test technical indicator calculations:
    - Verify ATR returns values and correct interpretation ("Normal" for ~1.5%)
    - Verify ADX returns values and correct interpretation ("Trending" for ≥25)
    - Verify RVOL returns correct ratio and interpretation
    - Verify VWAP distance calculation and farFromFairValue boolean
    - Verify derivedSignals string is formatted correctly
  - [ ] 7.6 Test order book enhancements:
    - Verify imbalance calculation (should be between -1 and 1)
    - Verify near-depth calculation (only sums within ±0.5%)
    - Verify top 5 levels displayed (not 10)
  - [ ] 7.7 Test daily order cap system:
    - Make 2 trades in a day → verify 3rd is blocked with HOLD
    - Check `data/daily-order-cap.json` file created with correct structure
    - Restart app → verify count persists
    - Change system date to tomorrow → verify count resets to 0
  - [ ] 7.8 Test Exa research enhancements:
    - Trigger Exa research manually
    - Verify `thesis` and `keyDrivers` fields are populated
    - Verify formatted output includes thesis and drivers
  - [ ] 7.9 Test guardrails in prompts:
    - Simulate high ATR% (>2.5) + low RVOL (<1.2) → expect HOLD
    - Simulate trend entry attempt with ADX <25 → expect HOLD or smaller size
    - Review agent reasoning to confirm guardrails are being respected
  - [ ] 7.10 Manual integration test:
    - Run full decision cycle with real Binance testnet data
    - Verify all new signals appear in agent reasoning
    - Verify position sizing follows 10%/15%/20% tiers based on signal alignment
    - Check console logs for token count (should be ~1200-1500)
  - [ ] 7.11 Code review checklist:
    - All files use consistent coding style
    - All new functions have clear JSDoc comments explaining purpose
    - No hardcoded values (use constants/config)
    - Error handling present for file operations and API calls
    - No breaking changes to existing API contracts

---

**Notes:**
- Tasks are ordered by dependency: indicators → order book → prompt builder → daily cap → Exa → agents → testing
- Each sub-task is atomic and can be completed independently within its parent task
- Focus on one parent task at a time for clarity
- Daily order cap pre-check should be added to all agents AFTER prompt builder is complete (Task 3)
- Testing (Task 7) should only begin after Tasks 1-6 are fully complete
