# Task List: Strategic Limit Order Trading with Agent Memory

**Based on PRD:** `0004-prd-strategic-limit-order-trading.md`
**Created:** 2025-10-16
**Status:** In Progress

---

## Relevant Files

### Core Type Definitions
- `src/types/trading.ts` - Update TradingDecision schema to support actions array, plan field, and limit orders
- `src/types/trading.ts` (Action interface) - Define new Action type for multi-action system

### Binance API Integration
- `src/lib/binance/orderExecution.ts` - Add limit order execution, open orders query, order cancellation
- `src/lib/binance/openOrders.ts` - NEW: Functions for querying and managing open orders

### Plan Storage System
- `src/lib/storage/agentPlans.ts` - NEW: Plan persistence (save, load, update)
- `data/agent-plans/` - NEW: Directory for storing agent plan JSON files

### Prompt Engineering
- `src/lib/prompts/tradingPromptBuilder.ts` - Update system and user prompts for limit orders, plans, open orders
- `src/lib/prompts/openOrdersFormatter.ts` - NEW: Format open orders for prompt display
- `src/lib/council/prompts.ts` - Update council prompts with plan support

### Agent Implementations
- `src/lib/openai/tradingAgent.ts` - Update OpenAI agent with new schema (Responses API + Zod)
- `src/lib/xai/tradingAgentGrok.ts` - Update Grok agent with new JSON schema
- `src/lib/openrouter/tradingAgentGemini.ts` - Update Gemini agent with new JSON schema
- `src/lib/council/adapters.ts` - Update all 3 council adapters (OpenAI, Grok, Gemini)

### Order Execution Engine
- `src/lib/execution/multiActionExecutor.ts` - NEW: Multi-action execution engine
- `src/lib/execution/orderValidator.ts` - NEW: Risk validation (duplicate prevention, exposure limits)

### Trade History
- `src/lib/storage/tradeHistory.ts` - Update TradeRecord interface with orderType, limitPrice, plan fields

### UI Components
- `src/app/components/AgentPlanCard.tsx` - NEW: Display agent's current plan
- `src/app/components/OpenOrdersTable.tsx` - NEW: Display all open orders across agents
- `src/app/components/LatestDecisions.tsx` - Update to show limit prices and order types
- `src/app/components/TradeHistory.tsx` - Update to show order type, limit price, price improvement

### API Routes
- `src/app/api/trading-agent/route.ts` - Update to handle multi-action responses
- `src/app/api/trading-agent-grok/route.ts` - Update for new schema
- `src/app/api/trading-agent-gemini/route.ts` - Update for new schema
- `src/app/api/trading-agent-council/route.ts` - Update for council with plans
- `src/app/api/open-orders/route.ts` - NEW: API endpoint to query open orders
- `src/app/api/agent-plans/route.ts` - NEW: API endpoint to get agent plans

### Testing
- `test-limit-orders.js` - Existing: Binance limit order test script
- `src/__tests__/multiActionExecutor.test.ts` - NEW: Test multi-action execution
- `src/__tests__/agentPlans.test.ts` - NEW: Test plan storage system

### Notes
- Test limit order placement: `node test-limit-orders.js`
- Each agent needs separate Binance API keys (add to `.env.local`)
- Plan files stored in `data/agent-plans/` as JSON
- Actions execute sequentially; partial failures are logged

---

## Tasks

### [x] 1.0 Update Type System & Schema Definitions
- [x] **1.1** Add `Action` interface to `src/types/trading.ts` with all action types (PLACE_LIMIT_BUY, PLACE_LIMIT_SELL, PLACE_MARKET_BUY, PLACE_MARKET_SELL, CANCEL_ORDER, HOLD)
- [x] **1.2** Add optional fields to Action: `orderId`, `price`, `quantity`, `asset`, `reasoning`
- [x] **1.3** Update `TradingDecision` interface: replace single `action` field with `actions: Action[]` array
- [x] **1.4** Add `plan: string` field to `TradingDecision` (max 500 characters)
- [x] **1.5** Update `TradingDecisionSchema` Zod validation to validate actions array
- [x] **1.6** Add Zod refinement: validate that PLACE actions have price/quantity, CANCEL has orderId
- [x] **1.7** Add Zod refinement: validate plan length ≤ 500 characters
- [x] **1.8** Update `TradeRecord` interface: add `orderType: 'MARKET' | 'LIMIT'`, `limitPrice?: number`, `executedPrice: number`, `priceImprovement?: number`, `plan: string`
- [x] **1.9** Add `OpenOrder` interface for Binance open order data: orderId, symbol, price, quantity, side, status, time
- [x] **1.10** Export all new types and ensure backward compatibility with existing code

### [x] 2.0 Implement Binance Limit Order & Open Orders API
- [x] **2.1** Create `src/lib/binance/openOrders.ts` file
- [x] **2.2** Implement `getOpenOrders(symbol, apiKey?, secretKey?): Promise<OpenOrder[]>` - query Binance for all open orders
- [x] **2.3** Add error handling for Binance API timeouts and rate limits in `getOpenOrders`
- [x] **2.4** Implement order age calculation (time since order placed) in returned OpenOrder objects
- [x] **2.5** In `src/lib/binance/orderExecution.ts`, create `executeLimitOrder(symbol, side, quantity, price, apiKey?, secretKey?): Promise<OrderResult>`
- [x] **2.6** Set `timeInForce: 'GTC'` (Good Till Cancel) for all limit orders
- [x] **2.7** Add symbol info fetching (LOT_SIZE, MIN_NOTIONAL) for limit orders same as market orders
- [x] **2.8** Validate limit price is within ±5% of current market price before execution
- [x] **2.9** Implement `cancelOrder(symbol, orderId, apiKey?, secretKey?): Promise<CancelResult>` in `orderExecution.ts`
- [x] **2.10** Handle "order already filled" error in `cancelOrder` - return informative error without throwing
- [x] **2.11** Handle "order not found" error in `cancelOrder` - skip silently
- [x] **2.12** Add retry logic (1 retry) for Binance API failures on all new functions

### [x] 3.0 Create Agent Plan Storage System
- [x] **3.1** Create directory `data/agent-plans/` in project root
- [x] **3.2** Create `src/lib/storage/agentPlans.ts` file
- [x] **3.3** Define `AgentPlan` interface: `{ agentName: string, plan: string, lastUpdated: string, cycleNumber: number }`
- [x] **3.4** Implement `savePlan(agentName: string, plan: string, cycleNumber: number): Promise<void>` - saves plan to `data/agent-plans/{agentName}-plan.json`
- [x] **3.5** Implement `loadPlan(agentName: string): Promise<AgentPlan | null>` - loads latest plan or returns null if doesn't exist
- [x] **3.6** Add timestamp formatting using ISO 8601 format
- [x] **3.7** Add error handling for file system operations (directory doesn't exist, permission errors)
- [x] **3.8** Ensure directory creation if `data/agent-plans/` doesn't exist
- [x] **3.9** Add plan validation: check plan is not empty and ≤ 500 characters
- [x] **3.10** Support plan files for: `openai`, `grok`, `gemini`, `council-openai`, `council-grok`, `council-gemini`

### [x] 4.0 Build Multi-Action Execution Engine
- [x] **4.1** Create `src/lib/execution/multiActionExecutor.ts` file
- [x] **4.2** Define `ActionResult` interface: `{ success: boolean, action: Action, order?: OrderResult, error?: string }`
- [x] **4.3** Implement `executeActions(actions: Action[], currentPrice: number, balances: Balance[], apiKey?, secretKey?): Promise<ActionResult[]>`
- [x] **4.4** For each action in array, execute sequentially and collect results
- [x] **4.5** Handle `PLACE_LIMIT_BUY`: call `executeLimitOrder(symbol, 'BUY', quantity, price, apiKey, secretKey)`
- [x] **4.6** Handle `PLACE_LIMIT_SELL`: call `executeLimitOrder(symbol, 'SELL', quantity, price, apiKey, secretKey)`
- [x] **4.7** Handle `PLACE_MARKET_BUY`: call `executeMarketOrder(symbol, 'BUY', quantity, currentPrice, apiKey, secretKey)`
- [x] **4.8** Handle `PLACE_MARKET_SELL`: call `executeMarketOrder(symbol, 'SELL', quantity, currentPrice, apiKey, secretKey)`
- [x] **4.9** Handle `CANCEL_ORDER`: call `cancelOrder(symbol, orderId, apiKey, secretKey)`
- [x] **4.10** Handle `HOLD`: skip execution, return success with no order
- [x] **4.11** If action fails, log error but continue with remaining actions (partial failure handling)
- [x] **4.12** Create `src/lib/execution/orderValidator.ts` file
- [x] **4.13** Implement `validateRiskLimits(actions: Action[], openOrders: OpenOrder[], balances: Balance[], currentPrice: number): { allowed: boolean, errors: string[] }`
- [x] **4.14** Enforce max 3 open orders per agent (existing + new orders from actions)
- [x] **4.15** Enforce max 50% portfolio exposure (calculate total capital in pending + new orders)
- [x] **4.16** Prevent duplicate orders at same price (check existing open orders)
- [x] **4.17** Validate limit prices are within ±5% of current market price
- [x] **4.18** Validate minimum order value ($10 USD) for all PLACE actions
- [x] **4.19** Call `validateRiskLimits` before executing any actions in `executeActions`

### 5.0 Update Prompt Engineering (All Agents)
- [x] **5.1** Create `src/lib/prompts/openOrdersFormatter.ts` file
- [x] **5.2** Implement `formatOpenOrders(openOrders: OpenOrder[]): string` - formats open orders for prompt display
- [x] **5.3** Format each order as: `"Order #{orderId}: {SIDE} {quantity} BTC @ ${price} (Placed {age} ago, Status: {status})"`
- [x] **5.4** Limit to 10 most recent open orders if more than 10 exist
- [x] **5.5** In `src/lib/prompts/tradingPromptBuilder.ts`, update `buildSystemPrompt()`: remove "Use MARKET orders only"
- [x] **5.6** Add limit order guidelines to system prompt: when to use MARKET vs LIMIT orders
- [x] **5.7** Add multi-action instructions to system prompt with examples (cancel + place, laddering)
- [x] **5.8** Add plan update requirement to system prompt: "You MUST update your plan field on every cycle"
- [x] **5.9** Add risk limit warnings to system prompt: max 3 open orders, max 50% exposure, ±5% price limits
- [x] **5.10** Update `buildUserPrompt()` to add "=== YOUR PREVIOUS PLAN ===" section at top
- [x] **5.11** Load agent plan using `loadPlan(agentName)` and display with last updated timestamp
- [x] **5.12** Add "=== OPEN ORDERS ===" section to user prompt
- [x] **5.13** Query `getOpenOrders(symbol, apiKey, secretKey)` and format using `formatOpenOrders()`
- [x] **5.14** Calculate and display current exposure: sum of (openOrder.price × openOrder.quantity)
- [x] **5.15** Display exposure as: `"Current Exposure: ${exposed} / ${portfolioValue} ({percent}% of portfolio)"`
- [x] **5.16** Update trade history formatting to show order type: `"BUY LIMIT @ $67,000 | Filled @ $67,050 | +0.001 BTC | +$15.50 P&L"`
- [x] **5.17** Update `src/lib/council/prompts.ts` with same changes (steps 5.5-5.9) for council agents
- [x] **5.18** Add plan display in council proposal phase prompts

### 6.0 Migrate Trading Agents to New Schema
- [x] **6.1** Update `src/lib/openai/tradingAgent.ts` - add `agentName: 'openai'` parameter
- [x] **6.2** Load previous plan at start of cycle: `const previousPlan = await loadPlan('openai')`
- [x] **6.3** Pass previousPlan to `buildTradingPrompt()` via new marketData field
- [x] **6.4** Query open orders: `const openOrders = await getOpenOrders('BTCUSDT', apiKey, secretKey)`
- [x] **6.5** Pass openOrders to `buildTradingPrompt()` via new marketData field
- [x] **6.6** Update `TradingDecisionSchema` Zod schema to match new structure (actions array, plan field)
- [x] **6.7** After receiving decision from OpenAI, save plan: `await savePlan('openai', decision.plan)`
- [x] **6.8** Replace single order execution with `executeActions(decision.actions, currentPrice, balances, apiKey, secretKey)`
- [ ] **6.9** Update trade history logging to include orderType, limitPrice, plan for each filled order
- [x] **6.10** Repeat steps 6.1-6.9 for `src/lib/xai/tradingAgentGrok.ts` with agentName: 'grok'
- [x] **6.11** Update Grok JSON schema to include actions array and plan field
- [x] **6.12** Repeat steps 6.1-6.9 for `src/lib/openrouter/tradingAgentGemini.ts` with agentName: 'gemini'
- [x] **6.13** Update Gemini JSON schema to include actions array and plan field
- [x] **6.14** Update `src/lib/council/adapters.ts` - OpenAI adapter with agentName: 'council-openai'
- [x] **6.15** Update council OpenAI adapter schema (Zod) for actions and plan
- [x] **6.16** Add plan loading/saving to council OpenAI adapter's proposal and revision phases
- [x] **6.17** Update council Grok adapter with agentName: 'council-grok' and new schema
- [x] **6.18** Update council Gemini adapter with agentName: 'council-gemini' and new schema
- [x] **6.19** Update council orchestrator to pass open orders and plans to all adapters
- [x] **6.20** Update final council execution to use `executeActions()` instead of single order execution

### 7.0 Build UI Components for Limit Orders & Plans
- [x] **7.1** Create `src/app/components/AgentPlanCard.tsx` component
- [x] **7.2** Component receives: `agentName: string, plan: string, lastUpdated: string, color: string`
- [x] **7.3** Display plan in card with agent name, update timestamp, and expandable text
- [x] **7.4** Use Saber Purple (#8A5CFF) background for plan cards
- [x] **7.5** Add "Updated X hours ago" relative timestamp formatting
- [x] **7.6** Create `src/app/components/OpenOrdersTable.tsx` component
- [x] **7.7** Component receives: `openOrders: Array<{ agent, side, price, quantity, age, status }>`
- [x] **7.8** Display table with columns: Agent, Side, Price, Quantity, Age, Status
- [x] **7.9** Use Droid Silver (#B7C0CE) borders for table styling
- [x] **7.10** Add optional "Cancel" button for manual intervention (calls API to cancel order)
- [x] **7.11** Update `src/app/components/LatestDecisions.tsx` to show order type badges
- [x] **7.12** For LIMIT orders, display: `"LIMIT BUY @ $67,000"` in blue badge (#2FD1FF)
- [x] **7.13** For MARKET orders, keep existing green/red badges
- [x] **7.14** Show limitPrice field if action is LIMIT order
- [x] **7.15** Update `src/app/components/TradeHistory.tsx` to add "Type" column
- [x] **7.16** Add "Limit Price" column that shows requested price for limit orders
- [x] **7.17** Add "Price Improvement" column that shows ± difference for filled limit orders
- [x] **7.18** Format price improvement as: `+$15.50` (green) or `-$5.00` (red)
- [x] **7.19** Create `src/app/api/open-orders/route.ts` API endpoint
- [x] **7.20** Endpoint returns open orders for all agents combined
- [x] **7.21** Create `src/app/api/agent-plans/route.ts` API endpoint
- [x] **7.22** Endpoint returns current plans for all agents
- [x] **7.23** Add AgentPlanCard and OpenOrdersTable to main dashboard page

### 8.0 Testing & Validation
- [ ] **8.1** Test limit order placement: run `node test-limit-orders.js` to verify Binance integration works
- [ ] **8.2** Create `src/__tests__/agentPlans.test.ts` - test plan save/load/validation
- [ ] **8.3** Test plan persistence: save plan, load plan, verify contents match
- [ ] **8.4** Test plan returns null for non-existent agent
- [ ] **8.5** Create `src/__tests__/multiActionExecutor.test.ts` - test action execution
- [ ] **8.6** Test PLACE_LIMIT_BUY action executes correctly with mock Binance client
- [ ] **8.7** Test CANCEL_ORDER action calls cancelOrder with correct orderId
- [ ] **8.8** Test partial failure: if one action fails, remaining actions still execute
- [ ] **8.9** Test risk validation: max 3 orders limit is enforced
- [ ] **8.10** Test risk validation: max 50% exposure limit is enforced
- [ ] **8.11** Test risk validation: duplicate price prevention works
- [ ] **8.12** Test risk validation: ±5% price limit is enforced
- [ ] **8.13** Test OpenAI agent with new schema: place limit order, verify it appears in open orders
- [ ] **8.14** Test plan continuity: run agent twice, verify second run sees previous plan in prompt
- [ ] **8.15** Test multi-action: agent cancels old order and places new limit order in same cycle
- [ ] **8.16** Test UI: verify AgentPlanCard displays correctly with mock data
- [ ] **8.17** Test UI: verify OpenOrdersTable displays open orders correctly
- [ ] **8.18** Test UI: verify limit order badges show in LatestDecisions component
- [ ] **8.19** Integration test: full cycle with OpenAI agent placing limit order, updating plan, seeing it next cycle
- [ ] **8.20** Manual test: trigger all 4 agents (OpenAI, Grok, Gemini, Council) and verify plans are separate

---

**Phase 2 Complete:** All sub-tasks generated.

Total: **8 parent tasks**, **146 sub-tasks**

Ready to start implementation! 🚀
