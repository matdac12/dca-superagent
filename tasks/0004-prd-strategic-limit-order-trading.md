# PRD: Strategic Limit Order Trading with Agent Memory

**Document ID:** 0004
**Feature Name:** Strategic Limit Order Trading
**Created:** 2025-10-16
**Status:** Draft
**Target Audience:** Junior Developer

---

## 1. Introduction/Overview

Currently, all trading agents (OpenAI, Grok, Gemini, Council) execute **market orders only**, which means orders execute immediately at the current market price. This PRD introduces **limit orders** and **strategic planning with memory**, enabling agents to:

- Place limit orders at specific target prices (better execution)
- Maintain a strategic plan across trading cycles
- Manage multiple open orders simultaneously (cancel, modify, place new)
- Behave like human traders with memory and strategy

### Problem Statement
Market orders provide no price control and can result in poor execution during volatile periods. Agents currently have no memory of their strategy between cycles, making them reactive rather than strategic.

### Solution
Implement limit order support, a multi-action system for order management, and a persistent "plan" that agents maintain and update across cycles. Each agent queries Binance for open orders at the start of each cycle, sees filled orders in trade history, and makes strategic decisions about continuing or adjusting their plan.

---

## 2. Goals

1. **Enable Limit Orders:** Agents can place limit buy/sell orders at specific prices
2. **Strategic Memory:** Each agent maintains a plan (text-based) that persists across cycles
3. **Multi-Order Management:** Agents can manage multiple simultaneous orders (place, cancel, modify)
4. **Human-Like Behavior:** Agents decide when to use market vs limit orders based on market conditions
5. **Order Visibility:** Agents see all open orders and filled orders in their decision context
6. **Risk Controls:** Conservative limits on open orders and capital allocation
7. **Individual Agent Plans:** Each agent (OpenAI, Grok, Gemini, plus Council members) has their own plan

---

## 3. User Stories

### As a Trading Agent (AI)
- **US-1:** As an agent, I want to place limit buy orders below current price so I can get better entry prices
- **US-2:** As an agent, I want to place limit sell orders above current price so I can maximize profits
- **US-3:** As an agent, I want to see all my open orders at the start of each cycle so I can decide whether to keep or cancel them
- **US-4:** As an agent, I want to maintain a strategic plan so I remember my trading thesis across cycles
- **US-5:** As an agent, I want to update my plan every cycle so I can adapt to changing market conditions
- **US-6:** As an agent, I want to place multiple limit orders at different prices so I can ladder my entries
- **US-7:** As an agent, I want to cancel outdated orders when market conditions change
- **US-8:** As an agent, I want to see which orders filled so I know my current position
- **US-9:** As an agent, I want to switch from limit to market order when urgency increases

### As a Trader (Human User)
- **US-10:** As a trader, I want to see each agent's current plan so I understand their strategy
- **US-11:** As a trader, I want to see open orders for each agent so I know what's pending
- **US-12:** As a trader, I want to see limit price vs execution price so I can measure performance
- **US-13:** As a trader, I want to see order fill rates so I can evaluate agent effectiveness

---

## 4. Functional Requirements

### 4.1 Schema Changes

**FR-1:** Add `limitPrice?: number` field to `TradingDecision` schema
- Optional field
- If `undefined`, execute as market order
- If provided, execute as limit order at specified price

**FR-2:** Add `plan: string` field to agent decision output
- Freeform text, 2-4 sentences
- Agent describes current strategy and what they're waiting for
- Must be updated on every cycle (even if plan stays the same)
- Example: _"Waiting for RSI to drop below 30 before entering. Bollinger Bands showing compression, expecting breakout. Target entry: $67,000. Will reassess if price moves above $69,000."_

**FR-3:** Add `actions: Action[]` field to support multi-action decisions
- Array of actions agent wants to take in this cycle
- Actions can be:
  - `PLACE_LIMIT_BUY`
  - `PLACE_LIMIT_SELL`
  - `PLACE_MARKET_BUY`
  - `PLACE_MARKET_SELL`
  - `CANCEL_ORDER`
  - `HOLD`
- Each action has relevant parameters (price, quantity, orderId)

**FR-4:** Update TypeScript types in `src/types/trading.ts`:
```typescript
interface Action {
  type: 'PLACE_LIMIT_BUY' | 'PLACE_LIMIT_SELL' | 'PLACE_MARKET_BUY' | 'PLACE_MARKET_SELL' | 'CANCEL_ORDER' | 'HOLD';
  orderId?: string;        // For CANCEL_ORDER
  price?: number;          // For LIMIT orders
  quantity?: number;       // For PLACE orders
  asset: string;           // e.g., 'BTCUSDT'
  reasoning: string;       // Why this action
}

interface TradingDecision {
  actions: Action[];       // NEW: Array of actions
  plan: string;            // NEW: Agent's strategic plan
  reasoning: string;       // Overall reasoning for this cycle
}
```

**FR-5:** Update Zod schema to validate new structure with proper constraints

### 4.2 Binance API Integration

**FR-6:** Create `getOpenOrders(symbol: string, apiKey?: string, secretKey?: string): Promise<OpenOrder[]>` function
- Queries Binance testnet for all open orders for the agent
- Returns array of open orders with orderId, price, quantity, side, status

**FR-7:** Create `executeLimitOrder(symbol, side, quantity, price, apiKey?, secretKey?): Promise<OrderResult>` function
- Places limit order on Binance
- Uses `timeInForce: 'GTC'` (Good Till Cancel) by default
- Returns orderId, price, quantity, status

**FR-8:** Create `cancelOrder(symbol, orderId, apiKey?, secretKey?): Promise<CancelResult>` function
- Cancels specific order by orderId
- Handles case where order already filled (returns error)

**FR-9:** Update `validateAndExecuteOrder()` to support multi-action execution
- Iterate through actions array
- Execute each action sequentially
- Collect results for all actions
- Handle partial failures (e.g., cancel fails but place succeeds)

### 4.3 Plan Storage & Retrieval

**FR-10:** Create plan storage directory: `data/agent-plans/`
- Separate JSON file per agent: `openai-plan.json`, `grok-plan.json`, `gemini-plan.json`, `council-openai-plan.json`, etc.

**FR-11:** Create `savePlan(agentName: string, plan: string): Promise<void>` function
- Saves plan to file with timestamp
- Structure:
```json
{
  "agentName": "openai",
  "plan": "Waiting for RSI < 30...",
  "lastUpdated": "2025-10-16T09:00:00Z",
  "cycleNumber": 42
}
```

**FR-12:** Create `loadPlan(agentName: string): Promise<string | null>` function
- Loads most recent plan for agent
- Returns null if no plan exists (first cycle)

**FR-13:** Council members maintain independent plans
- `council-openai-plan.json`
- `council-grok-plan.json`
- `council-gemini-plan.json`
- Plans visible during council debate but each agent updates their own

### 4.4 Prompt Engineering

**FR-14:** Add "Open Orders" section to prompt
- Query Binance API at start of each cycle
- Display all open orders with orderId, price, quantity, age
- Example format:
```
=== OPEN ORDERS ===
1. Order #3201793: BUY 0.001 BTC @ $67,000 (Placed 2 hours ago, Status: NEW)
2. Order #3201888: BUY 0.002 BTC @ $66,500 (Placed 4 hours ago, Status: NEW)
```

**FR-15:** Add "Previous Plan" section to prompt
- Load agent's last plan from storage
- Display at top of prompt so agent sees their prior strategy
- Example:
```
=== YOUR PREVIOUS PLAN ===
"Waiting for RSI to drop below 30 before entering. Bollinger Bands showing compression, expecting breakout. Target entry: $67,000. Will reassess if price moves above $69,000."
(Last updated: 4 hours ago)
```

**FR-16:** Update system prompt to include limit order guidance
- Remove "Use MARKET orders only" constraint
- Add guidelines:
  - Use LIMIT orders when you want price control and have time
  - Use MARKET orders when urgency is high or you must execute now
  - Consider spread, volatility, and order book depth
  - Limit orders should be within ±10% of current price (risk control)

**FR-17:** Add multi-action instructions to prompt
- Explain actions array structure
- Provide examples:
  - Cancel old order + place new limit order
  - Place multiple limit buys at different prices (laddering)
  - Switch from limit to market

**FR-18:** Add plan update requirement to prompt
- Agent MUST update plan field on every cycle
- Even if sticking to same plan, must acknowledge it
- Example: _"Sticking to plan. RSI still at 45, waiting for < 30. No action taken."_

**FR-19:** Update trade history section to show order type and limit price
- Format: `"BUY LIMIT @ $67,000 | Filled @ $67,050 | +0.001 BTC | +$15.50 P&L"`
- Shows: order type, requested price, actual fill price, P&L

### 4.5 Risk Management

**FR-20:** Enforce conservative risk limits (Phase 1):
- Max 3 open orders per agent
- Max 50% of portfolio value allocated to pending orders
- Limit prices must be within ±5% of current market price

**FR-21:** Validate order quantity meets Binance minimums
- Minimum order value: $10 USD
- Check quantity precision (LOT_SIZE filter)
- Check minimum notional (MIN_NOTIONAL filter)

**FR-22:** Prevent duplicate orders at same price
- If agent already has open order at $67,000, don't allow another at $67,000
- Warn agent in prompt if attempting duplicate

**FR-23:** Track total capital exposure
- Calculate: `exposedCapital = sum(openOrder.quantity * openOrder.price)`
- Display in prompt: _"Current Exposure: $2,500 / $10,000 (25% of portfolio)"_

### 4.6 Trade History Integration

**FR-24:** Update `TradeRecord` interface to include:
```typescript
interface TradeRecord {
  // ... existing fields
  orderType: 'MARKET' | 'LIMIT';
  limitPrice?: number;          // Requested limit price
  executedPrice: number;        // Actual fill price
  priceImprovement?: number;    // Difference (positive = better)
  plan: string;                 // Agent's plan at time of trade
}
```

**FR-25:** Calculate price improvement for filled limit orders
- `priceImprovement = (executedPrice - limitPrice) * quantity` for buys
- `priceImprovement = (limitPrice - executedPrice) * quantity` for sells
- Display in UI and trade history

**FR-26:** Agents see filled orders in trade history section of prompt
- Most recent 10 trades, including those filled since last cycle
- Agent can infer which orders filled by comparing open orders vs history

### 4.7 Order Lifecycle Management

**FR-27:** No automatic order cancellation
- Orders persist until agent explicitly cancels or order fills
- Agent sees open orders in every prompt and decides what to do

**FR-28:** Handle "order already filled" error gracefully
- If agent tries to cancel order that filled, return informative error
- Agent sees filled order in next cycle's trade history

**FR-29:** Handle "order already cancelled" error
- If agent tries to cancel already-cancelled order, skip silently

**FR-30:** Orders don't auto-expire
- GTC (Good Till Cancel) means orders stay open indefinitely
- Agent responsible for managing order lifetime

### 4.8 Council Mode

**FR-31:** Each council participant maintains separate plan
- OpenAI council member: `council-openai-plan.json`
- Grok council member: `council-grok-plan.json`
- Gemini council member: `council-gemini-plan.json`

**FR-32:** Council debate includes each member's plan
- During proposal phase, each agent states their plan
- During critique phase, agents can challenge each other's plans
- During revision phase, agents can update their plans

**FR-33:** Council final decision includes consensus plan
- Combined reasoning from all three agents
- Execution follows same multi-action system

### 4.9 UI/UX Requirements

**FR-34:** Display limit price in decision cards
- Show "LIMIT BUY @ $67,000" instead of just "BUY"
- Badge color: limit orders = blue, market orders = green/red

**FR-35:** Add "Agent Plan" section to dashboard
- Card showing each agent's current plan
- Last updated timestamp
- Expandable/collapsible

**FR-36:** Add "Open Orders" dashboard section
- Table showing all open orders across all agents
- Columns: Agent, Type, Price, Quantity, Age, Status
- Action button: "Cancel Order" (for manual intervention)

**FR-37:** Show price improvement metrics
- In performance cards, show average price improvement
- Example: _"Avg Price Improvement: +$125.50 per trade"_

**FR-38:** Update trade history table to show order types
- Add "Type" column (MARKET / LIMIT)
- Add "Limit Price" column (for limit orders)
- Add "Price Improvement" column (for filled limit orders)

---

## 5. Non-Goals (Out of Scope)

**NG-1:** Futures or margin trading (spot only)
**NG-2:** Stop-loss orders (not needed for spot trading)
**NG-3:** Automated order execution without agent decision
**NG-4:** Cross-agent plan coordination (agents are independent)
**NG-5:** Webhook/real-time order fill notifications (poll-based only)
**NG-6:** Advanced order types (OCO, Iceberg, etc.)
**NG-7:** Backtesting or simulation of limit orders
**NG-8:** Mobile app support (web only)
**NG-9:** Order modification API (cancel + replace only)
**NG-10:** Historical plan tracking (keep only latest plan)

---

## 6. Design Considerations

### 6.1 UI Components

**Agent Plan Card:**
```
┌─────────────────────────────────────────┐
│ 🤖 OpenAI Strategy Plan                │
│ Updated: 2 hours ago                    │
├─────────────────────────────────────────┤
│ "Waiting for RSI to drop below 30      │
│ before entering. Bollinger Bands       │
│ showing compression, expecting         │
│ breakout. Target entry: $67,000."      │
└─────────────────────────────────────────┘
```

**Open Orders Table:**
```
┌──────────┬──────┬──────────┬──────────┬─────────┬────────┐
│ Agent    │ Side │ Price    │ Quantity │ Age     │ Status │
├──────────┼──────┼──────────┼──────────┼─────────┼────────┤
│ OpenAI   │ BUY  │ $67,000  │ 0.001 BTC│ 2h ago  │ NEW    │
│ Grok     │ SELL │ $72,000  │ 0.002 BTC│ 30m ago │ NEW    │
└──────────┴──────┴──────────┴──────────┴─────────┴────────┘
```

**Order Type Badges:**
- `LIMIT BUY` → Blue badge with target price
- `MARKET BUY` → Green badge
- `LIMIT SELL` → Orange badge with target price
- `MARKET SELL` → Red badge

### 6.2 Color System
- Limit orders: `#2FD1FF` (Hyperspace Blue)
- Market orders: `#3DFFB8` (Holo Green) / `#FF4D6D` (Nova Red)
- Plans: `#8A5CFF` (Saber Purple) background
- Open orders: `#B7C0CE` (Droid Silver) borders

---

## 7. Technical Considerations

### 7.1 Binance API Rate Limits
- Open orders query: 10 requests per minute per API key
- Solution: Cache open orders for 30 seconds between cycles
- Each agent has separate API keys (avoid conflicts)

### 7.2 Plan Storage
- Use JSON files for simplicity (no database needed yet)
- File locking not needed (single-threaded execution)
- Future: Move to SQLite if history tracking needed

### 7.3 Multi-Action Execution Order
- Actions execute sequentially in array order
- If action fails, log error but continue with remaining actions
- Return summary of successes/failures

### 7.4 Prompt Size Management
- Open orders list limited to 10 most recent
- Trade history limited to 10 most recent
- Plan limited to 500 characters (enforced in schema)

### 7.5 Error Handling
- Binance API timeout: Retry once, then fail gracefully
- Order already filled: Log and skip (not an error)
- Insufficient balance: Return error to agent, agent sees in next cycle
- Invalid limit price: Validate before sending to Binance

### 7.6 Agent API Keys
- Each agent should have dedicated Binance testnet keys
- Environment variables:
  - `BINANCE_OPENAI_API_KEY`, `BINANCE_OPENAI_SECRET_KEY`
  - `BINANCE_GROK_API_KEY`, `BINANCE_GROK_SECRET_KEY`
  - `BINANCE_GEMINI_API_KEY`, `BINANCE_GEMINI_SECRET_KEY`
  - `BINANCE_COUNCIL_API_KEY`, `BINANCE_COUNCIL_SECRET_KEY`

### 7.7 Structured Output Changes
- **OpenAI:** Update Zod schema for `TradingDecisionSchema`
- **Grok/Gemini:** Update JSON Schema for structured outputs
- **Council:** Update all 3 adapters (OpenAI, Grok, Gemini) separately

---

## 8. Success Metrics

**SM-1:** Limit Order Adoption Rate
- Target: 40%+ of trades use limit orders (vs market)
- Measure: `COUNT(orderType = 'LIMIT') / COUNT(*)`

**SM-2:** Limit Order Fill Rate
- Target: 60%+ of limit orders fill within 24 hours
- Measure: Track orders placed vs filled

**SM-3:** Price Improvement
- Target: Average +$50 per limit order vs market price
- Measure: `AVG(priceImprovement)` for filled limit orders

**SM-4:** Plan Continuity
- Target: Agents update plan 100% of cycles
- Measure: Check plan update timestamp vs cycle execution

**SM-5:** Order Management Efficiency
- Target: <5% of orders cancelled after placement
- Measure: `COUNT(cancelled) / COUNT(placed)`

**SM-6:** Multi-Order Usage
- Target: 20%+ of agents maintain 2+ open orders simultaneously
- Measure: Track open order count per agent per cycle

**SM-7:** Error Rate
- Target: <1% of order executions fail
- Measure: Failed orders / total attempted orders

---

## 9. Open Questions

**OQ-1:** Should we add a "confidence score" field to limit orders?
- Agent indicates confidence (0-100%) that order will fill
- Could inform UI display priority

**OQ-2:** How do we handle Binance API failures during order query?
- Use cached open orders from previous cycle?
- Fail safe and show error to agent?

**OQ-3:** Should plans have version history for debugging?
- Currently only storing latest plan
- Would plan history help with agent performance analysis?

**OQ-4:** Do we need a "max order age" warning in prompt?
- Example: Warn agent if order is >48 hours old
- Help agents clean up stale orders

**OQ-5:** Should we implement order priority/ranking?
- If agent has 3 open orders, which is most important?
- Could help with capital allocation decisions

**OQ-6:** What happens if two agents try to use same API keys?
- Race condition risk
- Need clear documentation on separate keys

**OQ-7:** Should we log prompt content for debugging?
- Useful for understanding agent decisions
- Privacy/storage considerations

**OQ-8:** How do we handle "order partially filled" scenario?
- Binance reports partial fills
- Should agent see remaining quantity vs original?

---

## 10. Implementation Phases

### Phase 1: Foundation (Week 1)
- FR-1 to FR-9: Schema + Binance integration
- FR-10 to FR-13: Plan storage
- Test with single agent (OpenAI)

### Phase 2: Prompt Engineering (Week 2)
- FR-14 to FR-19: Update prompts
- FR-20 to FR-23: Risk management
- Test multi-action system

### Phase 3: All Agents (Week 3)
- Apply to Grok, Gemini
- FR-31 to FR-33: Council mode
- FR-24 to FR-30: Order lifecycle

### Phase 4: UI/UX (Week 4)
- FR-34 to FR-38: Dashboard updates
- Design components
- User testing

---

## Appendix A: Example Multi-Action Decision

```json
{
  "actions": [
    {
      "type": "CANCEL_ORDER",
      "orderId": "3201793",
      "asset": "BTCUSDT",
      "reasoning": "Entry price too high given new resistance level"
    },
    {
      "type": "PLACE_LIMIT_BUY",
      "price": 66500,
      "quantity": 0.001,
      "asset": "BTCUSDT",
      "reasoning": "New target entry at support confluence"
    },
    {
      "type": "PLACE_LIMIT_BUY",
      "price": 66000,
      "quantity": 0.002,
      "asset": "BTCUSDT",
      "reasoning": "Ladder second entry at psychological level"
    }
  ],
  "plan": "Adjusted strategy to ladder entries at $66.5k and $66k support levels. RSI showing bearish divergence, waiting for oversold bounce. Will reassess if breaks below $65k.",
  "reasoning": "Market showing weakness after rejection at $69k. Cancelled previous order and repositioning at stronger support levels with laddered entries for better average price."
}
```

---

## Appendix B: Prompt Template Changes

**Before (Current):**
```
- Only trade BTC/USDT spot (no futures/leverage)
- Use MARKET orders only
```

**After (New):**
```
- Only trade BTC/USDT spot (no futures/leverage)
- Choose between MARKET and LIMIT orders based on conditions:
  * LIMIT: When you want price control and have time (low urgency)
  * MARKET: When immediate execution is critical (high urgency, stop loss)
- Limit orders must be within ±5% of current price (risk control)
- You can place multiple orders at different prices (laddering)
- Always review your open orders and cancel stale ones
```

---

**END OF PRD**
