/**
 * Portfolio History Utilities
 * Functions for building time-series data for multi-agent portfolio charts
 */

import { readTradeHistory } from '@/lib/storage/tradeHistory';
import { getAgentBaselines } from './agentStats';

export interface PortfolioDataPoint {
  timestamp: string;
  openai: number;
  grok: number;
  gemini: number;
  council: number;
}

/**
 * Builds time-series portfolio data for all 4 agents (or a single agent if filtered)
 * Each data point shows the portfolio value of all agents at a specific timestamp
 *
 * @param agentFilter - Optional agent name to filter by ('openai', 'grok', 'gemini', 'council')
 * @returns Array of portfolio data points sorted by timestamp
 */
export async function buildPortfolioTimeSeries(agentFilter?: string): Promise<PortfolioDataPoint[]> {
  // Get agent baselines (starting capital)
  const baselines = await getAgentBaselines();

  if (baselines.length === 0) {
    console.warn('No agent baselines found');
    return [];
  }

  // Initialize portfolio values at baseline
  const portfolioValues: Record<string, number> = {
    openai: baselines.find(b => b.name === 'openai')?.startingCapital || 124038.33,
    grok: baselines.find(b => b.name === 'grok')?.startingCapital || 124038.33,
    gemini: baselines.find(b => b.name === 'gemini')?.startingCapital || 124038.33,
    council: baselines.find(b => b.name === 'council')?.startingCapital || 124038.33,
  };

  // Read all trades from history
  let trades = await readTradeHistory();

  // Apply agent filter if specified
  if (agentFilter) {
    trades = trades.filter(trade => trade.aiModel === agentFilter);
  }

  if (trades.length === 0) {
    // No trades yet - return single data point with baseline values
    const earliestBaseline = baselines.reduce((earliest, current) => {
      return new Date(current.initializedAt) < new Date(earliest.initializedAt)
        ? current
        : earliest;
    });

    // If filtering, only populate the filtered agent's value
    if (agentFilter) {
      const filteredBaseline = baselines.find(b => b.name === agentFilter);
      return [{
        timestamp: filteredBaseline?.initializedAt || earliestBaseline.initializedAt,
        openai: agentFilter === 'openai' ? (portfolioValues.openai) : 0,
        grok: agentFilter === 'grok' ? (portfolioValues.grok) : 0,
        gemini: agentFilter === 'gemini' ? (portfolioValues.gemini) : 0,
        council: agentFilter === 'council' ? (portfolioValues.council) : 0,
      }];
    }

    // No filter - return all agents
    return [{
      timestamp: earliestBaseline.initializedAt,
      openai: portfolioValues.openai,
      grok: portfolioValues.grok,
      gemini: portfolioValues.gemini,
      council: portfolioValues.council,
    }];
  }

  // Sort trades by timestamp (ascending - earliest first)
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Build time-series data points
  const dataPoints: PortfolioDataPoint[] = [];

  // Add initial data point with baseline values (before first trade)
  const firstTradeTime = new Date(sortedTrades[0].timestamp).getTime();
  const earliestBaseline = baselines.reduce((earliest, current) => {
    return new Date(current.initializedAt) < new Date(earliest.initializedAt)
      ? current
      : earliest;
  });

  // Only add baseline point if it's before the first trade
  if (new Date(earliestBaseline.initializedAt).getTime() < firstTradeTime) {
    if (agentFilter) {
      // Filtered: only populate the requested agent
      dataPoints.push({
        timestamp: earliestBaseline.initializedAt,
        openai: agentFilter === 'openai' ? portfolioValues.openai : 0,
        grok: agentFilter === 'grok' ? portfolioValues.grok : 0,
        gemini: agentFilter === 'gemini' ? portfolioValues.gemini : 0,
        council: agentFilter === 'council' ? portfolioValues.council : 0,
      });
    } else {
      // No filter: return all agents
      dataPoints.push({
        timestamp: earliestBaseline.initializedAt,
        openai: portfolioValues.openai,
        grok: portfolioValues.grok,
        gemini: portfolioValues.gemini,
        council: portfolioValues.council,
      });
    }
  }

  // Process each trade and update portfolio values
  for (const trade of sortedTrades) {
    const agentName = trade.aiModel;

    // Update the portfolio value for the agent that made this trade
    if (agentName && portfolioValues.hasOwnProperty(agentName)) {
      portfolioValues[agentName] = trade.portfolioValueAfter;
    }

    // Create a data point
    if (agentFilter) {
      // Filtered: only populate the requested agent
      dataPoints.push({
        timestamp: trade.timestamp,
        openai: agentFilter === 'openai' ? portfolioValues.openai : 0,
        grok: agentFilter === 'grok' ? portfolioValues.grok : 0,
        gemini: agentFilter === 'gemini' ? portfolioValues.gemini : 0,
        council: agentFilter === 'council' ? portfolioValues.council : 0,
      });
    } else {
      // No filter: return all agents
      dataPoints.push({
        timestamp: trade.timestamp,
        openai: portfolioValues.openai,
        grok: portfolioValues.grok,
        gemini: portfolioValues.gemini,
        council: portfolioValues.council,
      });
    }
  }

  return dataPoints;
}

/**
 * Gets the most recent portfolio values for all agents
 * @returns Latest portfolio data point or baseline values if no trades exist
 */
export async function getCurrentPortfolioValues(): Promise<PortfolioDataPoint> {
  const timeSeries = await buildPortfolioTimeSeries();

  if (timeSeries.length === 0) {
    // Return baseline values if no data
    const baselines = await getAgentBaselines();
    const now = new Date().toISOString();

    return {
      timestamp: now,
      openai: baselines.find(b => b.name === 'openai')?.startingCapital || 124038.33,
      grok: baselines.find(b => b.name === 'grok')?.startingCapital || 124038.33,
      gemini: baselines.find(b => b.name === 'gemini')?.startingCapital || 124038.33,
      council: baselines.find(b => b.name === 'council')?.startingCapital || 124038.33,
    };
  }

  // Return the most recent data point
  return timeSeries[timeSeries.length - 1];
}
