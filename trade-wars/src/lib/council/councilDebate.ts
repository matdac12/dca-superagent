/**
 * Council Debate Orchestration
 *
 * Coordinates 3 LLMs in a structured debate to reach consensus on trading decisions.
 * Phases: Proposal → Critique → Revision → Vote
 */

import {
  CouncilConfig,
  CouncilOutput,
  CouncilEvent,
  CouncilEventCallback,
  NormalizedDecision,
  CritiqueOutput,
  VoteOutput,
  VoteScore,
  ConsensusResult,
  ConsensusType,
  MarketIntelligence,
  Phase,
  ModelName,
} from './types';
import { OpenAIAdapter, GrokAdapter, GeminiAdapter } from './adapters';
import { loadPlan } from '@/lib/storage/agentPlans';
import { getOpenOrders } from '@/lib/binance/openOrders';
import { getAgentConfig } from '@/config/agents';
import { executeActions } from '@/lib/execution/multiActionExecutor';
import { validateRiskLimits } from '@/lib/execution/orderValidator';
import { TradingDecision } from '@/types/trading';

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: CouncilConfig = {
  models: ['gpt-5-nano', 'grok-4-fast', 'google/gemini-2.5-flash'],
  globalTimeoutMs: 240000, // Increased to 4 minutes for full debate cycle
  perTurnTimeoutMs: 60000, // 60 seconds per turn (OpenAI averages ~38s, buffer for variation)
  temperatures: {
    proposal: 0.4,
    critique: 0.3,
    revision: 0.3,
    vote: 0.2,
  },
  maxTokens: 600,
  earlyExit: true,
  quantityTolerancePercent: 30,
};

// ============================================================================
// MODEL NAME NORMALIZATION
// ============================================================================

/**
 * Normalize model names from LLM responses to our canonical names
 * LLMs often return their internal model names instead of what we tell them
 */
function normalizeModelName(modelName: string): ModelName | null {
  const normalized = modelName.toLowerCase().trim();

  // OpenAI variations
  if (normalized.includes('gpt-5') || normalized.includes('gpt5') ||
      normalized.includes('openai') || normalized === 'gpt-5-nano') {
    return 'gpt-5-nano';
  }

  // Grok variations
  if (normalized.includes('grok') || normalized.includes('xai')) {
    return 'grok-4-fast';
  }

  // Gemini variations - they often return internal names like "gemini-1.5-flash-001"
  if (normalized.includes('gemini') || normalized.includes('google')) {
    return 'google/gemini-2.5-flash';
  }

  return null;
}

// ============================================================================
// CONSENSUS LOGIC
// ============================================================================

function calculateMedian(numbers: number[]): number {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function checkQuantityTolerance(quantities: number[], tolerancePercent: number): boolean {
  if (quantities.length === 0) return true;
  const max = Math.max(...quantities);
  const min = Math.min(...quantities);
  const range = max - min;
  const avgValue = (max + min) / 2;
  const percentDiff = (range / avgValue) * 100;
  return percentDiff <= tolerancePercent;
}

function checkConsensus(
  decisions: NormalizedDecision[],
  config: CouncilConfig
): ConsensusResult {
  if (decisions.length === 0) {
    return {
      hasConsensus: false,
      consensusType: 'none',
      participatingModels: [],
    };
  }

  const participatingModels = decisions.map(d => d.model);

  // Count actions
  const actionCounts: Record<string, number> = {};
  const actionDecisions: Record<string, NormalizedDecision[]> = {};

  decisions.forEach(decision => {
    const action = decision.normalizedAction;
    actionCounts[action] = (actionCounts[action] || 0) + 1;
    if (!actionDecisions[action]) actionDecisions[action] = [];
    actionDecisions[action].push(decision);
  });

  // Check for majority (2 out of 3)
  const majorityAction = Object.entries(actionCounts).find(([_, count]) => count >= 2);

  if (!majorityAction) {
    return {
      hasConsensus: false,
      consensusType: 'none',
      participatingModels,
    };
  }

  const [agreedAction, count] = majorityAction;
  const consensusType: ConsensusType = count === decisions.length ? 'unanimous' : 'majority';

  // Calculate median quantity from models that agreed on action
  const agreedDecisions = actionDecisions[agreedAction];
  const quantities = agreedDecisions.map(d => d.quantity);
  const medianQuantity = calculateMedian(quantities);
  const quantitiesWithinTolerance = checkQuantityTolerance(quantities, config.quantityTolerancePercent);

  return {
    hasConsensus: true,
    consensusType,
    agreedAction,
    medianQuantity,
    quantitiesWithinTolerance,
    participatingModels,
  };
}

// ============================================================================
// VOTING LOGIC
// ============================================================================

function calculateVoteScores(votes: VoteOutput[]): VoteScore[] {
  const scores: Record<string, VoteScore> = {};

  // Initialize scores for all models
  votes.forEach(vote => {
    vote.rankings.forEach(ranking => {
      // Normalize the target model name
      const normalizedModel = normalizeModelName(ranking.targetModel);
      if (!normalizedModel) {
        console.warn(`Could not normalize model name: ${ranking.targetModel}`);
        return;
      }

      if (!scores[normalizedModel]) {
        scores[normalizedModel] = {
          model: normalizedModel,
          score: 0,
          firstPlaceVotes: 0,
        };
      }
    });
  });

  // Tally votes
  votes.forEach(vote => {
    vote.rankings.forEach(ranking => {
      // Normalize the target model name
      const normalizedModel = normalizeModelName(ranking.targetModel);
      if (!normalizedModel) {
        console.warn(`Could not normalize model name during tally: ${ranking.targetModel}`);
        return;
      }

      const points = ranking.rank === 1 ? 2 : 1;
      scores[normalizedModel].score += points;
      if (ranking.rank === 1) {
        scores[normalizedModel].firstPlaceVotes += 1;
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

// ============================================================================
// PHASE ORCHESTRATORS
// ============================================================================

class PhaseOrchestrator {
  constructor(
    private adapters: Map<ModelName, OpenAIAdapter | GrokAdapter | GeminiAdapter>,
    private config: CouncilConfig,
    private emitEvent: CouncilEventCallback
  ) {}

  private async enrichMarketData(model: ModelName, marketData: MarketIntelligence): Promise<MarketIntelligence> {
    const agentMap: Record<ModelName, { planName: string; configName: string }> = {
      'gpt-5-nano': { planName: 'council-openai', configName: 'council' },
      'grok-4-fast': { planName: 'council-grok', configName: 'council' },
      'google/gemini-2.5-flash': { planName: 'council-gemini', configName: 'council' },
    };

    const mapping = agentMap[model];
    if (!mapping) {
      return marketData;
    }

    const [plan, agentConfig] = await Promise.all([
      loadPlan(mapping.planName).catch(() => null),
      Promise.resolve(getAgentConfig(mapping.configName)),
    ]);

    let openOrders = marketData.openOrders ?? [];

    if (agentConfig) {
      openOrders = await getOpenOrders(
        marketData.symbol,
        agentConfig.binanceApiKey,
        agentConfig.binanceSecretKey
      ).catch(() => marketData.openOrders ?? []);
    }

    return {
      ...marketData,
      plan: plan
        ? {
            text: plan.plan,
            lastUpdated: plan.lastUpdated,
          }
        : marketData.plan ?? null,
      openOrders,
    };
  }

  private async executeFinalDecision(decision: NormalizedDecision, marketData: MarketIntelligence): Promise<import('@/lib/execution/multiActionExecutor').ActionResult[]> {
    const agentConfig = getAgentConfig('council');
    if (!agentConfig) {
      throw new Error('Council agent configuration not found');
    }

    const openOrders = await getOpenOrders(
      marketData.symbol,
      agentConfig.binanceApiKey,
      agentConfig.binanceSecretKey
    ).catch(() => marketData.openOrders ?? []);

    const riskCheck = validateRiskLimits(
      decision.actions,
      openOrders,
      marketData.balances,
      marketData.ticker.lastPrice
    );

    if (!riskCheck.allowed) {
      throw new Error(`Council final decision failed risk validation: ${riskCheck.errors.join('; ')}`);
    }

    const executionResults = await executeActions(
      decision.actions,
      marketData.ticker.lastPrice,
      marketData.balances,
      openOrders,
      agentConfig.binanceApiKey,
      agentConfig.binanceSecretKey
    );

    return executionResults;
  }

  async runProposalPhase(marketData: MarketIntelligence): Promise<NormalizedDecision[]> {
    this.emitEvent({ type: 'phase_start', phase: 'proposal', timestamp: Date.now() });

    const promises = this.config.models.map(async model => {
      this.emitEvent({ type: 'model_start', model, phase: 'proposal', timestamp: Date.now() });
      const startTime = Date.now();

      try {
        const adapter = this.adapters.get(model);
        if (!adapter) throw new Error(`No adapter for ${model}`);

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.config.perTurnTimeoutMs)
        );

        const result = await Promise.race([
          adapter.generateProposal(marketData),
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

    const results = await Promise.all(promises);
    return results.filter((r): r is NormalizedDecision => r !== null);
  }

  async runCritiquePhase(proposals: NormalizedDecision[]): Promise<CritiqueOutput[]> {
    this.emitEvent({ type: 'phase_start', phase: 'critique', timestamp: Date.now() });

    const promises = this.config.models.map(async model => {
      const modelProposals = proposals.filter(p => p.model !== model);
      if (modelProposals.length === 0) return [];

      this.emitEvent({ type: 'model_start', model, phase: 'critique', timestamp: Date.now() });
      const startTime = Date.now();

      try {
        const adapter = this.adapters.get(model);
        if (!adapter) throw new Error(`No adapter for ${model}`);

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.config.perTurnTimeoutMs)
        );

        const result = await Promise.race([
          adapter.generateCritique(proposals),
          timeoutPromise,
        ]);

        const timeMs = Date.now() - startTime;
        this.emitEvent({
          type: 'model_complete',
          model,
          phase: 'critique',
          data: result,
          timeMs,
          timestamp: Date.now(),
        });
        return result;
      } catch (error: any) {
        if (error.message === 'Timeout') {
          this.emitEvent({ type: 'model_timeout', model, phase: 'critique', timestamp: Date.now() });
        } else {
          this.emitEvent({
            type: 'model_error',
            model,
            phase: 'critique',
            error: error.message,
            timestamp: Date.now(),
          });
        }
        return [];
      }
    });

    const results = await Promise.all(promises);
    return results.flat();
  }

  async runRevisionPhase(
    proposals: NormalizedDecision[],
    critiques: CritiqueOutput[],
    marketData: MarketIntelligence
  ): Promise<NormalizedDecision[]> {
    this.emitEvent({ type: 'phase_start', phase: 'revision', timestamp: Date.now() });

    const promises = this.config.models.map(async model => {
      const originalProposal = proposals.find(p => p.model === model);
      if (!originalProposal) return null;

      const receivedCritiques = critiques
        .filter(c => c.targetModel === model)
        .map(c => ({
          model: c.model,
          critique: c.critique,
          risks: c.risks,
          conflicts: c.conflicts,
        }));

      this.emitEvent({ type: 'model_start', model, phase: 'revision', timestamp: Date.now() });
      const startTime = Date.now();

      try {
        const adapter = this.adapters.get(model);
        if (!adapter) throw new Error(`No adapter for ${model}`);

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.config.perTurnTimeoutMs)
        );

        const result = await Promise.race([
          adapter.generateRevision(originalProposal, receivedCritiques, marketData),
          timeoutPromise,
        ]);

        const timeMs = Date.now() - startTime;
        this.emitEvent({
          type: 'model_complete',
          model,
          phase: 'revision',
          data: result,
          timeMs,
          timestamp: Date.now(),
        });
        return result;
      } catch (error: any) {
        if (error.message === 'Timeout') {
          this.emitEvent({ type: 'model_timeout', model, phase: 'revision', timestamp: Date.now() });
        } else {
          this.emitEvent({
            type: 'model_error',
            model,
            phase: 'revision',
            error: error.message,
            timestamp: Date.now(),
          });
        }
        return null;
      }
    });

    const results = await Promise.all(promises);
    return results.filter((r): r is NormalizedDecision => r !== null);
  }

  async runVotePhase(revisedProposals: NormalizedDecision[]): Promise<VoteOutput[]> {
    this.emitEvent({ type: 'phase_start', phase: 'vote', timestamp: Date.now() });

    const promises = this.config.models.map(async model => {
      this.emitEvent({ type: 'model_start', model, phase: 'vote', timestamp: Date.now() });
      const startTime = Date.now();

      try {
        const adapter = this.adapters.get(model);
        if (!adapter) throw new Error(`No adapter for ${model}`);

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.config.perTurnTimeoutMs)
        );

        const result = await Promise.race([
          adapter.generateVote(revisedProposals),
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

    const results = await Promise.all(promises);
    return results.filter((r): r is VoteOutput => r !== null);
  }
}

// ============================================================================
// MAIN COUNCIL DEBATE FUNCTION
// ============================================================================

export async function runCouncilDebate(
  marketData: MarketIntelligence,
  onEvent: CouncilEventCallback,
  config: CouncilConfig = DEFAULT_CONFIG
): Promise<CouncilOutput> {
  const startTime = Date.now();

  // Initialize adapters
  const adapters = new Map<ModelName, OpenAIAdapter | GrokAdapter | GeminiAdapter>();
  adapters.set('gpt-5-nano', new OpenAIAdapter());
  adapters.set('grok-4-fast', new GrokAdapter());
  adapters.set('google/gemini-2.5-flash', new GeminiAdapter());

  const orchestrator = new PhaseOrchestrator(adapters, config, onEvent);

  // Phase 1: Proposals
  const proposals = await orchestrator.runProposalPhase(marketData);

  console.log(`📋 Proposal phase complete: ${proposals.length}/3 models responded`);
  proposals.forEach(p => console.log(`  ✓ ${p.model}: ${p.normalizedAction}`));

  if (proposals.length === 0) {
    // All models failed
    console.warn('⚠️ All models failed or timed out during proposal phase');
    const output: CouncilOutput = {
      actions: [{ type: 'HOLD', reasoning: 'Council could not generate any proposals within time limits' }],
      plan: 'No proposals generated',
      reasoning: 'Council could not generate any proposals within time limits',
      _meta: {
        selectedModel: null,
        consensusType: 'none',
        totalTimeMs: Date.now() - startTime,
        rationaleSnippet: 'All models failed or timed out',
        individualProposals: [],
      },
    };

    onEvent({ type: 'final_decision', decision: output, timestamp: Date.now() });
    return output;
  }

  // Check for early consensus
  const earlyConsensus = checkConsensus(proposals, config);
  onEvent({ type: 'consensus_check', result: earlyConsensus, timestamp: Date.now() });

  if (config.earlyExit && earlyConsensus.hasConsensus) {
    onEvent({ type: 'early_exit', consensusType: earlyConsensus.consensusType, timestamp: Date.now() });

    const consensusDecision = proposals.find(
      p => p.normalizedAction === earlyConsensus.agreedAction
    ) || proposals[0];

    const executionResults = await orchestrator.executeFinalDecision(consensusDecision, marketData);

    const output: CouncilOutput = {
      actions: consensusDecision.actions,
      plan: consensusDecision.plan,
      reasoning: consensusDecision.reasoning,
      _meta: {
        selectedModel: consensusDecision.model,
        consensusType: earlyConsensus.consensusType,
        totalTimeMs: Date.now() - startTime,
        rationaleSnippet: `Early ${earlyConsensus.consensusType} agreement`,
        individualProposals: proposals,
        executionResults,
      },
    };

    onEvent({ type: 'final_decision', decision: output, timestamp: Date.now() });
    return output;
  }

  // Phase 2: Critiques
  const critiques = await orchestrator.runCritiquePhase(proposals);

  // Phase 3: Revisions
  const revisions = await orchestrator.runRevisionPhase(proposals, critiques, marketData);

  if (revisions.length === 0) {
    const output: CouncilOutput = {
      actions: [{ type: 'HOLD', reasoning: 'Council could not complete revisions within time limits' }],
      plan: 'Revisions failed',
      reasoning: 'Council could not complete revisions within time limits',
      _meta: {
        selectedModel: null,
        consensusType: 'none',
        totalTimeMs: Date.now() - startTime,
        rationaleSnippet: 'Revisions failed',
        individualProposals: proposals,
      },
    };

    onEvent({ type: 'final_decision', decision: output, timestamp: Date.now() });
    return output;
  }

  // Check consensus after revisions
  const revisionConsensus = checkConsensus(revisions, config);
  onEvent({ type: 'consensus_check', result: revisionConsensus, timestamp: Date.now() });

  if (revisionConsensus.hasConsensus) {
    const consensusDecision = revisions.find(
      p => p.normalizedAction === revisionConsensus.agreedAction
    ) || revisions[0];

    const executionResults = await orchestrator.executeFinalDecision(consensusDecision, marketData);

    const output: CouncilOutput = {
      actions: consensusDecision.actions,
      plan: consensusDecision.plan,
      reasoning: consensusDecision.reasoning,
      _meta: {
        selectedModel: consensusDecision.model,
        consensusType: revisionConsensus.consensusType,
        totalTimeMs: Date.now() - startTime,
        rationaleSnippet: `Consensus after revision`,
        individualProposals: proposals,
        executionResults,
      },
    };

    onEvent({ type: 'final_decision', decision: output, timestamp: Date.now() });
    return output;
  }

  // Phase 4: Voting
  const votes = await orchestrator.runVotePhase(revisions);

  if (votes.length === 0) {
    const output: CouncilOutput = {
      actions: [{ type: 'HOLD', reasoning: 'Council could not complete voting within time limits' }],
      plan: 'Voting failed',
      reasoning: 'Council could not complete voting within time limits',
      _meta: {
        selectedModel: null,
        consensusType: 'none',
        totalTimeMs: Date.now() - startTime,
        rationaleSnippet: 'Voting failed',
        individualProposals: proposals,
      },
    };

    onEvent({ type: 'final_decision', decision: output, timestamp: Date.now() });
    return output;
  }

  // Calculate vote scores
  const voteScores = calculateVoteScores(votes);
  onEvent({ type: 'vote_results', scores: voteScores, timestamp: Date.now() });

  // Winner is the model with highest score
  const winner = voteScores[0];
  const winningDecision = revisions.find(r => r.model === winner.model);

  if (!winningDecision) {
    const output: CouncilOutput = {
      actions: [{ type: 'HOLD', reasoning: 'Council voting resulted in invalid winner' }],
      plan: 'Invalid vote result',
      reasoning: 'Council voting resulted in invalid winner',
      _meta: {
        selectedModel: null,
        consensusType: 'none',
        totalTimeMs: Date.now() - startTime,
        rationaleSnippet: 'Invalid vote result',
        individualProposals: proposals,
      },
    };

    onEvent({ type: 'final_decision', decision: output, timestamp: Date.now() });
    return output;
  }

  const executionResults = await orchestrator.executeFinalDecision(winningDecision, marketData);

  const output: CouncilOutput = {
    actions: winningDecision.actions,
    plan: winningDecision.plan,
    reasoning: winningDecision.reasoning,
    _meta: {
      selectedModel: winner.model,
      consensusType: 'majority',
      totalTimeMs: Date.now() - startTime,
      voteScores: Object.fromEntries(voteScores.map(s => [s.model, s.score])) as Record<ModelName, number>,
      rationaleSnippet: `Won by ranked vote (${winner.score} points)`,
      individualProposals: proposals,
      executionResults,
    },
  };

  onEvent({ type: 'final_decision', decision: output, timestamp: Date.now() });
  return output;
}
