/**
 * Council Debate Orchestration - 2-Phase System
 *
 * Coordinates 5 LLMs in a streamlined voting system for trading decisions.
 * Phases: Proposal → Vote
 */

import {
  CouncilConfig,
  CouncilOutput,
  CouncilEvent,
  CouncilEventCallback,
  NormalizedDecision,
  VoteOutput,
  VoteScore,
  MarketIntelligence,
  Phase,
  ModelName,
} from './types';
import { OpenAIAdapter, GrokAdapter, GeminiAdapter, KimiAdapter, DeepSeekAdapter } from './adapters';
import { loadPlan } from '@/lib/storage/agentPlans';
import { getOpenOrders } from '@/lib/binance/openOrders';
import { getAgentConfig } from '@/config/agents';
import { executeActions } from '@/lib/execution/multiActionExecutor';
import { validateRiskLimits } from '@/lib/execution/orderValidator';
import { TradingDecision } from '@/types/trading';

// ============================================================================
// DEFAULT CONFIG - 5 Models, 2 Phases
// ============================================================================

const DEFAULT_CONFIG: CouncilConfig = {
  models: ['OpenAI', 'Grok', 'Gemini', 'Kimi', 'DeepSeek'],
  globalTimeoutMs: 120000, // 2 minutes for full cycle (down from 4 minutes)
  perTurnTimeoutMs: 45000, // 45 seconds per turn (proposal or vote)
  temperatures: {
    proposal: 0.0, // Deterministic decisions
    critique: 0.0, // Not used
    revision: 0.0, // Not used
    vote: 0.0,     // Deterministic voting
  },
  maxTokens: 800,
  earlyExit: false, // No early exit - always vote
  quantityTolerancePercent: 30, // Not used in voting system
};

// ============================================================================
// MODEL NAME NORMALIZATION
// ============================================================================

/**
 * Normalize model names from LLM responses to our canonical ModelName enum
 * Handles variations that LLMs might return in their responses
 */
function normalizeModelName(modelName: string): ModelName | null {
  const normalized = modelName.toLowerCase().trim();

  // OpenAI variations
  if (normalized.includes('gpt') || normalized.includes('openai')) {
    return 'OpenAI';
  }

  // Grok variations
  if (normalized.includes('grok') || normalized.includes('xai')) {
    return 'Grok';
  }

  // Gemini variations
  if (normalized.includes('gemini') || normalized.includes('google')) {
    return 'Gemini';
  }

  // Kimi variations
  if (normalized.includes('kimi') || normalized.includes('moonshot')) {
    return 'Kimi';
  }

  // DeepSeek variations
  if (normalized.includes('deepseek')) {
    return 'DeepSeek';
  }

  return null;
}

// ============================================================================
// VOTING LOGIC - 5-Point Ranked System
// ============================================================================

/**
 * Tally votes from all models using 5-point scoring:
 * 1st place = 5 points
 * 2nd place = 4 points
 * 3rd place = 3 points
 * 4th place = 2 points
 * 5th place = 1 point
 */
function calculateVoteScores(votes: VoteOutput[], proposals: NormalizedDecision[]): VoteScore[] {
  const scores: Record<ModelName, VoteScore> = {} as Record<ModelName, VoteScore>;

  // Initialize scores for all models that submitted proposals
  proposals.forEach(proposal => {
    scores[proposal.modelName] = {
      model: proposal.modelName,
      score: 0,
      firstPlaceVotes: 0,
    };
  });

  // Tally votes using 5-point system
  votes.forEach(vote => {
    vote.rankings.forEach(ranking => {
      const modelName = ranking.modelName;

      if (!scores[modelName]) {
        console.warn(`Vote references unknown model: ${modelName}`);
        return;
      }

      // Convert rank to points: 1st=5, 2nd=4, 3rd=3, 4th=2, 5th=1
      const points = 6 - ranking.rank;
      scores[modelName].score += points;

      if (ranking.rank === 1) {
        scores[modelName].firstPlaceVotes += 1;
      }
    });
  });

  // Sort by score (desc), then by first-place votes (desc), then alphabetically
  return Object.values(scores).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.firstPlaceVotes !== a.firstPlaceVotes) return b.firstPlaceVotes - a.firstPlaceVotes;
    return a.model.localeCompare(b.model);
  });
}

/**
 * Build voting matrix showing how each model ranked each proposal
 * Format: { OpenAI: { OpenAI: 5, Grok: 4, Gemini: 3, Kimi: 2, DeepSeek: 1 }, ... }
 */
function buildVotingMatrix(votes: VoteOutput[]): Record<ModelName, Record<ModelName, number>> {
  const matrix: Record<ModelName, Record<ModelName, number>> = {} as Record<ModelName, Record<ModelName, number>>;

  votes.forEach(vote => {
    const voterModel = vote.model;
    matrix[voterModel] = {} as Record<ModelName, number>;

    vote.rankings.forEach(ranking => {
      matrix[voterModel][ranking.modelName] = ranking.rank;
    });
  });

  return matrix;
}

// ============================================================================
// TIE-BREAKER LOGIC
// ============================================================================

/**
 * Determine most conservative proposal when there's a tie in voting
 * Priority: HOLD > LIMIT orders > MARKET orders > lower capital deployment
 */
function selectMostConservativeProposal(
  tiedProposals: NormalizedDecision[]
): NormalizedDecision {
  // 1. Prefer HOLD
  const holdProposals = tiedProposals.filter(p => p.normalizedAction === 'HOLD');
  if (holdProposals.length > 0) {
    return holdProposals[0];
  }

  // 2. Prefer LIMIT orders over MARKET
  const limitProposals = tiedProposals.filter(p =>
    p.actions.some(a => a.type.includes('LIMIT'))
  );
  if (limitProposals.length > 0) {
    // Among LIMIT orders, prefer lower quantity
    return limitProposals.sort((a, b) => a.quantity - b.quantity)[0];
  }

  // 3. Prefer lower capital deployment
  return tiedProposals.sort((a, b) => a.quantity - b.quantity)[0];
}

// ============================================================================
// PHASE ORCHESTRATORS
// ============================================================================

class PhaseOrchestrator {
  constructor(
    private adapters: Map<ModelName, OpenAIAdapter | GrokAdapter | GeminiAdapter | KimiAdapter | DeepSeekAdapter>,
    private config: CouncilConfig,
    private emitEvent: CouncilEventCallback
  ) {}

  private async executeFinalDecision(
    decision: NormalizedDecision,
    marketData: MarketIntelligence
  ): Promise<import('@/lib/execution/multiActionExecutor').ActionResult[]> {
    const agentConfig = getAgentConfig('council');
    if (!agentConfig) {
      throw new Error('Council agent configuration not found');
    }

    // Get open orders for both BTC and ADA
    const [btcOrders, adaOrders] = await Promise.all([
      getOpenOrders('BTCUSDT', agentConfig.binanceApiKey, agentConfig.binanceSecretKey).catch(() => []),
      getOpenOrders('ADAUSDT', agentConfig.binanceApiKey, agentConfig.binanceSecretKey).catch(() => [])
    ]);
    const openOrders = [...btcOrders, ...adaOrders];

    // Use BTC price for validation (will update when we have dual-asset pricing)
    const btcPrice = marketData.btc?.ticker?.lastPrice || 0;

    const riskCheck = validateRiskLimits(
      decision.actions,
      openOrders,
      marketData.balances,
      btcPrice
    );

    if (!riskCheck.allowed) {
      throw new Error(`Council decision failed risk validation: ${riskCheck.errors.join('; ')}`);
    }

    const executionResults = await executeActions(
      decision.actions,
      btcPrice,
      marketData.balances,
      openOrders,
      agentConfig.binanceApiKey,
      agentConfig.binanceSecretKey
    );

    return executionResults;
  }

  /**
   * Phase 1: Generate proposals from all 5 models in parallel
   */
  async runProposalPhase(marketData: MarketIntelligence): Promise<NormalizedDecision[]> {
    this.emitEvent({ type: 'phase_start', phase: 'proposal', timestamp: Date.now() });

    const promises = this.config.models.map(async (model: ModelName) => {
      this.emitEvent({ type: 'model_start', model, phase: 'proposal', timestamp: Date.now() });
      const startTime = Date.now();

      try {
        const adapter = this.adapters.get(model);
        if (!adapter) throw new Error(`No adapter for ${model}`);

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.config.perTurnTimeoutMs)
        );

        const result = await Promise.race([
          adapter.propose(marketData),
          timeoutPromise,
        ]);

        const timeMs = Date.now() - startTime;
        this.emitEvent({
          type: 'model_complete',
          model,
          phase: 'proposal',
          data: result,
          timeMs,
          timestamp: Date.now(),
        });
        return result;
      } catch (error: any) {
        if (error.message === 'Timeout') {
          this.emitEvent({ type: 'model_timeout', model, phase: 'proposal', timestamp: Date.now() });
        } else {
          this.emitEvent({
            type: 'model_error',
            model,
            phase: 'proposal',
            error: error.message,
            timestamp: Date.now(),
          });
        }
        return null;
      }
    });

    const results = await Promise.allSettled(promises);

    // Filter successful proposals
    const validProposals = results
      .filter((r): r is PromiseFulfilledResult<NormalizedDecision> =>
        r.status === 'fulfilled' && r.value !== null
      )
      .map(r => r.value);

    return validProposals;
  }

  /**
   * Phase 2: All models vote by ranking all proposals
   */
  async runVotePhase(proposals: NormalizedDecision[]): Promise<VoteOutput[]> {
    this.emitEvent({ type: 'phase_start', phase: 'vote', timestamp: Date.now() });

    const promises = this.config.models.map(async (model: ModelName) => {
      this.emitEvent({ type: 'model_start', model, phase: 'vote', timestamp: Date.now() });
      const startTime = Date.now();

      try {
        const adapter = this.adapters.get(model);
        if (!adapter) throw new Error(`No adapter for ${model}`);

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.config.perTurnTimeoutMs)
        );

        const result = await Promise.race([
          adapter.vote(proposals, model),
          timeoutPromise,
        ]);

        const timeMs = Date.now() - startTime;
        this.emitEvent({
          type: 'model_complete',
          model,
          phase: 'vote',
          data: result,
          timeMs,
          timestamp: Date.now(),
        });
        return result;
      } catch (error: any) {
        if (error.message === 'Timeout') {
          this.emitEvent({ type: 'model_timeout', model, phase: 'vote', timestamp: Date.now() });
        } else {
          this.emitEvent({
            type: 'model_error',
            model,
            phase: 'vote',
            error: error.message,
            timestamp: Date.now(),
          });
        }
        return null;
      }
    });

    const results = await Promise.allSettled(promises);

    // Filter successful votes
    const validVotes = results
      .filter((r): r is PromiseFulfilledResult<VoteOutput> =>
        r.status === 'fulfilled' && r.value !== null
      )
      .map(r => r.value);

    return validVotes;
  }
}

// ============================================================================
// MAIN COUNCIL DEBATE FUNCTION - 2 PHASES
// ============================================================================

export async function runCouncilDebate(
  marketData: MarketIntelligence,
  onEvent: CouncilEventCallback,
  config: CouncilConfig = DEFAULT_CONFIG
): Promise<CouncilOutput> {
  const startTime = Date.now();

  // Initialize adapters for all 5 models
  const adapters = new Map<ModelName, OpenAIAdapter | GrokAdapter | GeminiAdapter | KimiAdapter | DeepSeekAdapter>();
  adapters.set('OpenAI', new OpenAIAdapter());
  adapters.set('Grok', new GrokAdapter());
  adapters.set('Gemini', new GeminiAdapter());
  adapters.set('Kimi', new KimiAdapter());
  adapters.set('DeepSeek', new DeepSeekAdapter());

  const orchestrator = new PhaseOrchestrator(adapters, config, onEvent);

  // ========================================
  // PHASE 1: PROPOSALS
  // ========================================

  const proposals = await orchestrator.runProposalPhase(marketData);

  console.log(`📋 Proposal phase complete: ${proposals.length}/5 models responded`);
  proposals.forEach(p => console.log(`  ✓ ${p.modelName}: ${p.normalizedAction}`));

  // Require minimum 3 proposals
  if (proposals.length < 3) {
    console.warn(`⚠️ Insufficient proposals: ${proposals.length}/5 (minimum 3 required)`);
    const output: CouncilOutput = {
      actions: [{ type: 'HOLD', reasoning: 'Council could not generate sufficient proposals (minimum 3 required)' }],
      plan: 'No valid proposals',
      reasoning: `Only ${proposals.length} models responded successfully. Minimum 3 required for council decision.`,
      _meta: {
        selectedModel: null,
        consensusType: 'none',
        totalTimeMs: Date.now() - startTime,
        rationaleSnippet: 'Insufficient proposals',
        individualProposals: proposals,
      },
    };

    onEvent({ type: 'final_decision', decision: output, timestamp: Date.now() });
    return output;
  }

  // ========================================
  // PHASE 2: VOTING
  // ========================================

  const votes = await orchestrator.runVotePhase(proposals);

  console.log(`🗳️ Voting phase complete: ${votes.length}/5 models voted`);

  // Require minimum 3 votes
  if (votes.length < 3) {
    console.warn(`⚠️ Insufficient votes: ${votes.length}/5 (minimum 3 required)`);
    const output: CouncilOutput = {
      actions: [{ type: 'HOLD', reasoning: 'Council could not generate sufficient votes (minimum 3 required)' }],
      plan: 'Voting failed',
      reasoning: `Only ${votes.length} models voted successfully. Minimum 3 required for council decision.`,
      _meta: {
        selectedModel: null,
        consensusType: 'none',
        totalTimeMs: Date.now() - startTime,
        rationaleSnippet: 'Insufficient votes',
        individualProposals: proposals,
      },
    };

    onEvent({ type: 'final_decision', decision: output, timestamp: Date.now() });
    return output;
  }

  // ========================================
  // TALLY VOTES & SELECT WINNER
  // ========================================

  const voteScores = calculateVoteScores(votes, proposals);
  const votingMatrix = buildVotingMatrix(votes);

  onEvent({ type: 'vote_results', scores: voteScores, timestamp: Date.now() });

  console.log('📊 Vote tallies:');
  voteScores.forEach(s => console.log(`  ${s.model}: ${s.score} points (${s.firstPlaceVotes} first-place)`));

  // Determine winner (highest score)
  const topScore = voteScores[0].score;
  const tiedProposals = voteScores
    .filter(s => s.score === topScore)
    .map(s => proposals.find(p => p.modelName === s.model)!)
    .filter(p => p !== undefined);

  let winningProposal: NormalizedDecision;

  if (tiedProposals.length > 1) {
    console.log(`⚖️ Tie detected (${tiedProposals.length} proposals with ${topScore} points), applying tie-breaker...`);
    winningProposal = selectMostConservativeProposal(tiedProposals);
    console.log(`  → Selected ${winningProposal.modelName} (most conservative)`);
  } else {
    winningProposal = tiedProposals[0];
    console.log(`✓ Winner: ${winningProposal.modelName} with ${topScore} points`);
  }

  // ========================================
  // EXECUTE WINNING PROPOSAL
  // ========================================

  let executionResults;
  try {
    executionResults = await orchestrator.executeFinalDecision(winningProposal, marketData);
    console.log(`✓ Executed ${executionResults.length} action(s) from winning proposal`);
  } catch (error: any) {
    // If winning proposal fails validation, try next highest
    console.warn(`⚠️ Winning proposal failed execution: ${error.message}`);

    if (voteScores.length > 1) {
      console.log('Attempting next highest-scored proposal...');
      const nextBest = voteScores[1];
      const nextProposal = proposals.find(p => p.modelName === nextBest.model);

      if (nextProposal) {
        try {
          executionResults = await orchestrator.executeFinalDecision(nextProposal, marketData);
          winningProposal = nextProposal;
          console.log(`✓ Executed ${executionResults.length} action(s) from ${nextBest.model}'s proposal`);
        } catch (fallbackError: any) {
          console.error('Next best proposal also failed, defaulting to HOLD');
          executionResults = [];
          winningProposal = {
            ...winningProposal,
            actions: [{ type: 'HOLD', reasoning: 'All proposals failed risk validation' }],
            normalizedAction: 'HOLD',
          };
        }
      }
    } else {
      // Only one proposal, default to HOLD
      executionResults = [];
      winningProposal = {
        ...winningProposal,
        actions: [{ type: 'HOLD', reasoning: 'Winning proposal failed risk validation' }],
        normalizedAction: 'HOLD',
      };
    }
  }

  // ========================================
  // BUILD FINAL OUTPUT
  // ========================================

  const output: CouncilOutput = {
    actions: winningProposal.actions,
    plan: winningProposal.plan || '',
    reasoning: winningProposal.reasoning,
    _meta: {
      selectedModel: winningProposal.modelName,
      consensusType: 'majority', // Always majority in voting system
      totalTimeMs: Date.now() - startTime,
      voteScores: Object.fromEntries(voteScores.map(s => [s.model, s.score])) as Record<ModelName, number>,
      rationaleSnippet: `Won by ranked vote (${topScore} points)`,
      individualProposals: proposals,
      executionResults,
    },
  };

  onEvent({ type: 'final_decision', decision: output, timestamp: Date.now() });
  return output;
}
