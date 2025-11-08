/**
 * Agent Statistics Utilities
 * Functions for calculating agent performance metrics and portfolio values
 */

import { promises as fs } from 'fs';
import path from 'path';
import { Spot } from '@binance/connector';
import { getAgentConfig } from '@/config/agents';
import { Balance } from '@/types/trading';
import { calculateTotalPortfolioValue } from '@/lib/utils/portfolioCalculator';
import { readTradeHistory } from '@/lib/storage/tradeHistory';

interface AgentBaseline {
  name: string;
  displayName: string;
  startingCapital: number;
  initializedAt: string;
}

const AGENT_BASELINES_FILE = path.join(process.cwd(), 'data', 'agent-baselines.json');

/**
 * Reads agent baseline data from JSON file
 * @returns Array of agent baseline configurations
 */
export async function getAgentBaselines(): Promise<AgentBaseline[]> {
  try {
    const fileContent = await fs.readFile(AGENT_BASELINES_FILE, 'utf-8');
    const baselines = JSON.parse(fileContent);
    return Array.isArray(baselines) ? baselines : [];
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error('Agent baselines file not found');
      return [];
    }
    console.error('Error reading agent baselines:', error);
    return [];
  }
}

/**
 * Calculates current portfolio value for given balances and prices
 * This is a convenience wrapper around the existing portfolioCalculator function
 * @param balances - Array of asset balances
 * @param currentPrices - Record of current market prices (e.g., { BTCUSDT: 95000 })
 * @returns Total portfolio value in USDT
 */
export function calculateCurrentPortfolioValue(
  balances: Balance[],
  currentPrices: Record<string, number>
): number {
  return calculateTotalPortfolioValue(balances, currentPrices);
}

/**
 * Fetches current market prices for all relevant trading pairs
 * @param client - Binance Spot client instance
 * @returns Record of current prices
 */
async function getCurrentPrices(client: Spot): Promise<Record<string, number>> {
  try {
    const btcTicker = await client.tickerPrice('BTCUSDT');
    const btcPrice = parseFloat(btcTicker.data.price);

    // Only BTC for now - add more pairs if needed later
    return {
      BTCUSDT: btcPrice,
    };
  } catch (error) {
    console.error('Error fetching current prices:', error);
    throw error;
  }
}

/**
 * Fetches current balances for an agent from Binance
 * @param agentName - Name of the agent
 * @returns Array of balances with free, locked, and total amounts
 */
async function getAgentBalances(agentName: string): Promise<Balance[]> {
  const agentConfig = getAgentConfig(agentName);
  if (!agentConfig) {
    throw new Error(`Agent configuration not found for: ${agentName}`);
  }

  const client = new Spot(
    agentConfig.binanceApiKey,
    agentConfig.binanceSecretKey,
    { baseURL: process.env.BINANCE_BASE_URL }
  );

  try {
    const accountInfo = await client.account();
    const balances = accountInfo.data.balances
      .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map((b: any) => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
        total: parseFloat(b.free) + parseFloat(b.locked),
      }));

    return balances;
  } catch (error) {
    console.error(`Error fetching balances for ${agentName}:`, error);
    throw error;
  }
}

/**
 * Calculates comprehensive statistics for a specific agent
 * @param agentName - Name of the agent ('openai', 'grok', 'gemini', 'council')
 * @returns Agent performance statistics
 */
export async function calculateAgentStats(agentName: string): Promise<{
  startingCapital: number;
  currentValue: number;
  roiPercent: number;
  absolutePnL: number;
  totalTrades: number;
}> {
  // Get agent baseline (starting capital)
  const baselines = await getAgentBaselines();
  const baseline = baselines.find(b => b.name === agentName);

  if (!baseline) {
    throw new Error(`No baseline found for agent: ${agentName}`);
  }

  const startingCapital = baseline.startingCapital;

  // Get agent configuration
  const agentConfig = getAgentConfig(agentName);
  if (!agentConfig) {
    throw new Error(`Agent configuration not found for: ${agentName}`);
  }

  // Fetch current balances and prices
  const balances = await getAgentBalances(agentName);

  const client = new Spot(
    agentConfig.binanceApiKey,
    agentConfig.binanceSecretKey,
    { baseURL: process.env.BINANCE_BASE_URL }
  );

  const currentPrices = await getCurrentPrices(client);

  // Calculate current portfolio value
  const currentValue = calculateCurrentPortfolioValue(balances, currentPrices);

  // Calculate ROI and P&L
  const absolutePnL = currentValue - startingCapital;
  const roiPercent = (absolutePnL / startingCapital) * 100;

  // Count trades for this agent
  const tradeHistory = await readTradeHistory();
  const totalTrades = tradeHistory.filter(trade => trade.aiModel === agentName).length;

  return {
    startingCapital,
    currentValue,
    roiPercent,
    absolutePnL,
    totalTrades,
  };
}
