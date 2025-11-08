/**
 * Council Statistics Calculation Functions
 *
 * Provides statistical analysis for the collaborative trading council system.
 * Functions calculate performance metrics, model contributions, consensus patterns,
 * risk metrics, and execution statistics from council trade history.
 */

import { TradeRecord } from '@/types/trading';
import { CouncilMetadata } from './types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate Sharpe ratio (risk-adjusted return)
 * Formula: (Average Return - Risk-Free Rate) / Standard Deviation of Returns
 *
 * @param returns Array of portfolio returns (as percentages)
 * @param riskFreeRate Annual risk-free rate (default 0.04 = 4%)
 * @returns Sharpe ratio (higher is better, >1 is good, >2 is excellent)
 */
export function calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.04): number {
  if (returns.length === 0) return 0;

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  // Annualize the Sharpe ratio (assuming daily returns)
  const dailyRiskFreeRate = riskFreeRate / 365;
  const sharpeRatio = (avgReturn - dailyRiskFreeRate) / stdDev;

  // Annualize by multiplying by sqrt(365) for daily data
  return sharpeRatio * Math.sqrt(365);
}

/**
 * Calculate maximum drawdown (largest peak-to-trough decline)
 *
 * @param portfolioValues Array of portfolio values over time
 * @returns Object with maxDrawdown percentage and the value at lowest point
 */
export function calculateMaxDrawdown(portfolioValues: number[]): {
  maxDrawdown: number;
  maxDrawdownValue: number;
} {
  if (portfolioValues.length === 0) {
    return { maxDrawdown: 0, maxDrawdownValue: 0 };
  }

  let maxDrawdown = 0;
  let maxDrawdownValue = portfolioValues[0];
  let peak = portfolioValues[0];

  for (const value of portfolioValues) {
    if (value > peak) {
      peak = value;
    }

    const drawdown = ((peak - value) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownValue = value;
    }
  }

  return { maxDrawdown, maxDrawdownValue };
}

// ============================================================================
// MAIN STATISTICS FUNCTIONS
// ============================================================================

/**
 * Calculate decision quality metrics from council trade history
 *
 * @param councilTrades Array of trade records from council agent
 * @returns Object with total trades, win rate, average P&L, and ROI
 */
export function calculateDecisionQualityMetrics(councilTrades: TradeRecord[]): {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  winRate: number;
  avgPnL: number;
  totalPnL: number;
  roi: number;
} {
  if (councilTrades.length === 0) {
    return {
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      winRate: 0,
      avgPnL: 0,
      totalPnL: 0,
      roi: 0,
    };
  }

  const successfulTrades = councilTrades.filter(t => t.success && !t.error).length;
  const failedTrades = councilTrades.filter(t => !t.success || t.error).length;
  const winRate = (successfulTrades / councilTrades.length) * 100;

  // Calculate P&L
  const pnls = councilTrades.map(t => t.portfolioValueAfter - t.portfolioValueBefore);
  const totalPnL = pnls.reduce((sum, pnl) => sum + pnl, 0);
  const avgPnL = totalPnL / councilTrades.length;

  // Calculate ROI
  const initialValue = councilTrades[0].portfolioValueBefore;
  const currentValue = councilTrades[councilTrades.length - 1].portfolioValueAfter;
  const roi = initialValue > 0 ? ((currentValue - initialValue) / initialValue) * 100 : 0;

  return {
    totalTrades: councilTrades.length,
    successfulTrades,
    failedTrades,
    winRate,
    avgPnL,
    totalPnL,
    roi,
  };
}

/**
 * Calculate model contribution statistics (which models get selected most often)
 *
 * @param councilTrades Array of trade records from council agent
 * @returns Object with per-model selection frequency and win rates
 */
export function calculateModelContribution(councilTrades: TradeRecord[]): {
  openai: { timesSelected: number; winRate: number; avgPnL: number };
  grok: { timesSelected: number; winRate: number; avgPnL: number };
  gemini: { timesSelected: number; winRate: number; avgPnL: number };
} {
  const modelStats = {
    openai: { timesSelected: 0, wins: 0, pnls: [] as number[] },
    grok: { timesSelected: 0, wins: 0, pnls: [] as number[] },
    gemini: { timesSelected: 0, wins: 0, pnls: [] as number[] },
  };

  // Process trades with council metadata
  councilTrades.forEach(trade => {
    if (!trade.councilMetadata || !trade.councilMetadata.selectedModel) return;

    const selectedModel = trade.councilMetadata.selectedModel.toLowerCase();
    const pnl = trade.portfolioValueAfter - trade.portfolioValueBefore;

    // Match model by checking if the full model ID contains the short name
    if (selectedModel.includes('gpt') || selectedModel.includes('openai')) {
      modelStats.openai.timesSelected++;
      modelStats.openai.pnls.push(pnl);
      if (trade.success && pnl > 0) modelStats.openai.wins++;
    } else if (selectedModel.includes('grok')) {
      modelStats.grok.timesSelected++;
      modelStats.grok.pnls.push(pnl);
      if (trade.success && pnl > 0) modelStats.grok.wins++;
    } else if (selectedModel.includes('gemini')) {
      modelStats.gemini.timesSelected++;
      modelStats.gemini.pnls.push(pnl);
      if (trade.success && pnl > 0) modelStats.gemini.wins++;
    }
  });

  // Calculate win rates and average P&L
  const calculateStats = (stats: { timesSelected: number; wins: number; pnls: number[] }) => ({
    timesSelected: stats.timesSelected,
    winRate: stats.timesSelected > 0 ? (stats.wins / stats.timesSelected) * 100 : 0,
    avgPnL: stats.pnls.length > 0 ? stats.pnls.reduce((sum, p) => sum + p, 0) / stats.pnls.length : 0,
  });

  return {
    openai: calculateStats(modelStats.openai),
    grok: calculateStats(modelStats.grok),
    gemini: calculateStats(modelStats.gemini),
  };
}

/**
 * Calculate consensus pattern statistics (unanimous vs majority)
 *
 * @param councilTrades Array of trade records from council agent
 * @returns Object with consensus type distribution and vote patterns
 */
export function calculateConsensusPatterns(councilTrades: TradeRecord[]): {
  unanimous: number;
  majority: number;
  none: number;
  unanimousPercentage: number;
  majorityPercentage: number;
  avgDebateDuration: number;
} {
  if (councilTrades.length === 0) {
    return {
      unanimous: 0,
      majority: 0,
      none: 0,
      unanimousPercentage: 0,
      majorityPercentage: 0,
      avgDebateDuration: 0,
    };
  }

  let unanimous = 0;
  let majority = 0;
  let none = 0;
  const debateDurations: number[] = [];

  councilTrades.forEach(trade => {
    if (!trade.councilMetadata) return;

    const consensusType = trade.councilMetadata.consensusType?.toUpperCase() || 'NONE';
    if (consensusType === 'UNANIMOUS') unanimous++;
    else if (consensusType === 'MAJORITY') majority++;
    else none++;

    if (trade.councilMetadata.debateDurationMs) {
      debateDurations.push(trade.councilMetadata.debateDurationMs);
    }
  });

  const totalWithMetadata = unanimous + majority + none;
  const unanimousPercentage = totalWithMetadata > 0 ? (unanimous / totalWithMetadata) * 100 : 0;
  const majorityPercentage = totalWithMetadata > 0 ? (majority / totalWithMetadata) * 100 : 0;
  const avgDebateDuration = debateDurations.length > 0
    ? debateDurations.reduce((sum, d) => sum + d, 0) / debateDurations.length
    : 0;

  return {
    unanimous,
    majority,
    none,
    unanimousPercentage,
    majorityPercentage,
    avgDebateDuration,
  };
}

/**
 * Calculate risk metrics (max drawdown, Sharpe ratio, volatility)
 *
 * @param councilTrades Array of trade records from council agent
 * @returns Object with risk metrics
 */
export function calculateRiskMetrics(councilTrades: TradeRecord[]): {
  maxDrawdown: number;
  maxDrawdownValue: number;
  sharpeRatio: number;
  volatility: number;
} {
  if (councilTrades.length === 0) {
    return {
      maxDrawdown: 0,
      maxDrawdownValue: 0,
      sharpeRatio: 0,
      volatility: 0,
    };
  }

  // Get portfolio values over time
  const portfolioValues = councilTrades.map(t => t.portfolioValueAfter);

  // Calculate returns (percentage change)
  const returns: number[] = [];
  for (let i = 1; i < councilTrades.length; i++) {
    const prevValue = councilTrades[i - 1].portfolioValueAfter;
    const currentValue = councilTrades[i].portfolioValueAfter;
    if (prevValue > 0) {
      returns.push(((currentValue - prevValue) / prevValue) * 100);
    }
  }

  // Calculate max drawdown
  const { maxDrawdown, maxDrawdownValue } = calculateMaxDrawdown(portfolioValues);

  // Calculate Sharpe ratio
  const sharpeRatio = calculateSharpeRatio(returns);

  // Calculate volatility (standard deviation of returns)
  let volatility = 0;
  if (returns.length > 0) {
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    volatility = Math.sqrt(variance);
  }

  return {
    maxDrawdown,
    maxDrawdownValue,
    sharpeRatio,
    volatility,
  };
}

/**
 * Calculate execution metrics (order types, execution time)
 *
 * @param councilTrades Array of trade records from council agent
 * @returns Object with execution statistics
 */
export function calculateExecutionMetrics(councilTrades: TradeRecord[]): {
  marketOrders: number;
  limitOrders: number;
  holdDecisions: number;
  avgExecutionTime: number;
  orderTypeDistribution: {
    market: number;
    limit: number;
    hold: number;
  };
} {
  if (councilTrades.length === 0) {
    return {
      marketOrders: 0,
      limitOrders: 0,
      holdDecisions: 0,
      avgExecutionTime: 0,
      orderTypeDistribution: { market: 0, limit: 0, hold: 0 },
    };
  }

  let marketOrders = 0;
  let limitOrders = 0;
  let holdDecisions = 0;
  const executionTimes: number[] = [];

  councilTrades.forEach(trade => {
    // Check action type
    const actionType = trade.decision.actions?.[0]?.type;

    if (actionType === 'HOLD') {
      holdDecisions++;
    } else if (trade.executedOrder) {
      if (trade.executedOrder.orderType === 'MARKET') {
        marketOrders++;
      } else if (trade.executedOrder.orderType === 'LIMIT') {
        limitOrders++;
      }
    }

    // Track debate/execution time if available
    if (trade.councilMetadata?.debateDurationMs) {
      executionTimes.push(trade.councilMetadata.debateDurationMs);
    }
  });

  const avgExecutionTime = executionTimes.length > 0
    ? executionTimes.reduce((sum, t) => sum + t, 0) / executionTimes.length
    : 0;

  const total = marketOrders + limitOrders + holdDecisions;

  return {
    marketOrders,
    limitOrders,
    holdDecisions,
    avgExecutionTime,
    orderTypeDistribution: {
      market: total > 0 ? (marketOrders / total) * 100 : 0,
      limit: total > 0 ? (limitOrders / total) * 100 : 0,
      hold: total > 0 ? (holdDecisions / total) * 100 : 0,
    },
  };
}
