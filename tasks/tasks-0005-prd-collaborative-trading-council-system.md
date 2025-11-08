# Tasks: Collaborative Trading Council System

**Based on**: PRD-0005: Collaborative Trading Council System
**Status**: Complete - Ready for Implementation
**Created**: 2025-10-18
**Total Tasks**: 5 parent tasks, 62 sub-tasks

---

## Relevant Files

### Backend Files
- `src/types/trading.ts` - Extend TradeRecord type with council metadata fields
- `src/lib/storage/tradeHistory.ts` - Update logTrade() to accept and store council metadata
- `src/app/api/council/stats/route.ts` - **NEW** - Council statistics API endpoint
- `src/app/api/trading-agent-council/route.ts` - Verify metadata return format
- `src/app/api/portfolio-history/route.ts` - Support council-only filtering
- `src/lib/council/types.ts` - Define council metadata interface
- `src/lib/council/statistics.ts` - **NEW** - Statistics calculation functions

### Frontend Component Files
- `src/app/components/CouncilPerformanceDashboard.tsx` - **NEW** - Main performance metrics
- `src/app/components/DebateViewer.tsx` - **NEW** - Expandable debate display
- `src/app/components/ComprehensiveStatsPanel.tsx` - **NEW** - Detailed statistics panel
- `src/app/components/AssetAllocation.tsx` - **NEW** - Portfolio allocation visualization
- `src/app/components/ModelContributionChart.tsx` - **NEW** - Model selection frequency chart
- `src/app/components/MultiAgentChart.tsx` - Modify to display single council line
- `src/app/components/MultiAgentTradeHistory.tsx` - Add per-row debate viewer
- `src/app/components/LeaderboardTable.tsx` - Will be replaced/hidden
- `src/app/components/AgentCard.tsx` - Will be hidden but kept in codebase
- `src/app/page.tsx` - Restructure layout for collaborative focus

### Data Files
- `data/trade-history.json` - Will store council metadata inline with trades
- `data/agent-baselines.json` - Already exists and configured

### Notes
- No test files specified in PRD v1; tests deferred to Phase 5
- Individual agent endpoints kept but unused in main UI
- Backwards compatibility maintained for existing trade history records

---

## Tasks

- [x] 1.0 **Backend Foundation: Enhance Data Storage & Statistics API**
  - [x] 1.1 Define council metadata interface in `src/lib/council/types.ts`
    - Add `CouncilMetadata` interface with fields: individualProposals, voteBreakdown, selectedModel, consensusType, voteScores, debateDurationMs
    - Add TypeScript types for model proposals structure (openai, grok, gemini)
    - Export interface for use in other modules
  - [x] 1.2 Extend TradeRecord type in `src/types/trading.ts`
    - Add optional `councilMetadata?: CouncilMetadata` field to TradeRecord interface
    - Ensure backwards compatibility with existing records (field is optional)
    - Add JSDoc comments explaining the new field
  - [x] 1.3 Update `logTrade()` function in `src/lib/storage/tradeHistory.ts`
    - Add `councilMetadata` as optional parameter
    - Store metadata inline with trade record in JSON
    - Test that existing trades without metadata still work
    - Verify JSON structure remains valid after changes
  - [x] 1.4 Verify `/api/trading-agent-council` returns complete metadata
    - Check that response includes `_meta.selectedModel`, `_meta.consensusType`, `_meta.voteScores`, `_meta.totalTimeMs`
    - Verify individual model proposals are captured during debate process
    - Test with actual council execution and log the response structure
  - [x] 1.5 Create statistics calculation functions in `src/lib/council/statistics.ts`
    - Create `calculateDecisionQualityMetrics()` function (total trades, win rate, avg P&L, ROI)
    - Create `calculateModelContribution()` function (frequency selected, per-model win rate)
    - Create `calculateConsensusPatterns()` function (unanimous vs majority distribution)
    - Create `calculateRiskMetrics()` function (max drawdown, Sharpe ratio, volatility)
    - Create `calculateExecutionMetrics()` function (order type distribution, avg execution time)
    - Add helper functions for calculating Sharpe ratio and max drawdown
    - Ensure functions handle empty trade history gracefully (return zeros/defaults)
  - [x] 1.6 Create new API endpoint `src/app/api/council/stats/route.ts`
    - Import statistics calculation functions from `statistics.ts`
    - Read trade history filtered to council agent only
    - Calculate all metrics using the statistics functions
    - Return JSON response matching the interface defined in PRD FR-2.1
    - Add error handling for cases with no trades
    - Test endpoint manually: `curl http://localhost:3000/api/council/stats`

- [x] 2.0 **New UI Components: Build Collaborative Interface Elements**
  - [x] 2.1 Create `CouncilPerformanceDashboard.tsx` component
    - Create functional React component with TypeScript
    - Add state for loading and error handling
    - Fetch data from `/api/council/stats` on mount and every 30 seconds
    - Display large portfolio value prominently
    - Display ROI percentage with color coding (green if positive, red if negative)
    - Display absolute P&L in dollars
    - Display total trades, win rate, consensus pattern summary
    - Add loading skeleton UI
    - Add error state with retry button
    - Style with Tailwind CSS matching TradeWarriors theme
  - [x] 2.2 Create `DebateViewer.tsx` expandable component
    - Create component accepting `councilMetadata` prop
    - Implement collapsed state (default): show consensus badge, selected model, vote summary
    - Implement expanded state: show full reasoning from each model (OpenAI, Grok, Gemini)
    - Add expand/collapse toggle button with smooth animation
    - Display each model's section with: name, colored indicator, recommended action, full reasoning, checkmark if selected
    - Handle missing metadata gracefully (show "Debate data not available")
    - Use brand colors for model indicators (OpenAI black, Grok orange, Gemini blue)
    - Style consensus badges: UNANIMOUS (green background), MAJORITY (yellow background)
  - [x] 2.3 Create `ModelContributionChart.tsx` component
    - Create component accepting model contribution data as prop
    - Implement pie chart or bar chart showing selection frequency by model
    - Display table with columns: Model Name | Times Selected | Win Rate | Avg P&L
    - Highlight "MVP model" (most valuable contributor) with badge or border
    - Use React chart library (recharts or similar already in dependencies)
    - Add tooltip showing detailed stats on hover
    - Responsive design for mobile/tablet
  - [x] 2.4 Create `AssetAllocation.tsx` visualization component
    - Create component that fetches current balances and BTC price
    - Calculate BTC percentage and USDT percentage
    - Implement horizontal or vertical bar chart
    - Display actual values alongside percentages
    - Use orange (#FF8C42) as primary color for bars
    - Display total portfolio value above/below chart
    - Add loading state while fetching data
    - Auto-refresh data every 30 seconds
  - [x] 2.5 Create `ComprehensiveStatsPanel.tsx` container component
    - Create component fetching data from `/api/council/stats`
    - Organize into 5 subsections: Decision Quality, Model Contribution, Consensus Patterns, Risk Metrics, Execution Metrics
    - **Decision Quality Section**: Win rate progress bar, avg P&L, total ROI, best/worst trade
    - **Model Contribution Section**: Integrate `ModelContributionChart` component
    - **Consensus Patterns Section**: Donut chart for unanimous vs majority, vote pattern breakdown
    - **Risk Metrics Section**: Max drawdown with date, Sharpe ratio with tooltip explanation, volatility
    - **Execution Metrics Section**: Order type pie chart (MARKET vs LIMIT), avg execution time
    - Use grid layout to organize sections responsively
    - Add collapsible sections for better mobile experience
    - Include loading states for all sections

- [x] 3.0 **Homepage Restructure: Transform Competitive to Collaborative Layout**
  - [x] 3.1 Update `src/app/page.tsx` layout structure
    - Reorder sections according to PRD FR-4.1 layout (12 sections top to bottom)
    - Keep Header and PriceTicker unchanged at top
    - Update Hero Section title to "AI Trading Council"
    - Remove old "Trigger All Agents" button, add new "Execute Council Decision" button
    - Position new components in correct order
  - [x] 3.2 Implement "Execute Council Decision" button functionality
    - Replace fetch to `/api/trading-cycle` with fetch to `/api/trading-agent-council` only
    - Update button text: "Execute Council Decision" (idle), "Executing Council..." (loading)
    - Show success/error message after execution
    - Auto-refresh all dashboard data after successful execution
    - Remove `agentResults` state (no longer showing multi-agent debug status)
  - [x] 3.3 Integrate CouncilPerformanceDashboard component
    - Import and place component after Hero Section
    - Replace LeaderboardTable with CouncilPerformanceDashboard
    - Remove leaderboard-related state and fetch logic
  - [x] 3.4 Add "Latest Council Decision" section
    - Fetch latest decision from `/api/latest-decisions?agent=council` or `/api/trade-history?limit=1&agent=council`
    - Display: timestamp, final action, consensus badge, selected model, vote breakdown, brief reasoning (first 200 chars)
    - Position directly below CouncilPerformanceDashboard
  - [x] 3.5 Integrate DebateViewer for latest decision
    - Place expanded DebateViewer directly below Latest Decision section
    - Pass council metadata from latest decision as prop
    - This instance should be visible/expanded by default to show latest debate
  - [x] 3.6 Integrate ComprehensiveStatsPanel
    - Import and place component below DebateViewer
    - Ensure proper spacing and layout
  - [x] 3.7 Integrate AssetAllocation component
    - Import and place component below ComprehensiveStatsPanel
    - Make always visible (not collapsible)
    - Ensure prominent display as specified in PRD
  - [x] 3.8 Hide/remove competitive UI elements
    - Remove or add `display: none` to LeaderboardTable
    - Hide individual AgentCard components (remove from render, keep in codebase)
    - Remove agent filter tabs from Trade History section
    - Remove multi-agent status debug display
  - [x] 3.9 Update page title and meta tags
    - Change page title from "Multi-Agent Trading Competition" to "AI Trading Council"
    - Update meta description to reflect collaborative approach
    - Update hero text describing council collaboration

- [x] 4.0 **Existing Component Updates: Modify Chart & History for Council Mode**
  - [x] 4.1 Modify `MultiAgentChart.tsx` to display single council line
    - Update component props to accept optional `singleAgentMode` flag
    - When in single agent mode, only render one data series (council)
    - Remove other three agent lines (OpenAI, Grok, Gemini) from rendering
    - Keep chart interactions (zoom, hover tooltips) intact
    - Update legend to show only "Council Portfolio" instead of 4 agents
    - Update y-axis and styling for single-line display
    - If no data exists, show message: "No portfolio history yet. Execute first decision to start tracking."
  - [x] 4.2 Update chart data fetching in `page.tsx`
    - Modify fetch to `/api/portfolio-history` to filter for council only
    - Update state to handle single data series instead of four
    - Pass updated data to MultiAgentChart component
  - [x] 4.3 Modify `MultiAgentTradeHistory.tsx` for council-only mode
    - Remove agent filter dropdown UI (not needed)
    - Update component to always fetch council trades only
    - Add "Selected Model" column to table (shows which model's recommendation won each debate)
    - Integrate DebateViewer as expandable section for each trade row
    - Add expand/collapse button to each row (chevron icon or "+"/"-")
    - When row expanded, render DebateViewer with that trade's council metadata
    - Handle trades without metadata gracefully (disable expand button, show "N/A" in Selected Model column)
  - [x] 4.4 Test portfolio history API for council filtering
    - Verify `/api/portfolio-history` accepts and properly filters by council agent
    - If not implemented, add filtering logic to return only council portfolio values
    - Test with actual trade history data

- [x] 5.0 **Integration & Testing: E2E Validation & Performance Optimization**
  - [x] 5.1 End-to-end workflow testing
    - Start dev server and navigate to homepage
    - Verify CouncilPerformanceDashboard displays with correct data
    - Click "Execute Council Decision" button
    - Wait for council endpoint to complete
    - Verify new trade appears in Latest Decision section
    - Verify DebateViewer displays model reasonings correctly
    - Verify Trade History table updates with new trade
    - Expand new trade row and check DebateViewer shows debate details
    - Verify Portfolio Chart updates with new data point
    - Verify AssetAllocation updates with new balances
    - Verify ComprehensiveStatsPanel statistics update correctly
  - [x] 5.2 Council metadata logging validation
    - Execute council decision multiple times
    - Check `data/trade-history.json` file directly
    - Verify council metadata is being stored correctly
    - Verify individualProposals, voteBreakdown, selectedModel all present
    - Check backwards compatibility: old trades without metadata still load
  - [x] 5.3 Statistics API accuracy testing
    - Execute 5-10 council trades with varied outcomes (wins and losses)
    - Call `/api/council/stats` endpoint
    - Manually verify win rate calculation is accurate
    - Verify P&L calculations match actual portfolio changes
    - Verify model contribution frequency matches actual trades
    - Test with empty trade history (should return zeros/defaults)
  - [x] 5.4 UI responsiveness and loading states
    - Test all components with slow network (Chrome DevTools throttling)
    - Verify loading skeletons appear correctly
    - Verify error states display properly (disconnect internet, refresh)
    - Test retry functionality on error states
    - Verify auto-refresh intervals work (30 seconds for dashboard, stats)
  - [x] 5.5 Mobile and tablet responsive testing
    - Test homepage on mobile viewport (375px width)
    - Verify statistics panels stack into single column
    - Verify charts remain readable on small screens
    - Test expandable sections work on touch devices
    - Verify all buttons and interactions work on mobile
  - [x] 5.6 Performance optimization
    - Use React.memo() for expensive components (charts, statistics panels)
    - Add useMemo() for statistics calculations if done client-side
    - Verify no unnecessary re-renders during auto-refresh
    - Check bundle size hasn't increased significantly
    - Test page load time (should be <3 seconds on fast connection)
  - [x] 5.7 Error handling edge cases
    - Test behavior when council endpoint fails
    - Test behavior when statistics API fails
    - Test behavior with missing council metadata in trade history
    - Test behavior with malformed JSON in trade history
    - Verify all error messages are user-friendly
  - [x] 5.8 Final polish and cleanup
    - Remove any console.log statements used for debugging
    - Remove commented-out code
    - Ensure all TypeScript types are properly defined (no `any` types)
    - Run linter and fix any warnings
    - Verify no accessibility issues (ARIA labels, keyboard navigation)
    - Add helpful comments for complex logic
  - [x] 5.9 Documentation updates
    - Update README.md with new collaborative system description
    - Document new API endpoints in API documentation (if exists)
    - Add comments to complex components explaining council-specific logic
    - Document how to switch back to competitive mode (if needed for testing)
  - [x] 5.10 Final deployment preparation
    - Test production build locally: `npm run build && npm start`
    - Verify no build errors or warnings
    - Test that production build works correctly
    - Create deployment checklist
    - Document any environment variables needed

---

## 🎉 **PROJECT COMPLETE** ✅

**All 5 phases completed successfully!**
- ✅ Phase 1: Backend Foundation (6 tasks)
- ✅ Phase 2: New UI Components (5 tasks)
- ✅ Phase 3: Homepage Restructure (9 tasks)
- ✅ Phase 4: Existing Component Updates (4 tasks)
- ✅ Phase 5: Integration & Testing (10 tasks)

**Total: 62 sub-tasks completed across 5 parent tasks**

The AI Trading Council system is fully operational and production-ready! 🚀
