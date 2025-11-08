# PRD-0005: Collaborative Trading Council System

## 1. Introduction/Overview

### Background
The TradeWarriors platform currently operates as a multi-agent trading competition where 4 AI agents (OpenAI GPT-5-nano, Grok-4-Fast, Gemini 2.5 Flash, and Council) compete independently for the highest ROI. While this competitive model is engaging for social media demonstrations, the strategic direction is shifting toward **collaborative decision-making** to maximize actual trading performance.

### Problem Statement
The current competitive model has several limitations:
- Individual agents may make suboptimal decisions in isolation
- Cannot leverage ensemble intelligence and wisdom of crowds
- Infrastructure complexity maintaining 4 separate Binance testnet accounts
- Competition incentivizes risk-taking over prudent decision-making
- Difficult to deploy to production where one consolidated decision is needed

### Proposed Solution
Transform the system into a **Collaborative Trading Council** where all AI models work as a unified team:
- All 4 models analyze the market independently
- They engage in a structured debate process
- Reach consensus through voting (unanimous or majority)
- Execute trades as a single unified portfolio
- Track which model's recommendations are selected most frequently
- Display comprehensive decision analytics and model contribution metrics

### Goals
1. **Improve Trading Performance**: Leverage ensemble intelligence for better decisions
2. **Increase Transparency**: Show the debate process and reasoning from each model
3. **Enable Production Deployment**: Create a system that can run with real capital
4. **Track Model Effectiveness**: Measure which models contribute most valuable insights
5. **Maintain Flexibility**: Keep individual agent infrastructure for future A/B testing

---

## 2. Goals

### Primary Goals
1. **Transform UI from competition to collaboration** - Replace leaderboard and competitive elements with council-focused interface
2. **Display collaborative decision-making process** - Show how models debate and reach consensus
3. **Provide comprehensive analytics** - Track decision quality, model contributions, and trading performance
4. **Maintain technical flexibility** - Keep individual agent endpoints available but unused in main UI

### Success Criteria
- Single unified portfolio tracking (one line on chart instead of four)
- Debate viewer showing individual model reasonings with expand/collapse functionality
- Statistics dashboard showing model contribution frequency and consensus patterns
- Asset allocation visualization prominently displayed on main page
- All-time performance metrics for decision quality and risk management
- Smooth execution flow with "Execute Council Decision" button

---

## 3. User Stories

### As a Trader/Investor
1. **Decision Transparency**: "As an investor, I want to see how the AI models debate and reach consensus, so I can understand the reasoning behind each trade"
2. **Model Trust**: "As a trader, I want to know which AI model's recommendations are being selected most often, so I can understand which models are performing best"
3. **Performance Tracking**: "As an investor, I want to see comprehensive statistics about win rate, P&L, and risk metrics, so I can evaluate the system's performance"
4. **Portfolio Visibility**: "As a trader, I want to see my current asset allocation (BTC vs USDT) at a glance, so I know my exposure"

### As a System Administrator/Developer
5. **Testing Flexibility**: "As a developer, I want to keep individual agent endpoints available, so I can test and compare individual models when needed"
6. **Debate Analysis**: "As a system admin, I want to see historical debate data for each trade, so I can analyze decision patterns over time"
7. **Execution Control**: "As an operator, I want immediate execution of council decisions, so trades happen quickly without manual intervention"

### As a Product Manager/Analyst
8. **Model Performance**: "As an analyst, I want to track consensus patterns (unanimous vs majority), so I can identify when models disagree"
9. **Risk Assessment**: "As a risk manager, I want to see max drawdown and Sharpe ratio, so I can evaluate system risk"
10. **Execution Efficiency**: "As a product manager, I want to know the distribution of market vs limit orders, so I can optimize execution strategy"

---

## 4. Functional Requirements

### 4.1 Backend Requirements

#### 4.1.1 Trade History Enhancement
1. **FR-1.1**: The system MUST store council metadata for each trade including:
   - Individual model recommendations (proposals from OpenAI, Grok, Gemini)
   - Vote breakdown (how each model voted: BUY/SELL/HOLD)
   - Selected model name (which model's recommendation was chosen)
   - Consensus type (UNANIMOUS or MAJORITY)
   - Vote scores for each model
   - Timestamp of debate and execution

2. **FR-1.2**: The `logTrade()` function MUST be updated to accept council metadata as optional parameters

3. **FR-1.3**: The TradeRecord type MUST be extended with new fields for council debate data without breaking existing records

#### 4.1.2 Council Statistics API
4. **FR-2.1**: Create new API endpoint `/api/council/stats` that returns:
   - **Decision Quality Metrics**:
     - Total trades executed
     - Win rate (percentage of profitable trades)
     - Average P&L per trade
     - Total ROI (return on investment)
     - Best performing trade
     - Worst performing trade

   - **Model Contribution Metrics**:
     - Frequency each model's recommendation was selected
     - Win rate per model (when that model's recommendation was chosen)
     - Average P&L per model's recommendations
     - Voting pattern analysis (how often models agree/disagree)

   - **Consensus Pattern Metrics**:
     - Distribution of unanimous vs majority decisions
     - Average consensus time (how long debates take)
     - Breakdown of vote splits (3-0, 2-1 patterns)

   - **Risk Metrics**:
     - Maximum drawdown (largest peak-to-trough decline)
     - Sharpe ratio (risk-adjusted returns)
     - Volatility (standard deviation of returns)
     - Average position size
     - Maximum position size used

   - **Execution Metrics**:
     - Order type distribution (MARKET vs LIMIT orders)
     - Average execution time
     - Slippage statistics (if measurable)
     - Daily trade frequency

5. **FR-2.2**: The statistics API MUST calculate metrics in real-time from trade history storage

6. **FR-2.3**: The API MUST handle cases where no trades exist yet (return zeros/empty states)

#### 4.1.3 Council Endpoint Verification
7. **FR-3.1**: Verify `/api/trading-agent-council` returns complete council metadata including:
   - `_meta.selectedModel`
   - `_meta.consensusType`
   - `_meta.voteScores`
   - `_meta.totalTimeMs`
   - Individual model proposals (from debate process)

8. **FR-3.2**: Ensure council endpoint logs trades with full metadata to trade history

### 4.2 Frontend Requirements

#### 4.2.1 Homepage Restructure
9. **FR-4.1**: The main homepage MUST be restructured with the following layout (top to bottom):
   1. Header (unchanged)
   2. Price Ticker (unchanged)
   3. Hero Section with "AI Trading Council" title
   4. "Execute Council Decision" button (prominent, auto-executes)
   5. Council Performance Dashboard (replaces leaderboard)
   6. Latest Council Decision section
   7. Council Debate Viewer (expandable)
   8. Comprehensive Statistics Panel
   9. Asset Allocation Visualization (always visible)
   10. Portfolio Performance Chart (single line)
   11. Open Orders section (unchanged)
   12. Trade History (simplified, no agent filter)

10. **FR-4.2**: Remove or hide the following competitive elements from main UI:
    - Leaderboard table with agent rankings
    - Individual agent trigger buttons/cards
    - Agent filter dropdown in trade history
    - Multi-line portfolio chart (change to single line)

11. **FR-4.3**: The "Trigger All Agents" button MUST be replaced with "Execute Council Decision" button that:
    - Triggers only the council endpoint (`/api/trading-agent-council`)
    - Shows loading state during execution
    - Displays success/error message after completion
    - Auto-refreshes data after successful execution

#### 4.2.2 Council Performance Dashboard
12. **FR-5.1**: Create a new "Council Performance Dashboard" component displaying:
    - Large prominent display of total portfolio value
    - Overall ROI percentage (with color: green if positive, red if negative)
    - Absolute P&L in dollars
    - Total number of trades executed
    - Current win rate
    - Consensus pattern summary (e.g., "75% unanimous, 25% majority")

13. **FR-5.2**: The dashboard MUST fetch data from `/api/council/stats` endpoint

14. **FR-5.3**: The dashboard MUST auto-refresh every 30 seconds

#### 4.2.3 Latest Council Decision Section
15. **FR-6.1**: Display the most recent council decision with:
    - Timestamp of decision
    - Final action taken (BUY/SELL/HOLD with quantity and asset)
    - Consensus badge showing UNANIMOUS or MAJORITY
    - Selected model indicator (which model's recommendation was chosen)
    - Compact vote breakdown (e.g., "3 BUY, 0 SELL, 0 HOLD")
    - Brief summary of reasoning (first 200 characters)

16. **FR-6.2**: Fetch latest decision from `/api/latest-decisions?agent=council` endpoint

#### 4.2.4 Council Debate Viewer
17. **FR-7.1**: Create expandable debate viewer showing individual model reasonings:
    - **Collapsed state (default)**: Shows only consensus badge, selected model, vote summary
    - **Expanded state**: Reveals full reasoning from each model (OpenAI, Grok, Gemini)

18. **FR-7.2**: Each model's section in expanded view MUST show:
    - Model name with colored indicator (matching brand colors)
    - Their recommended action (BUY/SELL/HOLD with details)
    - Full reasoning text
    - Vote indicator (checkmark if this model's recommendation was selected)

19. **FR-7.3**: The debate viewer MUST be displayed:
    - Once prominently for the latest decision (below Latest Council Decision section)
    - As an expandable section for EACH trade in the trade history

20. **FR-7.4**: Debate data MUST be fetched from council metadata stored in trade history

#### 4.2.5 Comprehensive Statistics Panel
21. **FR-8.1**: Create a detailed statistics panel with multiple subsections:

   **Decision Quality Section**:
   - Win rate (percentage, with visual progress bar)
   - Average P&L per trade
   - Total ROI
   - Best/worst trade display

   **Model Contribution Section**:
   - Pie chart or bar chart showing selection frequency by model
   - Table with: Model Name | Times Selected | Win Rate When Selected | Avg P&L
   - Highlight the "MVP model" (most valuable contributor)

   **Consensus Patterns Section**:
   - Donut chart showing unanimous vs majority split
   - Breakdown of vote patterns (3-0, 2-1 distributions)
   - Average decision time

   **Risk Metrics Section**:
   - Max drawdown display with date it occurred
   - Sharpe ratio with explanation tooltip
   - Volatility metric
   - Position sizing statistics

   **Execution Metrics Section**:
   - Order type distribution (MARKET vs LIMIT percentages)
   - Average execution time
   - Daily trade frequency

22. **FR-8.2**: All statistics MUST show all-time cumulative data (no time-range filtering in v1)

23. **FR-8.3**: Statistics panel MUST fetch data from `/api/council/stats`

#### 4.2.6 Asset Allocation Visualization
24. **FR-9.1**: Display current portfolio allocation prominently on main page with:
    - Horizontal or vertical bar chart showing BTC vs USDT percentages
    - Actual values displayed alongside percentages
    - Orange/accent color scheme for visual appeal
    - Total portfolio value displayed above/below chart

25. **FR-9.2**: Asset allocation MUST be always visible (not hidden in collapsible section)

26. **FR-9.3**: Fetch allocation data from current account balances and BTC price

#### 4.2.7 Portfolio Performance Chart
27. **FR-10.1**: Modify existing MultiAgentChart component to:
    - Display only ONE line (council portfolio value over time)
    - Remove the other 3 agent lines (OpenAI, Grok, Gemini individual lines)
    - Keep chart styling and interactions (zoom, hover tooltips)
    - Show starting capital as baseline reference

28. **FR-10.2**: Chart MUST fetch historical portfolio values from `/api/portfolio-history?agent=council`

29. **FR-10.3**: If no historical data exists, display message "No portfolio history yet. Execute first decision to start tracking."

#### 4.2.8 Trade History Enhancement
30. **FR-11.1**: Modify MultiAgentTradeHistory component to:
    - Remove agent filter dropdown (not needed for single council)
    - Optionally add "Selected Model" column showing which model won each debate
    - Each trade row MUST have expandable section showing debate details
    - Keep existing columns: Timestamp, Action, Asset, Quantity, Price, P&L

31. **FR-11.2**: Trade history MUST display debate viewer for each historical trade when expanded

32. **FR-11.3**: Trade history MUST still fetch from `/api/trade-history?agent=council`

#### 4.2.9 Open Orders Section
33. **FR-12.1**: Open Orders section remains unchanged functionally

34. **FR-12.2**: Display orders from council's Binance account

### 4.3 Data Storage Requirements

#### 4.3.1 Council Metadata Storage
35. **FR-13.1**: Extend TradeRecord type with optional council metadata fields:
```typescript
interface CouncilMetadata {
  individualProposals: {
    openai: {
      action: string;
      reasoning: string;
      quantity?: number;
      price?: number;
    };
    grok: { /* same structure */ };
    gemini: { /* same structure */ };
  };
  voteBreakdown: {
    BUY: number;
    SELL: number;
    HOLD: number;
  };
  selectedModel: 'openai' | 'grok' | 'gemini';
  consensusType: 'UNANIMOUS' | 'MAJORITY';
  voteScores: Record<string, number>;
  debateDurationMs: number;
}
```

36. **FR-13.2**: Trade history JSON file MUST remain backwards compatible with existing records

37. **FR-13.3**: New trades MUST include council metadata when logged from council endpoint

---

## 5. Non-Goals (Out of Scope)

### Explicitly NOT included in this PRD:
1. **Time-range filtering for statistics** - v1 shows all-time only; time-based filters (7d, 30d) deferred to future iteration
2. **Manual approval mode** - Council executes immediately; no "preview and confirm" flow in v1
3. **Real-time debate streaming** - Debates happen server-side; no WebSocket streaming of debate process
4. **Individual agent performance comparison** - Focus is purely on council; no A/B testing UI in v1
5. **Custom consensus algorithms** - Use existing council voting logic; no configurability yet
6. **Multi-portfolio support** - Single portfolio only; no support for multiple strategies/portfolios
7. **Advanced charting features** - No technical indicators on chart, no drawing tools
8. **Notification system** - No email/SMS/push notifications for trades or decisions
9. **User authentication** - Remains a single-user application; no multi-user support
10. **Mobile-responsive optimizations** - Desktop-first; basic mobile support but not primary focus
11. **Separate Binance accounts** - Can continue using shared account; separating accounts is optional
12. **Backtesting functionality** - No historical simulation or strategy backtesting

---

## 6. Design Considerations

### 6.1 Visual Design
- **Color Scheme**: Maintain existing TradeWarriors theme (deep space backgrounds, hyperspace blue accents)
- **Typography**: Continue using Orbitron for headers, Inter for body, Roboto Mono for numbers
- **Model Colors**:
  - OpenAI: Black (#0A0B10)
  - Grok: Orange (#FF8C42)
  - Gemini: Blue (#2FD1FF)
  - Council: Gold (#FFD700)
- **Asset Allocation**: Use orange (#FF8C42) as primary color for bars
- **Consensus Badges**:
  - UNANIMOUS: Green background, check icon
  - MAJORITY: Yellow/orange background, voting icon

### 6.2 Component Hierarchy
```
HomePage
├── Header
├── PriceTicker
├── HeroSection
│   └── ExecuteCouncilButton
├── CouncilPerformanceDashboard
├── LatestDecisionSection
│   └── DebateViewer (expandable)
├── ComprehensiveStatsPanel
│   ├── DecisionQualityStats
│   ├── ModelContributionChart
│   ├── ConsensusPatternChart
│   ├── RiskMetricsDisplay
│   └── ExecutionMetricsDisplay
├── AssetAllocationVisualization
├── PortfolioChart (single line)
├── OpenOrdersTable
└── TradeHistoryTable
    └── DebateViewer (per row, expandable)
```

### 6.3 Responsive Behavior
- Desktop (>1024px): Full layout as described
- Tablet (768-1024px): Stack statistics into 2 columns
- Mobile (<768px): Single column layout, collapsible sections by default

### 6.4 Loading States
- Skeleton loaders for statistics panels
- Spinner for "Execute Council Decision" button during execution
- Shimmer effect for chart while loading data
- "No data yet" states for empty statistics

---

## 7. Technical Considerations

### 7.1 API Endpoints
- **Existing**: `/api/trading-agent-council` (returns council decision + metadata)
- **New**: `/api/council/stats` (returns comprehensive statistics)
- **Modified**: `/api/portfolio-history` (support council-only filtering)
- **Keep but unused**: Individual agent endpoints (`/api/trading-agent`, `/api/trading-agent-grok`, `/api/trading-agent-gemini`)

### 7.2 State Management
- Continue using React useState/useEffect for component state
- Consider useContext if council metadata needs to be shared across many components
- Local storage for UI preferences (e.g., which sections are expanded)

### 7.3 Performance Optimization
- Memoize expensive calculations (statistics computations)
- Debounce auto-refresh intervals
- Lazy load debate viewer content (fetch full reasoning only when expanded)
- Consider pagination for trade history if it grows very large

### 7.4 Data Migration
- Existing trade history records without council metadata: display gracefully with "Debate data not available for historical trades"
- Ensure backwards compatibility when reading trade history JSON

### 7.5 Error Handling
- If council endpoint fails: display error message, allow retry
- If statistics API fails: show cached data or empty state with retry button
- If debate metadata is missing: show "Debate details unavailable" in expandable sections

### 7.6 Testing Strategy
- Unit tests for statistics calculation functions
- Integration tests for council endpoint + trade logging
- UI tests for expandable debate viewers
- End-to-end test: trigger council → verify trade logged → check statistics updated

### 7.7 Dependencies
- **No new npm packages required** for core functionality
- Consider chart library upgrade if current library doesn't support needed features
- Consider animation library for expandable sections (or use CSS transitions)

---

## 8. Success Metrics

### 8.1 User Experience Metrics
1. **Clarity**: Users can understand council decisions within 30 seconds of viewing latest decision
2. **Transparency**: 100% of trades have visible debate data (for new trades after implementation)
3. **Usability**: Users can execute council decision with single button click
4. **Engagement**: Users expand debate viewer to see model reasonings ≥50% of the time

### 8.2 System Performance Metrics
1. **Decision Accuracy**: Council win rate ≥55% (better than random)
2. **Response Time**: Council endpoint responds within 15 seconds
3. **Statistics Load Time**: `/api/council/stats` responds within 2 seconds
4. **UI Responsiveness**: All page interactions complete within 200ms

### 8.3 Trading Performance Metrics
1. **ROI**: Achieve positive ROI over 30-day testing period
2. **Risk Management**: Max drawdown <20% of starting capital
3. **Consistency**: Avoid consecutive losing streaks >5 trades
4. **Sharpe Ratio**: Maintain Sharpe ratio >0.5 (acceptable risk-adjusted returns)

### 8.4 Model Contribution Metrics
1. **Diversity**: No single model wins >60% of debates (good ensemble)
2. **Consensus Quality**: Unanimous decisions have higher win rate than majority decisions
3. **Model Effectiveness**: Each model contributes positive expected value when selected

---

## 9. Open Questions

### 9.1 Unresolved Technical Questions
1. **Q**: Should debate data be stored in separate file or inline in trade history JSON?
   - **Consideration**: Inline is simpler but increases file size; separate allows selective loading

2. **Q**: How to handle very long reasoning text from models (>2000 characters)?
   - **Options**: Truncate with "Read more", paginate, or set LLM prompt limits

3. **Q**: Should statistics API calculate on-demand or pre-compute periodically?
   - **Trade-off**: On-demand is always current but slower; pre-computed is faster but may be stale

4. **Q**: How to version trade history schema to allow future changes without breaking?
   - **Consideration**: Add schema version field? Use separate metadata file?

### 9.2 Future Enhancement Questions
1. **Q**: Should we add ability to "replay" past debates (re-run models on historical data)?
2. **Q**: Should we track which macro events (news, data releases) influenced decisions?
3. **Q**: Should we add "confidence scores" from each model to show certainty levels?
4. **Q**: Should we implement "challenge mode" where user can propose trades and see council's opinion?

### 9.3 User Experience Questions
1. **Q**: Should we add keyboard shortcuts for common actions (space to execute, E to expand debates)?
2. **Q**: Should there be a "dashboard tour" for first-time users explaining each section?
3. **Q**: Should we add export functionality (CSV/JSON) for statistics and trade history?

### 9.4 Production Deployment Questions
1. **Q**: What's the plan for monitoring in production? (alerts for consecutive losses, errors)
2. **Q**: How to handle rate limits from Binance API if we scale to more frequent decisions?
3. **Q**: Should we implement circuit breaker pattern to pause trading if losses exceed threshold?
4. **Q**: How to handle database migration when moving from JSON files to proper database?

---

## 10. Implementation Plan

### Phase 1: Backend Foundation (Week 1)
**Goal**: Enhance data layer and create statistics API

**Tasks**:
1. Update `TradeRecord` type with council metadata fields
2. Modify `logTrade()` to accept and store council metadata
3. Verify `/api/trading-agent-council` returns complete metadata
4. Create `/api/council/stats` endpoint with all metrics calculations
5. Add unit tests for statistics calculations
6. Test backwards compatibility with existing trade history

**Deliverables**:
- Updated type definitions
- New statistics API endpoint
- Test coverage ≥80% for new code

### Phase 2: UI Components (Week 2)
**Goal**: Build new collaborative UI components

**Tasks**:
1. Create `CouncilPerformanceDashboard` component
2. Create `DebateViewer` expandable component
3. Create `ComprehensiveStatsPanel` with all subsections
4. Create `AssetAllocationVisualization` component
5. Create `ModelContributionChart` component
6. Add unit tests for each component

**Deliverables**:
- 5 new React components
- Storybook stories for each component (if using Storybook)
- Component tests

### Phase 3: Homepage Restructure (Week 3)
**Goal**: Integrate new components and modify layout

**Tasks**:
1. Modify `page.tsx` with new layout structure
2. Replace "Trigger All Agents" with "Execute Council Decision"
3. Hide/remove competitive elements (leaderboard, individual cards)
4. Integrate `DebateViewer` into Latest Decision section
5. Integrate `DebateViewer` into each Trade History row
6. Update `MultiAgentChart` to single-line mode
7. Remove agent filter from Trade History

**Deliverables**:
- Restructured homepage
- All new components integrated
- Removed/hidden competitive UI elements

### Phase 4: Chart & History Updates (Week 4)
**Goal**: Modify existing components for council-only mode

**Tasks**:
1. Update `MultiAgentChart` to display single council line
2. Modify `MultiAgentTradeHistory` to remove agent filter
3. Add "Selected Model" column to trade history (optional)
4. Add expandable debate viewer to each trade row
5. Update chart data fetching logic
6. Test with various data states (empty, partial, full history)

**Deliverables**:
- Updated chart component
- Updated trade history component
- Integration tests

### Phase 5: Testing & Polish (Week 5)
**Goal**: End-to-end testing and refinements

**Tasks**:
1. End-to-end testing: Execute council → verify all UI updates
2. Test expandable sections work correctly
3. Test statistics calculations with various scenarios
4. Performance optimization (memoization, lazy loading)
5. Responsive design testing (mobile, tablet)
6. Error handling and edge cases
7. UI polish and animations

**Deliverables**:
- E2E test suite
- Performance benchmarks met
- Bug fixes completed
- Documentation updated

### Phase 6: Deployment (Week 6)
**Goal**: Deploy to production and monitor

**Tasks**:
1. Final code review
2. Merge to main branch
3. Deploy to production environment
4. Monitor for errors and performance issues
5. Collect initial usage feedback
6. Document any issues discovered

**Deliverables**:
- Production deployment
- Monitoring dashboard
- Post-deployment report

---

## 11. Appendix

### A. Related Documents
- PRD-0004: Strategic Limit Order Trading System (existing feature)
- Technical Architecture Document (if exists)
- Council Debate Algorithm Documentation
- Binance API Integration Guide

### B. Glossary
- **Council**: The collaborative AI system consisting of OpenAI, Grok, and Gemini models
- **Consensus**: Agreement reached by the council through voting (unanimous or majority)
- **Debate**: The process where models analyze market data and propose recommendations
- **Selected Model**: The model whose recommendation was chosen by the council
- **Vote Breakdown**: The distribution of votes (e.g., 2 BUY, 1 HOLD)
- **Unanimous**: All 3 models agree on the same action
- **Majority**: 2 out of 3 models agree on the action
- **Sharpe Ratio**: Risk-adjusted return metric (higher is better)
- **Max Drawdown**: Largest peak-to-trough decline in portfolio value
- **ROI**: Return on Investment, percentage gain/loss from starting capital

### C. References
- Binance Testnet API Documentation: https://testnet.binance.vision/
- Ensemble Methods in Machine Learning: [Academic papers on wisdom of crowds]
- Trading System Design Patterns: [Industry best practices]

---

**Document Version**: 1.0
**Created**: 2025-10-18
**Last Updated**: 2025-10-18
**Author**: TradeWarriors Team
**Status**: Ready for Review
**Next Review Date**: After Phase 1 completion
