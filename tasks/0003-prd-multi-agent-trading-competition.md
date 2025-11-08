# PRD-0003: Multi-Agent Trading Competition System

**Status:** Draft
**Created:** 2025-10-15
**Author:** TradeWarriors Team
**Target Audience:** Junior Developer

---

## 1. Introduction/Overview

The Multi-Agent Trading Competition System enables TradeWarriors to run 4 independent AI trading agents (OpenAI, Grok, Gemini, and Council) simultaneously on Binance testnet, compare their trading performance in real-time, and determine which LLM makes the best trading decisions.

**Problem Statement:**
Currently, TradeWarriors supports single-agent trading with manual model selection. To scientifically compare LLM trading performance, we need a system where multiple agents trade independently with isolated capital, and their results are visualized in a competitive leaderboard format.

**Solution:**
Build a dashboard-centric UI that displays a leaderboard, multi-line performance chart, individual agent cards, and filterable trade history. Each agent operates with its own Binance testnet account (~$124K USDT starting capital) and makes independent trading decisions when manually triggered.

---

## 2. Goals

1. **Enable Multi-Agent Trading:** Allow 4 AI agents to trade independently using separate Binance testnet accounts
2. **Performance Comparison:** Provide clear visual comparison of agent performance through leaderboard rankings and charts
3. **Manual Control:** Support manual triggering of trading analysis for all agents (collectively or individually)
4. **Architecture Readiness:** Design APIs and data structures ready for future cron-based automation (Phase 3)
5. **Fair Comparison:** Ensure all agents receive identical market data at the same time for unbiased testing

---

## 3. User Stories

### Primary User Stories

**US-01: Compare Agent Performance**
As a TradeWarriors researcher, I want to see a ranked leaderboard of all 4 agents sorted by ROI%, so that I can quickly identify which LLM performs best at trading.

**US-02: Visualize Performance Over Time**
As a researcher, I want to see a multi-line chart showing all 4 agents' portfolio values over time, so that I can understand performance trends and volatility.

**US-03: Trigger All Agents Simultaneously**
As a researcher, I want to click "Trigger All Agents" to execute trading analysis for all 4 agents at once, so that they all receive the same market data for fair comparison.

**US-04: Trigger Individual Agents**
As a researcher, I want to trigger individual agents separately when testing or debugging specific models, so that I have granular control during development.

**US-05: View Agent-Specific Trade History**
As a researcher, I want to filter trade history by agent, so that I can analyze the decisions made by a specific LLM.

**US-06: Monitor Live Performance**
As a researcher, I want the dashboard to auto-refresh after triggering agents, so that I can see updated results without manually refreshing the page.

### Secondary User Stories

**US-07: Understand Agent Status**
As a researcher, I want to see each agent's current balance, ROI%, P&L, and trade count, so that I can assess their current state at a glance.

**US-08: Identify Failed Executions**
As a researcher, I want to see error messages when an agent fails to execute, so that I can debug issues without blocking other agents.

---

## 4. Functional Requirements

### Phase 2A: Code Refactoring & Agent Infrastructure

#### FR-01: Agent Configuration System
- **FR-01.1:** Create `/src/config/agents.ts` to centrally define all 4 agents
- **FR-01.2:** Each agent config must include:
  - `name` (string): 'openai' | 'grok' | 'gemini' | 'council'
  - `displayName` (string): Human-readable name (e.g., "OpenAI Agent")
  - `color` (string): UI color code - OpenAI=Black (#0A0B10), Grok=Orange (#FF8C42), Gemini=Blue (#2FD1FF), Council=Gold (#FFD700)
  - `binanceApiKey` (string): From environment variables
  - `binanceSecretKey` (string): From environment variables
  - `llmProvider` (string): 'openai' | 'xai' | 'google' | 'council'
  - `llmModel` (string): Model identifier (e.g., 'gpt-4o')
- **FR-01.3:** Export helper function `getAgentConfig(name: string): AgentConfig`
- **FR-01.4:** Export helper function `getAllAgents(): AgentConfig[]`

#### FR-02: Binance Client Updates
- **FR-02.1:** Modify `getBinanceClient()` in `src/lib/binance/orderExecution.ts` to accept optional `apiKey` and `secretKey` parameters
- **FR-02.2:** If keys are not provided, fall back to `BINANCE_OPENAI_API_KEY` for backward compatibility
- **FR-02.3:** Update all functions that call `getBinanceClient()` to support custom keys

#### FR-03: API Route Refactoring
- **FR-03.1:** Update `/api/trading-agent/route.ts` to use `BINANCE_OPENAI_API_KEY` and `BINANCE_OPENAI_SECRET_KEY`
- **FR-03.2:** Update `/api/trading-agent-grok/route.ts` to use `BINANCE_GROK_API_KEY` and `BINANCE_GROK_SECRET_KEY`
- **FR-03.3:** Update `/api/trading-agent-gemini/route.ts` to use `BINANCE_GEMINI_API_KEY` and `BINANCE_GEMINI_SECRET_KEY`
- **FR-03.4:** Update `/api/council-decision/route.ts` to use `BINANCE_COUNCIL_API_KEY` and `BINANCE_COUNCIL_SECRET_KEY`
- **FR-03.5:** Ensure all trading routes log trades with correct `aiModel` field

#### FR-04: Trade History Schema Validation
- **FR-04.1:** Verify `aiModel` field in `TradeRecord` type supports: 'openai' | 'grok' | 'gemini' | 'council'
- **FR-04.2:** Ensure all existing trade logging includes `aiModel` parameter

### Phase 2B: New API Endpoints

#### FR-05: Trading Cycle Endpoint
- **FR-05.1:** Create `POST /api/trading-cycle` endpoint to trigger all 4 agents
- **FR-05.2:** Fetch market data once and share across all agents
- **FR-05.3:** Execute agents in parallel using `Promise.all()`
- **FR-05.4:** If one agent fails, continue executing others (do not throw/block)
- **FR-05.5:** Return response with:
  ```typescript
  {
    success: boolean;
    timestamp: string;
    results: Array<{
      agent: string;
      success: boolean;
      decision?: TradingDecision;
      order?: OrderResult;
      error?: string;
    }>;
    marketSnapshot: { price, priceChange24h, etc. };
  }
  ```

#### FR-06: Leaderboard Endpoint
- **FR-06.1:** Create `GET /api/leaderboard` endpoint
- **FR-06.2:** For each agent, calculate:
  - Starting capital (from `agent-baselines.json`)
  - Current portfolio value (USDT + BTC/ADA holdings at current prices)
  - ROI % = `((current - starting) / starting) * 100`
  - Absolute P&L = `current - starting`
  - Total trades executed
- **FR-06.3:** Sort agents by ROI % (descending)
- **FR-06.4:** Assign ranks (1-4)
- **FR-06.5:** Return array of agent stats:
  ```typescript
  [
    {
      rank: 1,
      agent: 'openai',
      displayName: 'OpenAI Agent',
      color: '#0A0B10',
      roiPercent: 15.2,
      absolutePnL: 18850.45,
      currentValue: 142888.78,
      startingCapital: 124038.33,
      totalTrades: 12
    },
    // ... other agents
  ]
  ```

#### FR-07: Portfolio History Endpoint
- **FR-07.1:** Create `GET /api/portfolio-history` endpoint
- **FR-07.2:** For each agent, build time-series of portfolio values using trade history
- **FR-07.3:** Each data point includes:
  - `timestamp`: ISO string
  - `openai`: portfolio value at this timestamp
  - `grok`: portfolio value at this timestamp
  - `gemini`: portfolio value at this timestamp
  - `council`: portfolio value at this timestamp
- **FR-07.4:** Start all agents at their baseline capital ($124,038.33)
- **FR-07.5:** Calculate portfolio value after each trade by summing USDT balance + (crypto holdings × current prices)
- **FR-07.6:** Return array suitable for charting:
  ```typescript
  [
    { timestamp: "2025-10-15T10:00:00Z", openai: 124038.33, grok: 124038.33, ... },
    { timestamp: "2025-10-15T16:00:00Z", openai: 126500.12, grok: 123800.45, ... },
    // ... more data points per trade
  ]
  ```

#### FR-08: Agent Stats Endpoint
- **FR-08.1:** Create `GET /api/agent/[name]/stats` endpoint
- **FR-08.2:** Accept agent name as URL parameter: 'openai' | 'grok' | 'gemini' | 'council'
- **FR-08.3:** Return detailed stats for single agent:
  - Current balances (USDT, BTC, ADA)
  - ROI %, absolute P&L
  - Starting capital
  - Total trades
  - Last trade timestamp
  - Current rank (compared to other agents)

#### FR-09: Agent Trades Endpoint
- **FR-09.1:** Create `GET /api/agent/[name]/trades` endpoint
- **FR-09.2:** Accept query parameter `limit` (default: 10)
- **FR-09.3:** Filter trade history by agent name
- **FR-09.4:** Return last N trades for that agent, sorted by timestamp (desc)
- **FR-09.5:** Each trade includes:
  - `id`, `timestamp`, `action`, `asset`, `quantity`, `price`
  - `portfolioValueBefore`, `portfolioValueAfter`
  - `pnl` = `portfolioValueAfter - portfolioValueBefore`
  - `success`, `error` (if any)

### Phase 2C: UI Components

#### FR-10: Leaderboard Table Component
- **FR-10.1:** Create `<LeaderboardTable>` component
- **FR-10.2:** Display columns: Rank, Agent Name (with color dot), ROI %, P&L ($), Current Value ($), # Trades
- **FR-10.3:** Sort by rank (ascending)
- **FR-10.4:** Apply agent color to agent name or row accent
- **FR-10.5:** Format numbers: ROI with +/- sign and % symbol, currency with $ and 2 decimals
- **FR-10.6:** Highlight rank #1 with subtle visual emphasis

#### FR-11: Portfolio Performance Chart Component
- **FR-11.1:** Create `<PortfolioChart>` component using existing chart library
- **FR-11.2:** Render 4 lines, one per agent, color-coded:
  - OpenAI: Black (#0A0B10)
  - Grok: Orange (#FF8C42)
  - Gemini: Blue (#2FD1FF)
  - Council: Gold (#FFD700)
- **FR-11.3:** X-axis: Timestamp (per trade event)
- **FR-11.4:** Y-axis: Portfolio Value in USDT (absolute dollars)
- **FR-11.5:** Show legend with agent names and colors
- **FR-11.6:** Tooltip on hover showing exact values for all agents at that timestamp
- **FR-11.7:** All lines start at $124,038.33 (baseline)

#### FR-12: Agent Card Component
- **FR-12.1:** Create `<AgentCard>` component accepting `agentName` prop
- **FR-12.2:** Display:
  - Agent display name
  - Color accent bar/badge
  - Current portfolio value
  - ROI % (with +/- and color: green if positive, red if negative)
  - Absolute P&L
  - Total trades count
- **FR-12.3:** Include "Trigger [Agent Name]" button
- **FR-12.4:** Button triggers `POST /api/trading-agent[-suffix]` for that agent
- **FR-12.5:** Show loading spinner while agent is executing
- **FR-12.6:** Display success/error message after execution

#### FR-13: Trade History Table Component
- **FR-13.1:** Create `<TradeHistoryTable>` component
- **FR-13.2:** Accept `agentFilter?: string` prop (optional)
- **FR-13.3:** Display columns: Timestamp, Agent (with color dot), Action, Asset, Quantity, Price, P&L
- **FR-13.4:** If `agentFilter` provided, only show trades for that agent
- **FR-13.5:** If no filter, show all trades with agent identification
- **FR-13.6:** Limit to last 10 trades (or accept `limit` prop)
- **FR-13.7:** Format timestamp as human-readable (e.g., "Oct 15, 3:42 PM")
- **FR-13.8:** Color-code P&L: green if positive, red if negative

### Phase 2D: Main Dashboard Page

#### FR-14: Leaderboard Dashboard Page
- **FR-14.1:** Create or update `/leaderboard` page route
- **FR-14.2:** Page structure (top to bottom):
  1. **Hero Section:**
     - Page title: "TradeWarriors Leaderboard"
     - "Trigger All Agents" button (primary CTA)
     - Loading state when all agents are executing
  2. **Leaderboard + Chart Section:**
     - `<LeaderboardTable>` (full width)
     - `<PortfolioChart>` below leaderboard
  3. **Agent Cards Section:**
     - Grid layout: 4 cards (2×2 on desktop)
     - `<AgentCard>` for each agent (OpenAI, Grok, Gemini, Council)
  4. **Trade History Section:**
     - Section title: "Recent Trades"
     - Agent filter dropdown/tabs: [All Agents | OpenAI | Grok | Gemini | Council]
     - `<TradeHistoryTable>` with selected filter applied
- **FR-14.3:** Auto-refresh page data every 10 seconds (or reuse existing refresh mechanism)
- **FR-14.4:** Use existing Trade Wars theme (colors, fonts: Orbitron, Inter, Roboto Mono)

#### FR-15: Trigger All Agents Functionality
- **FR-15.1:** "Trigger All Agents" button calls `POST /api/trading-cycle`
- **FR-15.2:** Show loading overlay/spinner on entire dashboard while executing
- **FR-15.3:** Display execution results:
  - Success message: "All agents executed successfully"
  - Partial success: "X/4 agents executed successfully" with error details for failed agents
  - Full failure: "All agents failed to execute" with error details
- **FR-15.4:** After execution completes, automatically refresh leaderboard, chart, and agent cards
- **FR-15.5:** Scroll to top after execution to show updated leaderboard

#### FR-16: Error Handling & User Feedback
- **FR-16.1:** If an API call fails, display toast notification with error message
- **FR-16.2:** If agent execution fails, show error in agent card (do not hide card)
- **FR-16.3:** If leaderboard/chart data fails to load, show friendly error state: "Unable to load data. Please refresh."
- **FR-16.4:** Log all errors to console for debugging

---

## 5. Non-Goals (Out of Scope)

This feature explicitly **does not** include:

- **NG-01:** Automated cron/scheduled execution (Phase 3)
- **NG-02:** User authentication or multi-user support
- **NG-03:** Historical backtesting features
- **NG-04:** Agent customization (changing prompts, models, or strategies via UI)
- **NG-05:** Real money trading (testnet only)
- **NG-06:** Win rate percentage metric (not applicable for spot trading)
- **NG-07:** Mobile-responsive design (desktop-first; mobile graceful degradation acceptable)
- **NG-08:** Agent reasoning/explanation display in UI (reasoning not shown to keep UI clean)
- **NG-09:** Individual agent detail pages (`/agent/[name]`) - everything on main dashboard
- **NG-10:** Trade history retention policies (store all trades indefinitely for now)

---

## 6. Design Considerations

### Color Specifications
Use the following colors for agent identification across all UI components:

| Agent | Color Name | Hex Code | Usage |
|-------|-----------|----------|-------|
| OpenAI | Black | `#0A0B10` | Line chart, card accents, dots |
| Grok | Orange | `#FF8C42` | Line chart, card accents, dots |
| Gemini | Blue | `#2FD1FF` | Line chart, card accents, dots |
| Council | Gold | `#FFD700` | Line chart, card accents, dots |

### Theme Consistency
- Follow existing Trade Wars design system:
  - **Background:** Deep Space (#0A0B10)
  - **Accents:** Hyperspace Blue (#2FD1FF), Saber Purple (#8A5CFF)
  - **Positive/Gains:** Holo Green (#3DFFB8)
  - **Negative/Losses:** Nova Red (#FF4D6D)
  - **Muted Text:** Droid Silver (#B7C0CE)
- **Typography:**
  - Headers: Orbitron
  - Body/UI: Inter
  - Numbers: Roboto Mono

### Layout Guidelines
- **Dashboard width:** Max-width container (e.g., 1400px) centered
- **Leaderboard:** Full-width table, responsive to container
- **Chart height:** ~400px, responsive width
- **Agent cards:** Grid with equal heights, gap spacing
- **Spacing:** Use consistent spacing scale (e.g., Tailwind's spacing utilities)

### Responsive Behavior
- **Desktop (1024px+):** Full layout as described
- **Tablet (768px-1023px):** 2-column agent card grid, maintain other layouts
- **Mobile (<768px):** Graceful degradation (functionality maintained, may require horizontal scroll for tables)

---

## 7. Technical Considerations

### Technology Stack
- **Framework:** Next.js 15.5 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Charts:** Use existing chart library in the project (or add lightweight option like Recharts)
- **API Integration:** Binance testnet via `@binance/connector`
- **LLM APIs:** OpenAI, Grok (xAI), Gemini (Google)

### Data Storage
- **Trade History:** JSON file at `data/trade-history.json` (existing)
- **Agent Baselines:** JSON file at `data/agent-baselines.json` (created in Phase 1)
- **No database migration needed** for MVP

### Environment Variables
Ensure `.env` contains:
```
BINANCE_OPENAI_API_KEY=...
BINANCE_OPENAI_SECRET_KEY=...
BINANCE_GROK_API_KEY=...
BINANCE_GROK_SECRET_KEY=...
BINANCE_GEMINI_API_KEY=...
BINANCE_GEMINI_SECRET_KEY=...
BINANCE_COUNCIL_API_KEY=...
BINANCE_COUNCIL_SECRET_KEY=...
```

### Performance Considerations
- **Parallel Execution:** Use `Promise.all()` for triggering all agents to minimize total execution time
- **Caching:** Market data can be cached/shared across agents during single execution cycle
- **Chart Rendering:** Limit chart data points if trade history grows very large (e.g., sample every Nth trade if >1000 trades)

### Error Resilience
- If one agent's Binance API call fails, others should complete
- If trade logging fails, don't block the UI response (log error)
- If leaderboard calculation fails for one agent, show partial data for others

### Future-Proofing for Automation
- Design all APIs to accept `agentName` or operate on all agents
- Ensure no UI-specific logic in API routes (can be called by cron)
- Structure logging/reporting to support scheduled runs

---

## 8. Success Metrics

The feature will be considered successful when:

1. **SM-01: Independent Trading**
   - All 4 agents can execute trades independently without interference
   - Each agent maintains separate portfolio balance (~$124K USDT starting capital)
   - Trade history correctly attributes decisions to the correct agent

2. **SM-02: Performance Visualization**
   - Leaderboard accurately ranks agents by ROI%
   - Chart displays 4 distinct lines with correct portfolio values
   - User can visually identify best/worst performing agent at a glance

3. **SM-03: Manual Control**
   - "Trigger All Agents" executes all 4 agents within reasonable time (~60 seconds)
   - Individual agent triggers work correctly
   - Loading states provide clear feedback during execution

4. **SM-04: Data Accuracy**
   - ROI%, P&L, and portfolio values calculated correctly
   - Trade history filtered by agent shows only that agent's trades
   - Chart data points align with actual trade timestamps and values

5. **SM-05: Robustness**
   - System handles agent execution failures gracefully (continue other agents)
   - Auto-refresh keeps data current without manual page refresh
   - No crashes or blocking errors during multi-agent execution

---

## 9. Testing Requirements

### Functional Testing Checklist

**Before Launch:**

- [ ] **Test Agent Configuration**
  - Verify all 4 agent configs load correctly from `agents.ts`
  - Check Binance API keys resolve from environment variables
  - Confirm agent colors display correctly in UI

- [ ] **Test API Endpoints**
  - `POST /api/trading-cycle`: Returns results for all 4 agents
  - `GET /api/leaderboard`: Returns correct rankings and stats
  - `GET /api/portfolio-history`: Returns valid time-series data
  - `GET /api/agent/[name]/stats`: Returns stats for each agent individually
  - `GET /api/agent/[name]/trades`: Returns filtered trade history

- [ ] **Test Leaderboard**
  - Rankings are correct based on ROI%
  - ROI%, P&L, and current values match expected calculations
  - Agent colors display correctly

- [ ] **Test Chart**
  - 4 lines render with correct colors
  - Lines start at $124,038.33 baseline
  - Tooltip shows accurate values on hover
  - X-axis shows timestamps correctly

- [ ] **Test Agent Cards**
  - All 4 cards display correct data
  - "Trigger Agent" buttons work individually
  - Loading states appear during execution
  - Success/error messages display after execution

- [ ] **Test Trade History**
  - Shows last 10 trades by default
  - Agent filter correctly filters trades
  - P&L color-coding works (green/red)
  - Timestamps format correctly

- [ ] **Test Trigger All Agents**
  - Button triggers all 4 agents simultaneously
  - Loading overlay appears during execution
  - Results display correctly after completion
  - Dashboard auto-refreshes with new data

- [ ] **Test Error Handling**
  - If one agent fails, others continue executing
  - Error messages display for failed agents
  - Failed agents show error state in UI (not hidden)

- [ ] **Test Auto-Refresh**
  - Page data refreshes automatically (10 sec interval)
  - No performance issues from frequent refreshes

- [ ] **Test Responsive Design**
  - Dashboard looks good on desktop (1920px, 1440px, 1024px)
  - Agent cards adapt to 2-column grid on smaller screens
  - Tables remain functional (horizontal scroll acceptable if needed)

---

## 10. Open Questions

**OQ-01: Chart Library Selection**
Which charting library should be used? Options: Recharts (existing in project?), Chart.js, Tremor, Nivo. Recommendation: Use what's already in the project to minimize dependencies.

**OQ-02: Auto-Refresh Interval**
Confirm auto-refresh interval (suggested: 10 seconds). Should this be configurable or hard-coded?

**OQ-03: Trade History Pagination**
For now, showing last 10 trades. Should we implement pagination/load-more if trade history grows large (>100 trades)?

**OQ-04: Agent Execution Timeout**
Should there be a timeout for agent execution? (e.g., if an agent takes >60 seconds, abort and show error)

**OQ-05: Historical Data Start Point**
Should the chart show only trades after the multi-agent system was initialized (Phase 1), or include historical trades from before? Recommendation: Start from Phase 1 baseline (Oct 15, 2025).

---

## Appendix A: File Structure

```
trade-wars/
├── src/
│   ├── config/
│   │   └── agents.ts                    # [NEW] Agent configuration
│   ├── lib/
│   │   ├── binance/
│   │   │   └── orderExecution.ts        # [MODIFIED] Accept custom keys
│   │   ├── agents/
│   │   │   ├── agentStats.ts            # [NEW] Performance calculations
│   │   │   └── portfolioHistory.ts      # [NEW] Time-series builder
│   │   └── storage/
│   │       └── tradeHistory.ts          # [EXISTING] Already supports aiModel
│   ├── app/
│   │   ├── leaderboard/
│   │   │   └── page.tsx                 # [NEW] Main dashboard page
│   │   ├── api/
│   │   │   ├── trading-cycle/
│   │   │   │   └── route.ts             # [NEW] Trigger all agents
│   │   │   ├── leaderboard/
│   │   │   │   └── route.ts             # [NEW] Get rankings
│   │   │   ├── portfolio-history/
│   │   │   │   └── route.ts             # [NEW] Get chart data
│   │   │   ├── agent/
│   │   │   │   └── [name]/
│   │   │   │       ├── stats/
│   │   │   │       │   └── route.ts     # [NEW] Agent stats
│   │   │   │       └── trades/
│   │   │   │           └── route.ts     # [NEW] Agent trades
│   │   │   ├── trading-agent/
│   │   │   │   └── route.ts             # [MODIFIED] Use OpenAI keys
│   │   │   ├── trading-agent-grok/
│   │   │   │   └── route.ts             # [MODIFIED] Use Grok keys
│   │   │   ├── trading-agent-gemini/
│   │   │   │   └── route.ts             # [MODIFIED] Use Gemini keys
│   │   │   └── council-decision/
│   │   │       └── route.ts             # [MODIFIED] Use Council keys
│   │   └── components/
│   │       ├── LeaderboardTable.tsx     # [NEW] Leaderboard component
│   │       ├── PortfolioChart.tsx       # [NEW] Multi-line chart
│   │       ├── AgentCard.tsx            # [NEW] Agent card
│   │       └── TradeHistoryTable.tsx    # [NEW] Trade history
│   └── types/
│       └── trading.ts                   # [EXISTING] Types already support aiModel
├── data/
│   ├── agent-baselines.json             # [EXISTING] Created in Phase 1
│   └── trade-history.json               # [EXISTING] Trade history
├── scripts/
│   ├── check-agents.ts                  # [EXISTING] Verify agent balances
│   └── liquidate-agents.ts              # [EXISTING] Liquidation script
└── .env                                 # [EXISTING] Agent API keys
```

---

## Appendix B: API Response Schemas

### POST /api/trading-cycle

**Request:** None (POST with no body)

**Response:**
```typescript
{
  success: boolean;
  timestamp: string; // ISO 8601
  results: Array<{
    agent: 'openai' | 'grok' | 'gemini' | 'council';
    success: boolean;
    decision?: {
      action: 'BUY' | 'SELL' | 'HOLD';
      asset: string;
      quantity: number;
      reasoning: string;
    };
    order?: {
      orderId: string;
      symbol: string;
      side: string;
      price: number;
      quantity: number;
      status: string;
    };
    error?: string;
  }>;
  marketSnapshot: {
    price: number;
    priceChange24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
  };
}
```

### GET /api/leaderboard

**Response:**
```typescript
[
  {
    rank: number;                 // 1-4
    agent: string;                // 'openai', 'grok', 'gemini', 'council'
    displayName: string;          // 'OpenAI Agent'
    color: string;                // '#0A0B10'
    roiPercent: number;           // 15.2
    absolutePnL: number;          // 18850.45
    currentValue: number;         // 142888.78
    startingCapital: number;      // 124038.33
    totalTrades: number;          // 12
  },
  // ... other agents
]
```

### GET /api/portfolio-history

**Response:**
```typescript
[
  {
    timestamp: string;            // ISO 8601
    openai: number;               // Portfolio value in USDT
    grok: number;
    gemini: number;
    council: number;
  },
  // ... more data points
]
```

### GET /api/agent/[name]/stats

**Response:**
```typescript
{
  agent: string;
  displayName: string;
  color: string;
  balances: {
    usdt: number;
    btc: number;
    ada: number;
  };
  performance: {
    currentValue: number;
    startingCapital: number;
    roiPercent: number;
    absolutePnL: number;
  };
  trading: {
    totalTrades: number;
    lastTradeTime: string | null;
  };
  ranking: {
    currentRank: number;
    totalAgents: 4;
  };
}
```

### GET /api/agent/[name]/trades?limit=10

**Response:**
```typescript
[
  {
    id: string;
    timestamp: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    asset: string;
    quantity: number;
    price: number;
    portfolioValueBefore: number;
    portfolioValueAfter: number;
    pnl: number;
    success: boolean;
    error?: string;
  },
  // ... more trades
]
```

---

## End of PRD

**Next Steps:**
1. Review PRD with stakeholders
2. Estimate implementation time (suggested: 3-5 days)
3. Begin implementation starting with Phase 2A (refactoring)
4. Test thoroughly using the functional testing checklist
5. Deploy to production (testnet environment)

**Questions?** Contact the TradeWarriors team for clarification on any requirements.
