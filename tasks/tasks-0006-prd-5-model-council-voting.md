# Tasks: 5-Model Council Voting System

**Status**: ✅ Implementation Complete (Commit: `17ca073`)
**Completed**: 2025-11-08
**Ready for**: End-to-end testing (Task 5.0)

## Relevant Files

- `trade-wars/src/lib/council/councilDebate.ts` - ✅ Main council orchestration logic (COMPLETE REWRITE for 2-phase flow)
- `trade-wars/src/lib/council/adapters.ts` - ✅ LLM adapter implementations (ADD Kimi & DeepSeek, SIMPLIFY to 2 phases)
- `trade-wars/src/app/api/trading-agent-council/route.ts` - ✅ Council API endpoint (UPDATE metadata handling)
- `trade-wars/src/app/api/trading-cycle/route.ts` - ✅ Trading cycle orchestrator (SIMPLIFY to council-only)
- `trade-wars/src/lib/council/prompts.ts` - ✅ Already updated for 2-phase system
- `trade-wars/src/lib/council/types.ts` - ✅ Already updated for 5 models

### Notes

- All 5 models share the same Binance account credentials (`BINANCE_COUNCIL_API_KEY`)
- This is ONE portfolio managed by consensus, not multiple portfolios
- `OPENROUTER_API_KEY` is configured in `.env` for Kimi and DeepSeek access via OpenRouter
- Existing UI components (CouncilPerformanceDashboard, DebateViewer) will need metadata format updates
- Old 4-phase debate history will be incompatible with new 2-phase format

## Tasks

- [x] 1.0 Rewrite council debate orchestration for 2-phase, 5-model system
  - [x] 1.1 Remove critique and revision phase logic from `councilDebate.ts`
  - [x] 1.2 Update `DEFAULT_CONFIG` to include all 5 models: ['OpenAI', 'Grok', 'Gemini', 'Kimi', 'DeepSeek']
  - [x] 1.3 Simplify `runCouncilDebate()` function to only handle Proposal → Vote flow
  - [x] 1.4 Update `normalizeModelName()` helper to recognize Kimi and DeepSeek model names
  - [x] 1.5 Remove `checkConsensus()` function (no longer needed with voting system)
  - [x] 1.6 Update Phase 1 (Proposals) to call all 5 models in parallel using `Promise.allSettled()`
  - [x] 1.7 Add proposal normalization to extract `normalizedAction`, `quantity`, and `asset` from each proposal
  - [x] 1.8 Update Phase 2 (Voting) to pass all 5 proposals to all 5 models for ranking
  - [x] 1.9 Ensure each model receives all proposals including their own (models must rank ALL 5)
  - [x] 1.10 Add error handling for models that fail during proposals (minimum 3 models required)
  - [x] 1.11 Add error handling for models that fail during voting (minimum 3 votes required)
  - [x] 1.12 Update timeout configurations for 2-phase system (reduce from 240s to 120s global)

- [x] 2.0 Update LLM adapters to support 5 models and 2 phases
  - [x] 2.1 Add `KimiAdapter` class to `adapters.ts` using OpenRouter API
  - [x] 2.2 Add `DeepSeekAdapter` class to `adapters.ts` using OpenRouter API
  - [x] 2.3 Configure OpenRouter client with correct headers (HTTP-Referer, X-Title, Authorization)
  - [x] 2.4 Update `buildPromptContext()` to handle dual-asset data (BTC + ADA)
  - [x] 2.5 Remove `critique()` method from OpenAIAdapter, GrokAdapter, and GeminiAdapter
  - [x] 2.6 Remove `revise()` method from OpenAIAdapter, GrokAdapter, and GeminiAdapter
  - [x] 2.7 Update `propose()` method signatures to accept new accumulation-focused PromptContext
  - [x] 2.8 Update `vote()` method to accept array of 5 proposals instead of 3
  - [x] 2.9 Add retry logic (1 retry) for transient API failures in all adapters
  - [x] 2.10 Set temperature to 0.0 for all council API calls (deterministic decisions)
  - [x] 2.11 Update structured output schemas to enforce 5-model rankings in vote responses
  - [x] 2.12 Add model-specific error logging with timestamps for debugging

- [x] 3.0 Implement 5-point ranked voting system with vote tallying
  - [x] 3.1 Create `tallyVotes()` function that accepts array of VoteOutput from 5 models
  - [x] 3.2 Implement 5-point scoring: 1st place = 5pts, 2nd = 4pts, 3rd = 3pts, 4th = 2pts, 5th = 1pt
  - [x] 3.3 Validate that each model's rankings use all 5 unique ranks (no duplicates)
  - [x] 3.4 Calculate total points for each proposal across all votes
  - [x] 3.5 Determine winner as proposal with highest total points
  - [x] 3.6 Implement tie-breaker logic: HOLD > LIMIT orders > MARKET orders
  - [x] 3.7 If still tied, prefer lower capital deployment (less USDT spent)
  - [x] 3.8 If still tied, select alphabetically by model name (deterministic fallback)
  - [x] 3.9 Build `votingMatrix` structure: `Record<ModelName, Record<ModelName, number>>`
  - [x] 3.10 Build `voteScores` structure: `Record<ModelName, number>` with final tallies
  - [x] 3.11 Add validation that winning proposal passes risk limits before execution
  - [x] 3.12 If winning proposal fails validation, select next highest-scoring proposal
  - [x] 3.13 If all proposals fail validation, default to HOLD action

- [x] 4.0 Update API endpoints for new council flow
  - [x] 4.1 Update `trading-agent-council/route.ts` to call new 2-phase `runCouncilDebate()`
  - [x] 4.2 Update council metadata structure to match new format with 5 models
  - [x] 4.3 Convert `individualProposals` array to object with keys: openai, grok, gemini, kimi, deepseek
  - [x] 4.4 Add `votingMatrix` to council metadata for UI display
  - [x] 4.5 Update `voteScores` calculation to use new 5-point scoring system
  - [x] 4.6 Remove `voteBreakdown` logic (BUY/SELL/HOLD counts) - no longer applicable
  - [x] 4.7 Update model name normalization for Kimi ('moonshotai/kimi-k2-thinking') and DeepSeek ('deepseek/deepseek-chat-v3-0324')
  - [x] 4.8 Update response format to include full debate metadata (proposals + votes + matrix)
  - [x] 4.9 Update `trading-cycle/route.ts` to remove individual agent execution
  - [x] 4.10 Keep only council execution in trading cycle, remove OpenAI/Grok/Gemini individual calls
  - [x] 4.11 Update documentation comments to reflect 8-hour intervals (3x daily)
  - [x] 4.12 Ensure council API returns execution results from winning proposal

- [ ] 5.0 End-to-end testing and validation
  - [ ] 5.1 Test Phase 1: Verify all 5 models generate valid proposals in parallel
  - [ ] 5.2 Test Phase 1: Verify proposals follow accumulation philosophy (HODL-only, smart timing)
  - [ ] 5.3 Test Phase 1: Handle scenario where 1-2 models fail (should continue if ≥3 succeed)
  - [ ] 5.4 Test Phase 2: Verify all 5 models return valid rankings (1-5, no duplicates)
  - [ ] 5.5 Test Phase 2: Verify each model ranks ALL 5 proposals including their own
  - [ ] 5.6 Test Phase 2: Handle scenario where 1-2 models fail voting (should continue if ≥3 succeed)
  - [ ] 5.7 Test vote tallying: Verify 5-point scoring calculates correctly
  - [ ] 5.8 Test tie-breaker: Verify conservative option wins (HOLD > LIMIT > MARKET)
  - [ ] 5.9 Test execution: Verify winning proposal actions execute on Binance testnet
  - [ ] 5.10 Test metadata: Verify votingMatrix, voteScores, and individualProposals are captured
  - [ ] 5.11 Test trade history: Verify council metadata attaches to logged trades
  - [ ] 5.12 Monitor first 5 production cycles: Check API failures, cycle time (<30s), vote distribution
  - [ ] 5.13 Verify UI components display new metadata correctly (CouncilPerformanceDashboard)
  - [ ] 5.14 Test edge case: All proposals fail risk validation (should default to HOLD)
  - [ ] 5.15 Test edge case: Multiple tied proposals with same score (verify deterministic tie-break)

## Implementation Notes

### OpenRouter Configuration

For Kimi and DeepSeek adapters, use this client configuration:

```typescript
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://tradewarriors.dev",
    "X-Title": "TradeWarriors",
  },
});
```

### Model Specifications

| Model | API Call | Model ID | Provider |
|-------|----------|----------|----------|
| OpenAI | `openai.chat.completions.create()` | `gpt-5-nano` | Direct |
| Grok | `xai.chat.completions.create()` | `grok-4-fast` | Direct |
| Gemini | `openrouter.chat.completions.create()` | `google/gemini-2.5-flash` | OpenRouter |
| Kimi | `openrouter.chat.completions.create()` | `moonshotai/kimi-k2-thinking` | OpenRouter |
| DeepSeek | `openrouter.chat.completions.create()` | `deepseek/deepseek-chat-v3-0324` | OpenRouter |

### Vote Tallying Example

Given 5 models' rankings:
```
OpenAI ranks:   Grok=5, Gemini=4, Kimi=3, DeepSeek=2, OpenAI=1
Grok ranks:     Grok=5, Kimi=4, Gemini=3, OpenAI=2, DeepSeek=1
Gemini ranks:   Gemini=5, Grok=4, Kimi=3, OpenAI=2, DeepSeek=1
Kimi ranks:     Kimi=5, Grok=4, Gemini=3, OpenAI=2, DeepSeek=1
DeepSeek ranks: Grok=5, Kimi=4, Gemini=3, OpenAI=2, DeepSeek=1
```

Final scores:
- Grok: 5+5+4+4+5 = **23 points (WINNER)**
- Kimi: 3+4+3+5+4 = 19 points
- Gemini: 4+3+5+3+3 = 18 points
- OpenAI: 1+2+2+2+2 = 9 points
- DeepSeek: 2+1+1+1+1 = 6 points

Grok's proposal gets executed.

### Parallel Execution Pattern

```typescript
// Phase 1: Proposals
const proposalPromises = [
  openaiAdapter.propose(promptContext, marketData),
  grokAdapter.propose(promptContext, marketData),
  geminiAdapter.propose(promptContext, marketData),
  kimiAdapter.propose(promptContext, marketData),
  deepseekAdapter.propose(promptContext, marketData)
];

const proposalResults = await Promise.allSettled(proposalPromises);
const validProposals = proposalResults
  .filter(r => r.status === 'fulfilled')
  .map(r => r.value);

if (validProposals.length < 3) {
  throw new Error('Insufficient proposals: minimum 3 required');
}

// Phase 2: Voting
const votePromises = [
  openaiAdapter.vote(validProposals),
  grokAdapter.vote(validProposals),
  geminiAdapter.vote(validProposals),
  kimiAdapter.vote(validProposals),
  deepseekAdapter.vote(validProposals)
];

const voteResults = await Promise.allSettled(votePromises);
const validVotes = voteResults
  .filter(r => r.status === 'fulfilled')
  .map(r => r.value);

if (validVotes.length < 3) {
  throw new Error('Insufficient votes: minimum 3 required');
}
```

### Metadata Structure

The final `CouncilOutput._meta` should match:

```typescript
{
  selectedModel: "Grok",
  consensusType: "majority", // or "unanimous" if all voted same
  totalTimeMs: 12450,
  voteScores: {
    "OpenAI": 9,
    "Grok": 23,
    "Gemini": 18,
    "Kimi": 19,
    "DeepSeek": 6
  },
  individualProposals: [
    { modelName: "OpenAI", rawText: "...", actions: [...], plan: "...", reasoning: "..." },
    { modelName: "Grok", rawText: "...", actions: [...], plan: "...", reasoning: "..." },
    { modelName: "Gemini", rawText: "...", actions: [...], plan: "...", reasoning: "..." },
    { modelName: "Kimi", rawText: "...", actions: [...], plan: "...", reasoning: "..." },
    { modelName: "DeepSeek", rawText: "...", actions: [...], plan: "...", reasoning: "..." }
  ],
  executionResults: [...] // From winning proposal execution
}
```

### Testing Checklist

Before deploying to production:

1. ✅ All 5 models can generate proposals successfully
2. ✅ Proposals follow accumulation rules (no profit-taking sells)
3. ✅ All 5 models can vote with valid rankings
4. ✅ Vote tallying calculates scores correctly
5. ✅ Tie-breaker logic is deterministic
6. ✅ Winning proposal executes on testnet
7. ✅ Metadata is captured and logged
8. ✅ UI displays new metadata correctly
9. ✅ Error handling works for model failures
10. ✅ Cycle completes in <30 seconds

## Success Criteria

- [ ] Council cycles complete in <30 seconds (down from ~60s)
- [ ] ≥95% of cycles produce valid proposals and votes
- [ ] No single model wins >60% of votes (balanced influence)
- [ ] ≥95% of winning proposals execute without errors
- [ ] Cost per cycle <$5 (vs ~$8 with 4 phases)
