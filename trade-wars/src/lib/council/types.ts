/**
 * Shared types for the Council Debate system
 */

import { TradingDecision } from '@/types/trading';
import { FormattedTradeHistory } from '@/lib/utils/tradeHistoryFormatter';
import { IndicatorFormat } from '@/lib/utils/technicalIndicators';
import { OrderBookAnalysis } from '@/lib/utils/orderBookAnalyzer';
import { MarketNewsData } from '@/lib/exa/marketNews';

export type ModelName = 'OpenAI' | 'Grok' | 'Gemini' | 'Kimi' | 'DeepSeek';
export type Phase = 'proposal' | 'vote';
export type ConsensusType = 'unanimous' | 'majority' | 'none';

export interface CouncilConfig {
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

export interface NormalizedDecision extends TradingDecision {
  rawText: string;
  modelName: ModelName;
  phaseId: string;
  planSnapshot?: string;
  normalizedAction: 'BUY' | 'SELL' | 'HOLD' | 'CANCEL';  // Normalized action type for consensus checking
  quantity: number;  // Quantity for consensus checking
}

export interface CritiqueOutput {
  model: ModelName;
  targetModel: ModelName;
  critique: string;
  risks: string[];
  conflicts: string[];
  phaseId: string;
  timeMs: number;
}

export interface VoteOutput {
  model: ModelName;
  rankings: Array<{
    rank: 1 | 2 | 3 | 4 | 5;
    modelName: ModelName;
    reasoning: string;
  }>;
  reasoning: string;
  phaseId: string;
  timeMs: number;
}

export interface VoteScore {
  model: ModelName;
  score: number;
  firstPlaceVotes: number;
}

export interface ConsensusResult {
  hasConsensus: boolean;
  consensusType: ConsensusType;
  agreedAction?: string;
  medianQuantity?: number;
  quantitiesWithinTolerance?: boolean;
  participatingModels: ModelName[];
}

export interface CouncilOutput extends TradingDecision {
  _meta: {
    selectedModel: ModelName | null;
    consensusType: ConsensusType;
    totalTimeMs: number;
    voteScores?: Record<ModelName, number>;
    rationaleSnippet: string;
    /**
     * Individual proposals from each model (captured during proposal phase)
     * Used to populate CouncilMetadata.individualProposals when logging trades
     */
    individualProposals?: NormalizedDecision[];
    /**
     * Execution results from the final decision actions
     * Contains success/failure status and order details for each action
     */
    executionResults?: import('@/lib/execution/multiActionExecutor').ActionResult[];
  };
}

/**
 * Model proposal structure for individual model recommendations
 */
export interface ModelProposal {
  action: string; // 'BUY', 'SELL', 'HOLD', etc.
  reasoning: string;
  quantity?: number;
  price?: number;
  asset?: string;
}

/**
 * Council metadata for storing debate details in trade history
 * This captures the full collaborative decision-making process
 */
export interface CouncilMetadata {
  /**
   * Individual proposals from each of the 5 models
   */
  individualProposals: {
    openai: ModelProposal;
    grok: ModelProposal;
    gemini: ModelProposal;
    kimi: ModelProposal;
    deepseek: ModelProposal;
  };

  /**
   * Voting matrix showing how each model ranked each proposal
   * Example: { openai: { openai: 5, grok: 4, gemini: 3, kimi: 2, deepseek: 1 } }
   */
  votingMatrix: Record<ModelName, Record<ModelName, number>>;

  /**
   * Final vote scores (total points for each proposal)
   * Example: { openai: 18, grok: 24, gemini: 13, kimi: 17, deepseek: 5 }
   */
  voteScores: Record<ModelName, number>;

  /**
   * Which model's proposal won
   */
  selectedModel: ModelName;

  /**
   * Total time taken for the 2-phase process in milliseconds
   */
  debateDurationMs: number;
}

// Event types for streaming to frontend
export type CouncilEvent =
  | { type: 'phase_start'; phase: Phase; timestamp: number }
  | { type: 'model_start'; model: ModelName; phase: Phase; timestamp: number }
  | { type: 'model_complete'; model: ModelName; phase: Phase; data: any; timeMs: number; timestamp: number }
  | { type: 'model_error'; model: ModelName; phase: Phase; error: string; timestamp: number }
  | { type: 'model_timeout'; model: ModelName; phase: Phase; timestamp: number }
  | { type: 'consensus_check'; result: ConsensusResult; timestamp: number }
  | { type: 'vote_results'; scores: VoteScore[]; timestamp: number }
  | { type: 'final_decision'; decision: CouncilOutput; timestamp: number }
  | { type: 'early_exit'; consensusType: ConsensusType; timestamp: number };

export type CouncilEventCallback = (event: CouncilEvent) => void;

// Market intelligence interface
export interface MarketIntelligence {
  symbol: string;
  ticker: {
    lastPrice: number;
    priceChange: number;
    priceChangePercent: number;
    highPrice: number;
    lowPrice: number;
    volume: number;
    quoteVolume: number;
  };
  klines: Array<{
    openTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    closeTime: number;
  }>;
  balances: Array<{
    asset: string;
    free: number;
    locked: number;
    total: number;
  }>;
  tradeHistory: FormattedTradeHistory;
  indicators: IndicatorFormat;
  orderBook: OrderBookAnalysis | null;
  marketNews: MarketNewsData | null;
  timestamp?: number;
}
