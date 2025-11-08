# Task List: Multi-Agent Trading Competition System

**PRD Reference:** `0003-prd-multi-agent-trading-competition.md`
**Created:** 2025-10-15

---

## Current State Assessment

**Existing Infrastructure:**
- ✅ Recharts library installed (v3.2.1) for charting
- ✅ TradeHistory component with aiModel support
- ✅ PortfolioChart component using AreaChart
- ✅ Trade history API endpoint at `/api/trade-history`
- ✅ Individual agent API routes: `/api/trading-agent`, `/api/trading-agent-grok`, `/api/trading-agent-gemini`, `/api/council-decision`
- ✅ Agent baselines stored in `data/agent-baselines.json`
- ✅ Auto-refresh pattern (30s intervals with setInterval)
- ✅ TypeScript types with aiModel field support

**Patterns to Follow:**
- Use 'use client' directive for interactive components
- useState + useEffect for data fetching
- setInterval for auto-refresh
- Consistent error/loading state handling
- Tailwind CSS for styling
- fetch API for backend calls

---

## Relevant Files

### New Files to Create
- ✅ `src/config/agents.ts` - Central agent configuration with colors, keys, models
- ✅ `src/lib/agents/agentStats.ts` - Performance calculation utilities
- ✅ `src/lib/agents/portfolioHistory.ts` - Time-series data builder for charts
- ✅ `src/app/api/trading-cycle/route.ts` - Trigger all 4 agents simultaneously
- ✅ `src/app/api/leaderboard/route.ts` - Get leaderboard rankings
- ✅ `src/app/api/portfolio-history/route.ts` - Get chart time-series data
- ✅ `src/app/api/agent/[name]/stats/route.ts` - Individual agent stats
- ✅ `src/app/api/agent/[name]/trades/route.ts` - Individual agent trade history
- ✅ `src/app/leaderboard/page.tsx` - Main dashboard page
- ✅ `src/app/components/LeaderboardTable.tsx` - Leaderboard table component
- ✅ `src/app/components/MultiAgentChart.tsx` - 4-line portfolio chart component
- ✅ `src/app/components/AgentCard.tsx` - Individual agent card component
- ✅ `src/app/components/MultiAgentTradeHistory.tsx` - Trade history with agent filter

### Files to Modify
- ✅ `src/lib/binance/orderExecution.ts` - Add optional apiKey/secretKey parameters to getBinanceClient()
- ✅ `src/app/api/trading-agent/route.ts` - Use BINANCE_OPENAI_API_KEY/SECRET_KEY
- ✅ `src/app/api/trading-agent-grok/route.ts` - Use BINANCE_GROK_API_KEY/SECRET_KEY
- ✅ `src/app/api/trading-agent-gemini/route.ts` - Use BINANCE_GEMINI_API_KEY/SECRET_KEY
- ✅ `src/app/api/council-decision/route.ts` - Use BINANCE_COUNCIL_API_KEY/SECRET_KEY
- ✅ `src/types/trading.ts` - Verify aiModel union type includes 'council'

### Existing Files (Reference Only)
- `src/app/components/TradeHistory.tsx` - Reference for trade display patterns
- `src/app/components/PortfolioChart.tsx` - Reference for Recharts usage
- `src/lib/storage/tradeHistory.ts` - Already supports aiModel field
- `data/agent-baselines.json` - Starting capital data
- `data/trade-history.json` - Trade records

---

## Tasks

- [x] 1.0 Phase 2A: Agent Infrastructure & Refactoring
  - [x] 1.1 Create `src/config/agents.ts` with AgentConfig interface and agent definitions
    - Define AgentConfig type with fields: name, displayName, color, binanceApiKey, binanceSecretKey, llmProvider, llmModel
    - Create array of 4 agents: OpenAI (Black #0A0B10), Grok (Orange #FF8C42), Gemini (Blue #2FD1FF), Council (Gold #FFD700)
    - Read API keys from environment variables (BINANCE_OPENAI_API_KEY, etc.)
    - Export `getAgentConfig(name: string): AgentConfig | undefined` helper
    - Export `getAllAgents(): AgentConfig[]` helper
  - [x] 1.2 Update `src/lib/binance/orderExecution.ts` to accept custom Binance keys
    - Modify `getBinanceClient()` function signature to accept optional `apiKey?: string` and `secretKey?: string` parameters
    - If keys provided, use them; otherwise fall back to `process.env.BINANCE_OPENAI_API_KEY` for backward compatibility
    - Update all functions that call `getBinanceClient()` to support passing custom keys through the call chain
  - [x] 1.3 Update `src/app/api/trading-agent/route.ts` to use OpenAI-specific keys
    - Change hardcoded env vars to use `BINANCE_OPENAI_API_KEY` and `BINANCE_OPENAI_SECRET_KEY`
    - Import `getAgentConfig` from agents config
    - Pass agent-specific keys to Binance client initialization
    - Ensure `aiModel: 'openai'` is passed to `logTrade()`
  - [x] 1.4 Update `src/app/api/trading-agent-grok/route.ts` to use Grok-specific keys
    - Change to use `BINANCE_GROK_API_KEY` and `BINANCE_GROK_SECRET_KEY`
    - Pass agent-specific keys to Binance client
    - Ensure `aiModel: 'grok'` is logged
  - [x] 1.5 Update `src/app/api/trading-agent-gemini/route.ts` to use Gemini-specific keys
    - Change to use `BINANCE_GEMINI_API_KEY` and `BINANCE_GEMINI_SECRET_KEY`
    - Pass agent-specific keys to Binance client
    - Ensure `aiModel: 'gemini'` is logged
  - [x] 1.6 Update `src/app/api/council-decision/route.ts` to use Council-specific keys
    - Change to use `BINANCE_COUNCIL_API_KEY` and `BINANCE_COUNCIL_SECRET_KEY`
    - Pass agent-specific keys to Binance client
    - Ensure `aiModel: 'council'` is logged
  - [x] 1.7 Verify `src/types/trading.ts` TradeRecord.aiModel supports all 4 agents
    - Check that aiModel union type includes: 'openai' | 'grok' | 'gemini' | 'council'
    - Update if missing 'council'

- [x] 2.0 Phase 2B: New API Endpoints
  - [x] 2.1 Create `src/lib/agents/agentStats.ts` utility library
    - Export `getAgentBaselines()` function to read `data/agent-baselines.json`
    - Export `calculateCurrentPortfolioValue(balances, currentPrices)` function
    - Export `calculateAgentStats(agentName)` function returning: startingCapital, currentValue, roiPercent, absolutePnL, totalTrades
    - Use existing Binance client to fetch balances and market prices
    - Use existing trade history functions to count trades
  - [x] 2.2 Create `src/lib/agents/portfolioHistory.ts` utility library
    - Export `buildPortfolioTimeSeries()` function
    - Read all trades from trade history
    - Group trades by timestamp
    - For each timestamp, calculate portfolio value for all 4 agents
    - Return array of objects: `{ timestamp, openai, grok, gemini, council }`
    - Start all agents at their baseline capital ($124,038.33)
  - [x] 2.3 Create `src/app/api/trading-cycle/route.ts` endpoint
    - Create POST handler
    - Fetch market intelligence once (call `/api/market-intelligence` internally or reuse logic)
    - Import all 4 agent API route handlers or call them via HTTP
    - Execute agents in parallel using `Promise.allSettled()` to continue even if one fails
    - Collect results for all agents
    - Return response with success status, results array, and marketSnapshot
    - Follow response schema from PRD Appendix B
  - [x] 2.4 Create `src/app/api/leaderboard/route.ts` endpoint
    - Create GET handler
    - Import `calculateAgentStats` from agentStats utility
    - For each of 4 agents, calculate: rank, roiPercent, absolutePnL, currentValue, startingCapital, totalTrades
    - Import agent colors from agents config
    - Sort by roiPercent descending
    - Assign ranks 1-4
    - Return array following schema from PRD Appendix B
  - [x] 2.5 Create `src/app/api/portfolio-history/route.ts` endpoint
    - Create GET handler
    - Import `buildPortfolioTimeSeries()` from portfolioHistory utility
    - Call function to get time-series data
    - Return array of data points following schema from PRD Appendix B
  - [x] 2.6 Create `src/app/api/agent/[name]/stats/route.ts` endpoint
    - Create GET handler accepting dynamic route parameter `[name]`
    - Validate agent name is one of: 'openai', 'grok', 'gemini', 'council'
    - Import `calculateAgentStats` and `getAgentConfig`
    - Fetch agent's current balances from Binance using agent-specific keys
    - Calculate performance metrics
    - Get current rank by comparing with other agents
    - Return stats object following schema from PRD Appendix B
  - [x] 2.7 Create `src/app/api/agent/[name]/trades/route.ts` endpoint
    - Create GET handler accepting dynamic route parameter `[name]`
    - Accept query parameter `limit` (default: 10)
    - Import `readTradeHistory` from storage
    - Filter trades where `aiModel === agentName`
    - Sort by timestamp descending
    - Limit to N trades
    - Calculate P&L for each trade (portfolioValueAfter - portfolioValueBefore)
    - Return trades array following schema from PRD Appendix B

- [x] 3.0 Phase 2C: UI Components
  - [x] 3.1 Create `src/app/components/LeaderboardTable.tsx` component
    - Add 'use client' directive
    - Create TypeScript interface for leaderboard entry (rank, agent, displayName, color, roiPercent, absolutePnL, currentValue, totalTrades)
    - Accept `data: LeaderboardEntry[]` prop
    - Render table with columns: Rank, Agent Name (with colored dot), ROI %, P&L, Current Value, # Trades
    - Format ROI with +/- sign and % symbol
    - Format currency with $ and 2 decimals using toFixed(2)
    - Apply agent color to row accent or dot using inline style
    - Highlight rank #1 with subtle background or border
    - Use Tailwind CSS classes matching existing component styles
  - [x] 3.2 Create `src/app/components/MultiAgentChart.tsx` component
    - Add 'use client' directive
    - Import Recharts: LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
    - Accept `data: Array<{ timestamp, openai, grok, gemini, council }>` prop
    - Render LineChart with 4 lines, one per agent
    - Apply colors: OpenAI (#0A0B10), Grok (#FF8C42), Gemini (#2FD1FF), Council (#FFD700)
    - X-axis: formatted timestamp
    - Y-axis: portfolio value in USDT with dollar formatter
    - Custom tooltip showing all 4 agent values at hovered timestamp
    - Legend showing agent names with color indicators
    - Height ~400px, responsive width
  - [x] 3.3 Create `src/app/components/AgentCard.tsx` component
    - Add 'use client' directive
    - Accept props: `agentName: string`, `stats: { currentValue, roiPercent, absolutePnL, totalTrades }`, `color: string`
    - Display agent display name at top
    - Show color accent bar/badge using agent color
    - Display current portfolio value
    - Display ROI % with +/- sign and green/red color based on positive/negative
    - Display absolute P&L with $ formatting
    - Display total trades count
    - Include "Trigger [Agent Name]" button
    - Add onClick handler that calls appropriate `/api/trading-agent*` endpoint
    - Show loading spinner during execution (use useState for loading state)
    - Display success/error toast after execution (can use simple div or existing toast pattern)
    - Follow existing component styling patterns from TradingAgent.tsx
  - [x] 3.4 Create `src/app/components/MultiAgentTradeHistory.tsx` component
    - Add 'use client' directive
    - Accept optional `agentFilter?: string` prop
    - Create state for trades list, loading, error
    - useEffect to fetch `/api/trade-history?limit=10` or `/api/agent/[name]/trades?limit=10` based on filter
    - Render table with columns: Timestamp, Agent (with colored dot), Action, Asset, Quantity, Price, P&L
    - If agentFilter provided, only show that agent's trades
    - If no filter, show all trades with agent column
    - Format timestamp as "Oct 15, 3:42 PM" using toLocaleString()
    - Color-code P&L: green if positive, red if negative
    - Add agent color dot next to agent name in table
    - Reuse existing table styling from TradeHistory.tsx
    - Auto-refresh every 30 seconds using setInterval pattern

- [x] 4.0 Phase 2D: Dashboard Integration & Testing
  - [x] 4.1 Create `src/app/leaderboard/page.tsx` main dashboard page
    - Add 'use client' directive
    - Create state for: leaderboardData, chartData, agentStats (for cards), loading, error, selectedAgentFilter
    - useEffect to fetch data on mount: `/api/leaderboard`, `/api/portfolio-history`, `/api/agent/[name]/stats` for each agent
    - Auto-refresh all data every 10 seconds using setInterval
    - Structure page layout in 4 sections:
      1. Hero section with "TradeWarriors Leaderboard" title and "Trigger All Agents" button
      2. Leaderboard + Chart section (full width)
      3. Agent Cards section (2×2 grid)
      4. Trade History section with filter tabs
    - Import and render LeaderboardTable, MultiAgentChart, AgentCard (×4), MultiAgentTradeHistory components
    - Pass appropriate data props to each component
    - Use max-w-7xl container and Tailwind grid for layout
    - NOTE: Dashboard implemented at `/src/app/page.tsx` (homepage)
  - [x] 4.2 Implement "Trigger All Agents" functionality
    - Add button click handler in leaderboard page
    - Set loading state to true, show loading overlay on dashboard
    - Call `POST /api/trading-cycle`
    - Handle response: success/partial success/failure
    - Display results message (e.g., "All agents executed successfully" or "2/4 agents succeeded")
    - If errors, show error details for failed agents
    - After execution completes, automatically refresh all dashboard data
    - Scroll to top of page to show updated leaderboard
    - Use setTimeout or window.scrollTo for scroll behavior
  - [x] 4.3 Implement agent filter tabs for trade history
    - Create state for `selectedAgent: string | null` (null = all agents)
    - Render filter tabs/buttons: [All Agents | OpenAI | Grok | Gemini | Council]
    - Apply active styling to selected tab
    - Pass selectedAgent to MultiAgentTradeHistory component as agentFilter prop
    - Component should re-fetch data when filter changes
  - [x] 4.4 Add error handling and user feedback
    - Wrap all API calls in try-catch blocks
    - Display error states using friendly messages: "Unable to load data. Please refresh."
    - If agent trigger fails, show error in AgentCard but don't hide the card
    - Log all errors to console for debugging (console.error)
    - Add toast notifications for API failures (can use simple fixed-position div)
    - Handle network errors gracefully (e.g., timeout, connection refused)
  - [x] 4.5 Test individual agent triggers
    - Verify each AgentCard's "Trigger" button calls correct API endpoint
    - Test OpenAI agent trigger → calls `/api/trading-agent`
    - Test Grok agent trigger → calls `/api/trading-agent-grok`
    - Test Gemini agent trigger → calls `/api/trading-agent-gemini`
    - Test Council agent trigger → calls `/api/council-decision`
    - Verify loading states appear during execution
    - Verify success/error messages display correctly
    - Verify card updates with new stats after execution
    - **COMPLETED:** All agent triggers tested and working
    - **ENHANCEMENT:** Daily cap increased from 2 to 10 trades per 24h
    - **ENHANCEMENT:** HOLD decisions no longer count toward daily cap

- [ ] 5.0 Final Testing & Validation
  - [ ] 5.1 Test agent configuration
    - Open browser dev tools console
    - Verify no errors loading agents config
    - Check all 4 agent configs have correct colors: OpenAI (Black), Grok (Orange), Gemini (Blue), Council (Gold)
    - Verify API keys are loaded from environment variables
  - [ ] 5.2 Test API endpoints individually
    - Use browser or Postman to test each endpoint
    - `POST /api/trading-cycle` → should return results for all 4 agents
    - `GET /api/leaderboard` → should return ranked agents with correct ROI calculations
    - `GET /api/portfolio-history` → should return time-series with 4 agent values per timestamp
    - `GET /api/agent/openai/stats` → should return detailed stats for OpenAI agent
    - `GET /api/agent/grok/trades?limit=5` → should return last 5 Grok trades
    - Verify all responses match schemas from PRD Appendix B
  - [ ] 5.3 Test leaderboard rankings
    - Trigger all agents to generate some trades
    - Verify leaderboard ranks agents by ROI% (highest to lowest)
    - Verify ROI%, P&L, and current values are calculated correctly
    - Check calculations against manual verification: ROI% = ((currentValue - startingCapital) / startingCapital) * 100
    - Verify agent colors display correctly in table
  - [ ] 5.4 Test multi-agent chart
    - Verify 4 lines render with correct colors
    - Verify all lines start at $124,038.33 baseline
    - Hover over chart and verify tooltip shows accurate values for all agents
    - Verify X-axis shows timestamps correctly
    - Verify legend displays agent names with color indicators
  - [ ] 5.5 Test agent cards
    - Verify all 4 cards display on dashboard
    - Verify stats are correct (ROI%, P&L, total trades)
    - Trigger each agent individually and verify loading spinner appears
    - Verify success message displays after execution
    - Verify card updates with new data after trade
  - [ ] 5.6 Test trade history filtering
    - Click "All Agents" filter → should show trades from all 4 agents
    - Click "OpenAI" filter → should show only OpenAI trades
    - Click "Grok" filter → should show only Grok trades
    - Verify agent colored dot displays correctly
    - Verify P&L color-coding works (green positive, red negative)
  - [ ] 5.7 Test "Trigger All Agents" functionality
    - Click "Trigger All Agents" button
    - Verify loading overlay appears
    - Wait for execution to complete (~60 seconds)
    - Verify results message displays (success/partial/failure)
    - Verify dashboard auto-refreshes with new data
    - Verify page scrolls to top
  - [ ] 5.8 Test error handling
    - Simulate API failure (stop dev server temporarily)
    - Verify error messages display for failed components
    - Restart server and verify data loads correctly
    - Trigger agent with invalid keys → verify error shows in card
    - Verify other agents continue if one fails during "Trigger All"
  - [ ] 5.9 Test auto-refresh
    - Open dashboard and wait 10 seconds
    - Verify leaderboard, chart, and cards refresh automatically
    - Open browser Network tab and confirm API calls every 10 seconds
    - Verify no performance issues or memory leaks from interval
  - [ ] 5.10 Test responsive design
    - Resize browser to 1920px width → verify full desktop layout
    - Resize to 1440px → verify layout adapts correctly
    - Resize to 1024px → verify agent cards still display in grid
    - Resize to 768px → verify agent cards adapt to 2-column layout
    - Verify tables remain functional (horizontal scroll acceptable)
  - [ ] 5.11 Verify data accuracy
    - Manually calculate expected ROI for one agent
    - Compare with leaderboard display → should match
    - Verify starting capital matches agent-baselines.json ($124,038.33)
    - Verify current value = USDT balance + (BTC holdings × BTC price)
    - Verify trade count matches actual number of trades in history
    - Verify chart data points align with trade timestamps
  - [ ] 5.12 Run through PRD functional testing checklist
    - Open PRD section 9 "Testing Requirements"
    - Go through each checklist item
    - Mark items as pass/fail
    - Fix any failing items
    - Re-test until all items pass

---

**Status:** Phase 2D completed. Ready for Phase 5.0 Final Testing & Validation.

**Recent Achievements:**
- ✅ All multi-agent infrastructure built (Phases 2A-2C)
- ✅ Dashboard fully integrated with auto-refresh (Phase 2D)
- ✅ Individual agent triggers tested and working (Task 4.5)
- ✅ Daily cap enhanced: 2→10 trades, HOLD excluded from count

### Notes

- All API endpoints should follow Next.js App Router conventions (route.ts files)
- Use TypeScript for all files with proper type definitions
- Follow existing code patterns from TradeHistory.tsx and PortfolioChart.tsx
- Auto-refresh intervals: 10s for dashboard, 30s for individual components
- Error handling: try-catch blocks, console.error logging, user-friendly messages
- Agent colors must be consistent across all UI components
- Use Promise.allSettled() instead of Promise.all() to handle partial failures gracefully
- Test endpoints individually before integrating into UI
