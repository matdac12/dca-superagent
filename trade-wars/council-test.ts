#!/usr/bin/env tsx
/**
 * LLM Council Test Script
 *
 * Tests the multi-LLM debate and consensus system with mock adapters.
 * Three models debate trading decisions and reach consensus through structured phases.
 */

import { TradingDecision } from './src/types/trading';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ModelName = 'gpt-5-nano' | 'grok-4-fast' | 'google/gemini-2.5-flash';
type Phase = 'proposal' | 'critique' | 'revision' | 'vote';
type ConsensusType = 'unanimous' | 'majority' | 'none';

interface CouncilConfig {
  models: ModelName[];
  globalTimeoutMs: number;
  perTurnTimeoutMs: number;
  temperatures: {
    proposal: number;
    critique: number;
    revision: number;
    vote: number;
  };
  maxTokens: number;
  earlyExit: boolean;
  quantityTolerancePercent: number;
}

interface NormalizedDecision extends TradingDecision {
  rawText: string;
  normalizedAction: string;
  model: ModelName;
  phaseId: string;
}

interface CritiqueOutput {
  model: ModelName;
  targetModel: ModelName;
  critique: string;
  risks: string[];
  conflicts: string[];
  phaseId: string;
  timeMs: number;
}

interface VoteOutput {
  model: ModelName;
  rankings: Array<{
    rank: 1 | 2;
    targetModel: ModelName;
    justification: string;
  }>;
  phaseId: string;
  timeMs: number;
}

interface PhaseResult {
  phase: Phase;
  model: ModelName;
  success: boolean;
  timeMs: number;
  tokens?: number;
  data?: any;
  error?: string;
}

interface CouncilOutput extends TradingDecision {
  _meta: {
    selectedModel: ModelName | null;
    consensusType: ConsensusType;
    totalTimeMs: number;
    voteScores?: Record<ModelName, number>;
    rationaleSnippet: string;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: CouncilConfig = {
  models: ['gpt-5-nano', 'grok-4-fast', 'google/gemini-2.5-flash'],
  globalTimeoutMs: 90000,
  perTurnTimeoutMs: 15000,
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
// MOCK ADAPTER
// ============================================================================

type TestScenario = 'unanimous' | 'majority-2-1' | 'no-consensus' | 'timeout' | 'parse-error';

interface MockAdapterOptions {
  scenario: TestScenario;
  simulateTiming: boolean;
  debugLog: boolean;
}

class MockAdapter {
  private scenario: TestScenario;
  private simulateTiming: boolean;
  private debugLog: boolean;
  private callCount = 0;

  constructor(options: MockAdapterOptions) {
    this.scenario = options.scenario;
    this.simulateTiming = options.simulateTiming;
    this.debugLog = options.debugLog;
  }

  private async delay(ms: number): Promise<void> {
    if (this.simulateTiming) {
      await new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  private randomDelay(): number {
    return Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds
  }

  async generateProposal(model: ModelName, marketContext: any): Promise<NormalizedDecision> {
    this.callCount++;
    const delay = this.randomDelay();
    await this.delay(delay);

    const phaseId = `proposal-${this.callCount}`;

    // Scenario-based responses
    switch (this.scenario) {
      case 'unanimous':
        return {
          action: 'BUY',
          asset: 'BTC',
          quantity: 0.001,
          reasoning: `${model}: Strong bullish signals across all timeframes`,
          rawText: 'BUY 0.001 BTC',
          normalizedAction: 'buy',
          model,
          phaseId,
        };

      case 'majority-2-1':
        if (model === 'gpt-5-nano') {
          return {
            action: 'SELL',
            asset: 'BTC',
            quantity: 0.0008,
            reasoning: `${model}: Resistance levels forming, profit-taking recommended`,
            rawText: 'SELL 0.0008 BTC',
            normalizedAction: 'sell',
            model,
            phaseId,
          };
        }
        return {
          action: 'BUY',
          asset: 'BTC',
          quantity: model === 'grok-4-fast' ? 0.0012 : 0.0010,
          reasoning: `${model}: Momentum building, good entry point`,
          rawText: `BUY ${model === 'grok-4-fast' ? '0.0012' : '0.0010'} BTC`,
          normalizedAction: 'buy',
          model,
          phaseId,
        };

      case 'no-consensus':
        // Ensure each model gets a different action
        const modelActions: Record<ModelName, 'BUY' | 'SELL' | 'HOLD'> = {
          'gpt-5-nano': 'BUY',
          'grok-4-fast': 'SELL',
          'google/gemini-2.5-flash': 'HOLD',
        };
        const action = modelActions[model];
        return {
          action,
          asset: 'BTC',
          quantity: action === 'HOLD' ? 0 : 0.001,
          reasoning: `${model}: ${action} based on technical analysis`,
          rawText: `${action} ${action === 'HOLD' ? '0' : '0.001'} BTC`,
          normalizedAction: action.toLowerCase(),
          model,
          phaseId,
        };

      case 'timeout':
        if (model === 'google/gemini-2.5-flash') {
          await this.delay(20000); // Simulate timeout
        }
        return {
          action: 'BUY',
          asset: 'BTC',
          quantity: 0.001,
          reasoning: `${model}: Market conditions favorable`,
          rawText: 'BUY 0.001 BTC',
          normalizedAction: 'buy',
          model,
          phaseId,
        };

      case 'parse-error':
        if (model === 'grok-4-fast') {
          throw new Error('Failed to parse JSON response');
        }
        return {
          action: 'BUY',
          asset: 'BTC',
          quantity: 0.001,
          reasoning: `${model}: Clear buy signal`,
          rawText: 'BUY 0.001 BTC',
          normalizedAction: 'buy',
          model,
          phaseId,
        };

      default:
        throw new Error(`Unknown scenario: ${this.scenario}`);
    }
  }

  async generateCritique(
    model: ModelName,
    targetProposals: NormalizedDecision[]
  ): Promise<CritiqueOutput[]> {
    const delay = this.randomDelay();
    await this.delay(delay);

    const critiques: CritiqueOutput[] = [];

    for (const target of targetProposals) {
      if (target.model === model) continue; // Don't critique self

      critiques.push({
        model,
        targetModel: target.model,
        critique: `${model} critiques ${target.model}: The ${target.action} decision may not account for recent volatility.`,
        risks: [
          'Liquidity risk during high volatility',
          'Potential for rapid price reversal',
        ],
        conflicts: [
          target.action === 'BUY' ? 'May be buying at local top' : 'May be selling at local bottom',
        ],
        phaseId: `critique-${model}-${target.model}`,
        timeMs: delay,
      });
    }

    return critiques;
  }

  async generateRevision(
    model: ModelName,
    originalProposal: NormalizedDecision,
    receivedCritiques: CritiqueOutput[]
  ): Promise<NormalizedDecision> {
    const delay = this.randomDelay();
    await this.delay(delay);

    // For majority-2-1 scenario, have gpt-5-nano flip to BUY after critiques
    if (this.scenario === 'majority-2-1' && model === 'gpt-5-nano') {
      return {
        action: 'BUY',
        asset: 'BTC',
        quantity: 0.0011,
        reasoning: `${model}: After reviewing critiques, the bullish case is stronger. Revising to BUY.`,
        rawText: 'BUY 0.0011 BTC',
        normalizedAction: 'buy',
        model,
        phaseId: `revision-${model}`,
      };
    }

    // For no-consensus scenario, models stick to their positions
    if (this.scenario === 'no-consensus') {
      return {
        ...originalProposal,
        quantity: originalProposal.quantity,
        reasoning: `${model}: After consideration, maintaining ${originalProposal.action} position. My analysis stands.`,
        phaseId: `revision-${model}`,
      };
    }

    // Otherwise, keep original proposal with minor quantity adjustment
    const adjustedQuantity = originalProposal.quantity * 0.95;
    return {
      ...originalProposal,
      quantity: adjustedQuantity,
      reasoning: `${model}: Maintaining ${originalProposal.action} position with slight quantity adjustment based on critiques.`,
      phaseId: `revision-${model}`,
    };
  }

  async generateVote(
    model: ModelName,
    revisedProposals: NormalizedDecision[]
  ): Promise<VoteOutput> {
    const delay = this.randomDelay();
    await this.delay(delay);

    // Filter out own proposal
    const othersProposals = revisedProposals.filter(p => p.model !== model);

    // Simple voting logic: prefer BUY > HOLD > SELL, then by quantity
    const sorted = [...othersProposals].sort((a, b) => {
      const actionScore = { BUY: 3, HOLD: 2, SELL: 1 };
      const scoreA = actionScore[a.action];
      const scoreB = actionScore[b.action];
      if (scoreA !== scoreB) return scoreB - scoreA;
      return b.quantity - a.quantity;
    });

    return {
      model,
      rankings: [
        {
          rank: 1,
          targetModel: sorted[0].model,
          justification: `Strongest technical foundation and risk management`,
        },
        {
          rank: 2,
          targetModel: sorted[1].model,
          justification: `Solid analysis but slightly less conviction`,
        },
      ],
      phaseId: `vote-${model}`,
      timeMs: delay,
    };
  }
}

// ============================================================================
// NORMALIZATION & CONSENSUS
// ============================================================================

function normalizeAction(action: string): string {
  return action.trim().toLowerCase();
}

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

interface ConsensusResult {
  hasConsensus: boolean;
  consensusType: ConsensusType;
  agreedAction?: string;
  medianQuantity?: number;
  quantitiesWithinTolerance?: boolean;
  participatingModels: ModelName[];
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
// RANKED VOTING
// ============================================================================

interface VoteScore {
  model: ModelName;
  score: number;
  firstPlaceVotes: number;
}

function calculateVoteScores(votes: VoteOutput[]): VoteScore[] {
  const scores: Record<string, VoteScore> = {};

  // Initialize scores for all models
  votes.forEach(vote => {
    vote.rankings.forEach(ranking => {
      if (!scores[ranking.targetModel]) {
        scores[ranking.targetModel] = {
          model: ranking.targetModel,
          score: 0,
          firstPlaceVotes: 0,
        };
      }
    });
  });

  // Tally votes
  votes.forEach(vote => {
    vote.rankings.forEach(ranking => {
      const points = ranking.rank === 1 ? 2 : 1;
      scores[ranking.targetModel].score += points;
      if (ranking.rank === 1) {
        scores[ranking.targetModel].firstPlaceVotes += 1;
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
// CONSOLE FORMATTER
// ============================================================================

class ConsoleFormatter {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  private elapsed(): string {
    const ms = Date.now() - this.startTime;
    return `+${(ms / 1000).toFixed(2)}s`;
  }

  logHeader() {
    console.log('\n' + '='.repeat(80));
    console.log('🏛️  LLM COUNCIL DEBATE - TEST SIMULATION');
    console.log('='.repeat(80) + '\n');
  }

  logPhaseStart(phase: Phase) {
    console.log(`\n[${ this.elapsed()}] 📋 PHASE: ${phase.toUpperCase()}`);
    console.log('-'.repeat(80));
  }

  logModelStart(model: ModelName, phase: Phase) {
    console.log(`[${ this.elapsed()}]   🤖 ${model} generating ${phase}...`);
  }

  logModelSuccess(model: ModelName, timeMs: number, preview: string) {
    console.log(`[${ this.elapsed()}]   ✅ ${model} completed (${timeMs}ms): ${preview}`);
  }

  logModelError(model: ModelName, error: string) {
    console.log(`[${ this.elapsed()}]   ❌ ${model} failed: ${error}`);
  }

  logModelTimeout(model: ModelName) {
    console.log(`[${ this.elapsed()}]   ⏱️  ${model} timed out`);
  }

  logConsensusCheck(result: ConsensusResult) {
    console.log(`\n[${ this.elapsed()}] 🔍 Checking consensus...`);
    if (result.hasConsensus) {
      console.log(`[${ this.elapsed()}]   ✅ ${result.consensusType.toUpperCase()} consensus on: ${result.agreedAction?.toUpperCase()}`);
      console.log(`[${ this.elapsed()}]   📊 Median quantity: ${result.medianQuantity}`);
      console.log(`[${ this.elapsed()}]   📏 Within ${result.quantitiesWithinTolerance ? '✓' : '✗'} 30% tolerance`);
    } else {
      console.log(`[${ this.elapsed()}]   ❌ No consensus reached`);
    }
  }

  logVoteResults(scores: VoteScore[]) {
    console.log(`\n[${ this.elapsed()}] 🗳️  Vote Results:`);
    scores.forEach((score, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
      console.log(`[${ this.elapsed()}]   ${medal} ${score.model}: ${score.score} points (${score.firstPlaceVotes} first-place)`);
    });
  }

  logFinalDecision(output: CouncilOutput) {
    console.log('\n' + '='.repeat(80));
    console.log('📜 FINAL COUNCIL DECISION');
    console.log('='.repeat(80));
    console.log(`Action: ${output.action}`);
    console.log(`Asset: ${output.asset}`);
    console.log(`Quantity: ${output.quantity}`);
    console.log(`Reasoning: ${output.reasoning}`);
    console.log(`\n--- Metadata ---`);
    console.log(`Selected Model: ${output._meta.selectedModel || 'NONE'}`);
    console.log(`Consensus: ${output._meta.consensusType}`);
    console.log(`Total Time: ${output._meta.totalTimeMs}ms`);
    if (output._meta.voteScores) {
      console.log(`Vote Scores: ${JSON.stringify(output._meta.voteScores)}`);
    }
    console.log('='.repeat(80) + '\n');
  }
}

// ============================================================================
// PHASE ORCHESTRATORS
// ============================================================================

class PhaseOrchestrator {
  constructor(
    private adapter: MockAdapter,
    private config: CouncilConfig,
    private logger: ConsoleFormatter
  ) {}

  async runProposalPhase(marketContext: any): Promise<NormalizedDecision[]> {
    this.logger.logPhaseStart('proposal');

    const promises = this.config.models.map(async model => {
      this.logger.logModelStart(model, 'proposal');
      const startTime = Date.now();

      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.config.perTurnTimeoutMs)
        );

        const result = await Promise.race([
          this.adapter.generateProposal(model, marketContext),
          timeoutPromise,
        ]);

        const timeMs = Date.now() - startTime;
        this.logger.logModelSuccess(model, timeMs, `${result.action} ${result.quantity}`);
        return result;
      } catch (error: any) {
        const timeMs = Date.now() - startTime;
        if (error.message === 'Timeout') {
          this.logger.logModelTimeout(model);
        } else {
          this.logger.logModelError(model, error.message);
        }
        return null;
      }
    });

    const results = await Promise.all(promises);
    return results.filter((r): r is NormalizedDecision => r !== null);
  }

  async runCritiquePhase(proposals: NormalizedDecision[]): Promise<CritiqueOutput[]> {
    this.logger.logPhaseStart('critique');

    const promises = this.config.models.map(async model => {
      const modelProposals = proposals.filter(p => p.model !== model);
      if (modelProposals.length === 0) return [];

      this.logger.logModelStart(model, 'critique');
      const startTime = Date.now();

      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.config.perTurnTimeoutMs)
        );

        const result = await Promise.race([
          this.adapter.generateCritique(model, modelProposals),
          timeoutPromise,
        ]);

        const timeMs = Date.now() - startTime;
        this.logger.logModelSuccess(model, timeMs, `${result.length} critiques`);
        return result;
      } catch (error: any) {
        const timeMs = Date.now() - startTime;
        if (error.message === 'Timeout') {
          this.logger.logModelTimeout(model);
        } else {
          this.logger.logModelError(model, error.message);
        }
        return [];
      }
    });

    const results = await Promise.all(promises);
    return results.flat();
  }

  async runRevisionPhase(
    proposals: NormalizedDecision[],
    critiques: CritiqueOutput[]
  ): Promise<NormalizedDecision[]> {
    this.logger.logPhaseStart('revision');

    const promises = this.config.models.map(async model => {
      const originalProposal = proposals.find(p => p.model === model);
      if (!originalProposal) return null;

      const receivedCritiques = critiques.filter(c => c.targetModel === model);

      this.logger.logModelStart(model, 'revision');
      const startTime = Date.now();

      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.config.perTurnTimeoutMs)
        );

        const result = await Promise.race([
          this.adapter.generateRevision(model, originalProposal, receivedCritiques),
          timeoutPromise,
        ]);

        const timeMs = Date.now() - startTime;
        this.logger.logModelSuccess(model, timeMs, `${result.action} ${result.quantity}`);
        return result;
      } catch (error: any) {
        const timeMs = Date.now() - startTime;
        if (error.message === 'Timeout') {
          this.logger.logModelTimeout(model);
        } else {
          this.logger.logModelError(model, error.message);
        }
        return null;
      }
    });

    const results = await Promise.all(promises);
    return results.filter((r): r is NormalizedDecision => r !== null);
  }

  async runVotePhase(revisedProposals: NormalizedDecision[]): Promise<VoteOutput[]> {
    this.logger.logPhaseStart('vote');

    const promises = this.config.models.map(async model => {
      this.logger.logModelStart(model, 'vote');
      const startTime = Date.now();

      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.config.perTurnTimeoutMs)
        );

        const result = await Promise.race([
          this.adapter.generateVote(model, revisedProposals),
          timeoutPromise,
        ]);

        const timeMs = Date.now() - startTime;
        this.logger.logModelSuccess(
          model,
          timeMs,
          `1st: ${result.rankings[0].targetModel}, 2nd: ${result.rankings[1].targetModel}`
        );
        return result;
      } catch (error: any) {
        const timeMs = Date.now() - startTime;
        if (error.message === 'Timeout') {
          this.logger.logModelTimeout(model);
        } else {
          this.logger.logModelError(model, error.message);
        }
        return null;
      }
    });

    const results = await Promise.all(promises);
    return results.filter((r): r is VoteOutput => r !== null);
  }
}

// ============================================================================
// MAIN CONTROLLER
// ============================================================================

async function runCouncilDebate(
  scenario: TestScenario,
  marketContext: any
): Promise<CouncilOutput> {
  const config = DEFAULT_CONFIG;
  const adapter = new MockAdapter({ scenario, simulateTiming: true, debugLog: false });
  const logger = new ConsoleFormatter();
  const orchestrator = new PhaseOrchestrator(adapter, config, logger);

  logger.logHeader();
  console.log(`🎭 Test Scenario: ${scenario}`);
  console.log(`⏱️  Global Timeout: ${config.globalTimeoutMs}ms`);
  console.log(`🔧 Models: ${config.models.join(', ')}\n`);

  const startTime = Date.now();

  // Phase 1: Proposals
  const proposals = await orchestrator.runProposalPhase(marketContext);

  if (proposals.length === 0) {
    // All models failed or timed out
    return {
      action: 'HOLD',
      asset: 'BTC',
      quantity: 0,
      reasoning: 'Council could not generate any proposals within time limits',
      _meta: {
        selectedModel: null,
        consensusType: 'none',
        totalTimeMs: Date.now() - startTime,
        rationaleSnippet: 'All models failed or timed out',
      },
    };
  }

  // Check for early consensus after proposals
  const earlyConsensus = checkConsensus(proposals, config);
  logger.logConsensusCheck(earlyConsensus);

  if (config.earlyExit && earlyConsensus.hasConsensus) {
    console.log(`\n⚡ Early exit: ${earlyConsensus.consensusType} agreement reached after proposals`);

    // Pick the model that matches the consensus (prefer first in list)
    const consensusDecision = proposals.find(
      p => p.normalizedAction === earlyConsensus.agreedAction
    ) || proposals[0];

    const output: CouncilOutput = {
      action: consensusDecision.action,
      asset: consensusDecision.asset,
      quantity: earlyConsensus.medianQuantity!,
      reasoning: consensusDecision.reasoning,
      _meta: {
        selectedModel: consensusDecision.model,
        consensusType: earlyConsensus.consensusType,
        totalTimeMs: Date.now() - startTime,
        rationaleSnippet: `Early ${earlyConsensus.consensusType} agreement`,
      },
    };

    logger.logFinalDecision(output);
    return output;
  }

  // Phase 2: Critiques
  const critiques = await orchestrator.runCritiquePhase(proposals);

  // Phase 3: Revisions
  const revisions = await orchestrator.runRevisionPhase(proposals, critiques);

  if (revisions.length === 0) {
    return {
      action: 'HOLD',
      asset: 'BTC',
      quantity: 0,
      reasoning: 'Council could not complete revisions within time limits',
      _meta: {
        selectedModel: null,
        consensusType: 'none',
        totalTimeMs: Date.now() - startTime,
        rationaleSnippet: 'Revisions failed',
      },
    };
  }

  // Check consensus after revisions
  const revisionConsensus = checkConsensus(revisions, config);
  logger.logConsensusCheck(revisionConsensus);

  if (revisionConsensus.hasConsensus) {
    // Pick the model that matches the consensus
    const consensusDecision = revisions.find(
      p => p.normalizedAction === revisionConsensus.agreedAction
    ) || revisions[0];

    const output: CouncilOutput = {
      action: consensusDecision.action,
      asset: consensusDecision.asset,
      quantity: revisionConsensus.medianQuantity!,
      reasoning: consensusDecision.reasoning,
      _meta: {
        selectedModel: consensusDecision.model,
        consensusType: revisionConsensus.consensusType,
        totalTimeMs: Date.now() - startTime,
        rationaleSnippet: `Consensus after revision`,
      },
    };

    logger.logFinalDecision(output);
    return output;
  }

  // Phase 4: Voting (no consensus yet, need to vote)
  const votes = await orchestrator.runVotePhase(revisions);

  if (votes.length === 0) {
    return {
      action: 'HOLD',
      asset: 'BTC',
      quantity: 0,
      reasoning: 'Council could not complete voting within time limits',
      _meta: {
        selectedModel: null,
        consensusType: 'none',
        totalTimeMs: Date.now() - startTime,
        rationaleSnippet: 'Voting failed',
      },
    };
  }

  // Calculate vote scores
  const voteScores = calculateVoteScores(votes);
  logger.logVoteResults(voteScores);

  // Winner is the model with highest score
  const winner = voteScores[0];
  const winningDecision = revisions.find(r => r.model === winner.model);

  if (!winningDecision) {
    return {
      action: 'HOLD',
      asset: 'BTC',
      quantity: 0,
      reasoning: 'Council voting resulted in invalid winner',
      _meta: {
        selectedModel: null,
        consensusType: 'none',
        totalTimeMs: Date.now() - startTime,
        rationaleSnippet: 'Invalid vote result',
      },
    };
  }

  const output: CouncilOutput = {
    action: winningDecision.action,
    asset: winningDecision.asset,
    quantity: winningDecision.quantity,
    reasoning: winningDecision.reasoning,
    _meta: {
      selectedModel: winner.model,
      consensusType: 'majority',
      totalTimeMs: Date.now() - startTime,
      voteScores: Object.fromEntries(voteScores.map(s => [s.model, s.score])) as Record<ModelName, number>,
      rationaleSnippet: `Won by ranked vote (${winner.score} points)`,
    },
  };

  logger.logFinalDecision(output);
  return output;
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

async function runAllTests() {
  const marketContext = {
    symbol: 'BTCUSDT',
    currentPrice: 98750.00,
    priceChange24h: 2.5,
  };

  console.log('\n🧪 Running all test scenarios...\n');

  // Test 1: Unanimous agreement
  console.log('\n' + '▶'.repeat(40) + ' TEST 1 ' + '▶'.repeat(40));
  await runCouncilDebate('unanimous', marketContext);

  // Test 2: Majority (2-1)
  console.log('\n' + '▶'.repeat(40) + ' TEST 2 ' + '▶'.repeat(40));
  await runCouncilDebate('majority-2-1', marketContext);

  // Test 3: No consensus
  console.log('\n' + '▶'.repeat(40) + ' TEST 3 ' + '▶'.repeat(40));
  await runCouncilDebate('no-consensus', marketContext);

  // Test 4: Timeout recovery
  console.log('\n' + '▶'.repeat(40) + ' TEST 4 ' + '▶'.repeat(40));
  await runCouncilDebate('timeout', marketContext);

  // Test 5: Parse error recovery
  console.log('\n' + '▶'.repeat(40) + ' TEST 5 ' + '▶'.repeat(40));
  await runCouncilDebate('parse-error', marketContext);

  console.log('\n✅ All tests completed!\n');
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runCouncilDebate, MockAdapter, DEFAULT_CONFIG };
