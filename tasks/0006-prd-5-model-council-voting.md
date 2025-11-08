# PRD: 5-Model Council Voting System

## Introduction/Overview

Implement a simplified 2-phase council system where 5 AI models (OpenAI GPT-5-Nano, Grok 4 Fast, Gemini 2.5 Flash, Kimi K2 Thinking, DeepSeek Chat v3) collaboratively make BTC/ADA accumulation decisions through proposal generation and ranked-choice voting.

**Problem**: The current 4-phase council system (Propose → Critique → Revise → Vote) is complex, slow, and requires 20 LLM calls per decision (4 phases × 5 models). We need a streamlined approach that maintains collaborative intelligence while reducing complexity and cost.

**Solution**: Implement a 2-phase system (Propose → Vote) where models propose strategies independently, then rank all proposals. The winning proposal gets executed on the shared council portfolio.

## Goals

1. **Simplify Council Flow**: Reduce from 4 phases to 2 phases (50% fewer LLM calls)
2. **Enable 5-Model Consensus**: Support OpenAI, Grok, Gemini, Kimi, and DeepSeek working together
3. **Fair Voting System**: Implement 5-point ranked-choice voting (1st=5pts through 5th=1pt)
4. **Execution Integration**: Execute the winning proposal's actions on Binance testnet
5. **Debate Transparency**: Capture full voting matrix and metadata for UI display

## User Stories

1. As a **portfolio manager**, I want the council to consider 5 different AI perspectives so that I get more diverse accumulation strategies
2. As a **trader**, I want to see which model's proposal won and how each model voted so that I understand the decision-making process
3. As a **system operator**, I want faster council cycles (2 phases instead of 4) so that decisions complete in reasonable time
4. As a **developer**, I want clear separation between phases so that debugging and monitoring is straightforward

## Functional Requirements

### Phase 1: Proposal Generation

**FR1.1** The system must call all 5 models in parallel to generate proposals independently

**FR1.2** Each model must receive:
- Current portfolio state (USDT, BTC, ADA balances)
- Market data for both BTC and ADA (4h candles, indicators, order book)
- Recent trade history
- Market news/sentiment
- Open orders for both assets
- Their own previous plan (for continuity)

**FR1.3** Each proposal must include:
- One or more actions (PLACE_LIMIT_BUY, PLACE_LIMIT_SELL, PLACE_MARKET_BUY, PLACE_MARKET_SELL, CANCEL_ORDER, HOLD)
- Quantity and price (where applicable)
- Asset (BTCUSDT or ADAUSDT)
- Reasoning for each action
- Overall strategic plan

**FR1.4** Proposals must follow accumulation philosophy:
- 10+ year horizon
- HODL-only (never sell for profit-taking)
- Smart entry timing (skip pumps >15%, buy dips with RSI signals)
- Prefer LIMIT orders (2-5% below market) over MARKET orders
- Deploy 0-100% of available USDT based on market conditions

**FR1.5** System must normalize each proposal to extract:
- `normalizedAction`: BUY, SELL, HOLD, or CANCEL
- `quantity`: Total quantity across all actions
- `asset`: Primary asset being traded

### Phase 2: Voting

**FR2.1** The system must call all 5 models in parallel for voting

**FR2.2** Each model must receive all 5 proposals (including their own)

**FR2.3** Each model must rank ALL 5 proposals with unique ranks (1, 2, 3, 4, 5)

**FR2.4** Voting criteria must prioritize:
- Patient capital deployment (not impulsive)
- Smart timing (avoids buying after pumps)
- Good use of limit orders vs market orders
- Appropriate BTC/ADA allocation
- Data-driven reasoning with specific signals
- Long-term value maximization
- Conservative when uncertain (HOLD is acceptable)

**FR2.5** Each vote must include:
- Rank for each proposal (1-5)
- Reasoning for each ranking
- Overall voting rationale

**FR2.6** The system must tally votes using 5-point scoring:
- 1st place = 5 points
- 2nd place = 4 points
- 3rd place = 3 points
- 4th place = 2 points
- 5th place = 1 point

**FR2.7** The proposal with the highest total points wins

**FR2.8** In case of a tie, the system must select the most conservative option:
- HOLD > LIMIT orders > MARKET orders
- Lower capital deployment > Higher capital deployment

### Execution & Metadata

**FR3.1** The system must execute all actions from the winning proposal

**FR3.2** Each action execution must be validated against risk limits:
- No more than 3 open limit orders per asset
- Minimum $10 order value
- Sufficient balance for buy orders
- Sufficient holdings for sell orders

**FR3.3** The system must capture and store council metadata:
```typescript
{
  individualProposals: {
    openai: { action, reasoning, quantity, price, asset },
    grok: { action, reasoning, quantity, price, asset },
    gemini: { action, reasoning, quantity, price, asset },
    kimi: { action, reasoning, quantity, price, asset },
    deepseek: { action, reasoning, quantity, price, asset }
  },
  votingMatrix: {
    openai: { openai: 5, grok: 4, gemini: 3, kimi: 2, deepseek: 1 },
    grok: { ... },
    // ... all 5 models' rankings
  },
  voteScores: {
    openai: 18,
    grok: 24,  // Winner
    gemini: 13,
    kimi: 17,
    deepseek: 5
  },
  selectedModel: "grok",
  debateDurationMs: 12450
}
```

**FR3.4** Council metadata must be attached to trade history entries for UI display

**FR3.5** The system must save the winning model's plan for future continuity

### API Integration

**FR4.1** The system must support 3 LLM providers:
- **OpenAI**: Direct API (`/v1/chat/completions`)
- **xAI**: Direct API for Grok (`https://api.x.ai/v1`)
- **OpenRouter**: For Gemini, Kimi, DeepSeek (`https://openrouter.ai/api/v1`)

**FR4.2** All API calls must use structured outputs with JSON schema enforcement

**FR4.3** The system must handle API failures gracefully:
- If a model fails during proposals, exclude it from that round
- If a model fails during voting, use remaining votes for tallying
- Log all failures for debugging

**FR4.4** The system must implement 1-retry logic for transient failures

**FR4.5** Temperature must be 0.0 for all council calls (deterministic decisions)

### Error Handling

**FR5.1** If fewer than 3 models provide valid proposals, abort the cycle

**FR5.2** If fewer than 3 models provide valid votes, abort the cycle

**FR5.3** If the winning proposal fails risk validation, select the next highest-scoring proposal

**FR5.4** If all proposals fail risk validation, default to HOLD

**FR5.5** All errors must be logged with timestamps and model names

## Non-Goals (Out of Scope)

1. **Individual agent execution**: Only the council will make decisions, not individual agents
2. **Real-time streaming**: Council phases will complete sequentially, not streamed
3. **Historical debate replay**: Only store final results, not intermediate states
4. **Manual intervention**: No ability to override or veto council decisions mid-process
5. **Dynamic model selection**: Always use the same 5 models, no runtime changes
6. **Partial execution**: Either execute the full winning proposal or none of it

## Design Considerations

### UI Components (Already Implemented)
- `CouncilPerformanceDashboard`: Shows voting matrix, proposal details, and debate history
- `CouncilDebateSheet`: Displays individual proposals and vote reasoning
- `DebateViewer`: Renders phase-by-phase debate timeline

### Color Coding (Already Defined)
- OpenAI: Black (#0A0B10)
- Grok: Orange (#FF8C42)
- Gemini: Blue (#2FD1FF)
- Kimi: Green (#3DFFB8)
- DeepSeek: Red (#FF4D6D)
- Council: Gold (#FFD700)

## Technical Considerations

### Files to Modify

**Primary Implementation**:
1. `src/lib/council/tradingAgentCouncil.ts` - Main council orchestration (COMPLETE REWRITE)

**API Endpoints**:
2. `src/app/api/trading-agent-council/route.ts` - Council HTTP endpoint (UPDATE)

**Trading Cycle**:
3. `src/app/api/trading-cycle/route.ts` - Remove individual agents, keep only council (SIMPLIFY)

**Already Completed**:
- ✅ `src/lib/council/prompts.ts` - Prompts for 2-phase system
- ✅ `src/lib/council/types.ts` - TypeScript types for 5 models
- ✅ `src/config/agents.ts` - Agent configs with Kimi & DeepSeek

### Model Specifications

| Model | Provider | API | Model ID | Cost/1M tokens |
|-------|----------|-----|----------|----------------|
| OpenAI GPT-5-Nano | OpenAI | Direct | `gpt-5-nano` | ~$0.50 |
| Grok 4 Fast | xAI | Direct | `grok-4-fast` | ~$2.00 |
| Gemini 2.5 Flash | OpenRouter | Proxy | `google/gemini-2.5-flash` | ~$0.30 |
| Kimi K2 Thinking | OpenRouter | Proxy | `moonshotai/kimi-k2-thinking` | ~$1.50 |
| DeepSeek Chat v3 | OpenRouter | Proxy | `deepseek/deepseek-chat-v3-0324` | ~$0.10 |

**Total cost per council cycle**: ~$4.40 (10 calls: 5 proposals + 5 votes)

### Sequence Diagram

```
1. Council API Called
   ↓
2. Fetch Market Intelligence (BTC + ADA)
   ↓
3. PHASE 1: Call all 5 models in parallel
   - OpenAI proposes
   - Grok proposes
   - Gemini proposes (via OpenRouter)
   - Kimi proposes (via OpenRouter)
   - DeepSeek proposes (via OpenRouter)
   ↓
4. Normalize all proposals
   ↓
5. PHASE 2: Call all 5 models in parallel with proposals
   - Each model ranks all 5 proposals
   ↓
6. Tally votes (5-point scoring)
   ↓
7. Select winner (highest score, tie-break to most conservative)
   ↓
8. Execute winning proposal actions
   ↓
9. Save metadata + trade history
   ↓
10. Return CouncilOutput to API
```

### Parallel Execution Strategy

Use `Promise.allSettled()` for both phases to maximize speed:

```typescript
// Phase 1: Proposals
const proposalPromises = [
  callOpenAI(promptProposal),
  callGrok(promptProposal),
  callGeminiViaOpenRouter(promptProposal),
  callKimiViaOpenRouter(promptProposal),
  callDeepSeekViaOpenRouter(promptProposal)
];

const proposalResults = await Promise.allSettled(proposalPromises);

// Phase 2: Votes
const votePromises = models.map(model =>
  callModel(model, promptVote)
);

const voteResults = await Promise.allSettled(votePromises);
```

### OpenRouter Headers

```typescript
{
  "HTTP-Referer": "https://tradewarriors.dev",
  "X-Title": "TradeWarriors",
  "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
}
```

### Structured Output Schema

All models must return JSON matching `TradingDecisionSchema`:

```typescript
{
  actions: Array<{
    type: "PLACE_LIMIT_BUY" | "PLACE_LIMIT_SELL" | "PLACE_MARKET_BUY" | "PLACE_MARKET_SELL" | "CANCEL_ORDER" | "HOLD",
    asset?: string,
    quantity?: number,
    price?: number,
    orderId?: string,
    reasoning: string
  }>,
  plan: string,
  reasoning: string
}
```

Votes must return:

```typescript
{
  rankings: Array<{
    modelName: "OpenAI" | "Grok" | "Gemini" | "Kimi" | "DeepSeek",
    rank: 1 | 2 | 3 | 4 | 5,
    reasoning: string
  }>,
  reasoning: string
}
```

## Success Metrics

1. **Cycle Time**: Council decisions complete in <30 seconds (down from ~60s with 4 phases)
2. **Success Rate**: ≥95% of council cycles produce valid proposals and votes
3. **Diversity**: No single model wins >60% of votes (ensures balanced influence)
4. **Execution Success**: ≥95% of winning proposals execute without errors
5. **Cost Efficiency**: <$5 per council decision (vs current ~$8 with 4 phases)

## Open Questions

1. **Tie-breaking logic refinement**: Should we add more tie-break criteria beyond "most conservative"?
   - Suggestion: First-place votes count, then median quantity, then alphabetical by model name

2. **Partial failure handling**: If 2 models fail proposals but 3 succeed, should we continue or abort?
   - Recommendation: Continue if ≥3 models succeed

3. **Vote manipulation protection**: Should we detect and penalize models that always vote for themselves first?
   - Recommendation: Log voting patterns but don't enforce, rely on model objectivity

4. **Performance monitoring**: Should we track which models' proposals win most often?
   - Recommendation: Yes, add to council statistics API

5. **Emergency override**: Should there be a manual way to force HOLD if all proposals look risky?
   - Recommendation: Not in v1, add to future iteration if needed

## Implementation Checklist

- [ ] Rewrite `src/lib/council/tradingAgentCouncil.ts` for 2-phase flow
  - [ ] Phase 1: Parallel proposal generation (5 models)
  - [ ] Proposal normalization
  - [ ] Phase 2: Parallel voting (5 models)
  - [ ] Vote tallying with 5-point scoring
  - [ ] Winner selection with tie-break logic
  - [ ] Execution of winning proposal
  - [ ] Metadata capture and storage
- [ ] Update `src/app/api/trading-agent-council/route.ts`
  - [ ] Simplify to call new 2-phase council
  - [ ] Return full debate metadata
- [ ] Update `src/app/api/trading-cycle/route.ts`
  - [ ] Remove individual agent calls
  - [ ] Keep only council execution
  - [ ] Update documentation
- [ ] Test with all 5 models on testnet
  - [ ] Verify proposals are diverse
  - [ ] Verify voting is objective
  - [ ] Verify execution succeeds
  - [ ] Verify metadata is captured
- [ ] Monitor first 10 production cycles
  - [ ] Check for API failures
  - [ ] Measure cycle time
  - [ ] Verify vote distribution
  - [ ] Review trade history metadata

## Notes

- All 5 models share the same Binance account (`BINANCE_COUNCIL_API_KEY`)
- This is ONE portfolio managed by consensus, not 6 separate portfolios
- Council runs every 8 hours (3x daily: 8 AM, 4 PM, Midnight UTC)
- Previous 4-phase debate history will be incompatible with new 2-phase format
- Consider adding migration to mark old debates as "archived" in UI
