import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TradeRecord, TradingDecision, Balance } from '@/types/trading';
import type { CouncilMetadata } from '@/lib/council/types';

const TRADE_HISTORY_FILE = path.join(process.cwd(), 'data', 'trade-history.json');

/**
 * Reads the trade history from JSON file
 */
export async function readTradeHistory(): Promise<TradeRecord[]> {
  try {
    const fileContent = await fs.readFile(TRADE_HISTORY_FILE, 'utf-8');
    const trades = JSON.parse(fileContent);
    return Array.isArray(trades) ? trades : [];
  } catch (error: any) {
    // If file doesn't exist or is invalid, return empty array
    if (error.code === 'ENOENT') {
      console.log('Trade history file not found, returning empty array');
      return [];
    }
    console.error('Error reading trade history:', error);
    return [];
  }
}

/**
 * Writes trade history to JSON file
 */
export async function writeTradeHistory(trades: TradeRecord[]): Promise<void> {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(TRADE_HISTORY_FILE);
    await fs.mkdir(dataDir, { recursive: true });

    // Write trades to file with pretty formatting
    await fs.writeFile(TRADE_HISTORY_FILE, JSON.stringify(trades, null, 2), 'utf-8');
    console.log(`Trade history written: ${trades.length} records`);
  } catch (error) {
    console.error('Error writing trade history:', error);
    throw error;
  }
}

/**
 * Logs a trade to the history file
 * Saves: timestamp, market snapshot, decision, order result, portfolio values, AI model, council metadata
 */
export async function logTrade(params: {
  decision: TradingDecision;
  marketData: {
    symbol: string;
    ticker: any;
    balances: Balance[];
  };
  executedOrder?: {
    orderId: string;
    price: number;
    quantity: number;
    status: string;
    orderType: 'MARKET' | 'LIMIT';
    limitPrice?: number;
    executedPrice: number;
    priceImprovement?: number;
  };
  planSnapshot?: string;
  portfolioValueBefore: number;
  portfolioValueAfter: number;
  success: boolean;
  error?: string;
  aiModel?: 'openai' | 'grok' | 'gemini' | 'council';
  councilMetadata?: CouncilMetadata; // Optional: stores debate details for council trades
}): Promise<TradeRecord> {
  // Read existing history
  const history = await readTradeHistory();

  // Create new trade record with unique ID
  const tradeRecord: TradeRecord = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    aiModel: params.aiModel, // Include AI model
    marketData: params.marketData,
    decision: params.decision,
    executedOrder: params.executedOrder,
    plan: params.planSnapshot ?? params.decision.plan,
    portfolioValueBefore: params.portfolioValueBefore,
    portfolioValueAfter: params.portfolioValueAfter,
    success: params.success,
    error: params.error,
    // Include council metadata if provided (only for council trades)
    ...(params.councilMetadata && { councilMetadata: params.councilMetadata })
  };

  // Add to history
  history.push(tradeRecord);

  // Write back to file
  await writeTradeHistory(history);

  const actionType = params.decision.actions?.[0]?.type || 'UNKNOWN';
  console.log(`✓ Trade logged: ${tradeRecord.id} (${actionType})${params.councilMetadata ? ' [with council metadata]' : ''}`);

  return tradeRecord;
}

/**
 * Gets the most recent N trades from history
 * @param limit - Maximum number of trades to return
 * @param agentFilter - Optional: filter by AI model ('openai', 'grok', 'gemini', 'council')
 */
export async function getLastNTrades(limit: number, agentFilter?: string): Promise<TradeRecord[]> {
  if (limit <= 0) {
    return [];
  }

  let history = await readTradeHistory();

  // Apply agent filter if specified
  if (agentFilter) {
    history = history.filter(trade => trade.aiModel === agentFilter);
  }

  const sorted = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return sorted.slice(0, limit);
}

export async function getRecentTrades(limit: number = 20, agentFilter?: string): Promise<TradeRecord[]> {
  return getLastNTrades(limit, agentFilter);
}

/**
 * Calculates cumulative P&L from all trades in history
 */
export async function calculateCumulativePnL(): Promise<number> {
  const history = await readTradeHistory();

  if (history.length === 0) {
    return 0;
  }

  // Get the first recorded portfolio value
  const initialValue = history[0].portfolioValueBefore;

  // Get the most recent portfolio value
  const currentValue = history[history.length - 1].portfolioValueAfter;

  // Calculate total P&L
  return currentValue - initialValue;
}

/**
 * Gets trade statistics
 */
export async function getTradeStatistics(): Promise<{
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  cumulativePnL: number;
  winRate: number;
}> {
  const history = await readTradeHistory();

  const totalTrades = history.length;
  const successfulTrades = history.filter(t => t.success && t.executedOrder).length;
  const failedTrades = history.filter(t => !t.success || t.error).length;
  const cumulativePnL = await calculateCumulativePnL();
  const winRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;

  return {
    totalTrades,
    successfulTrades,
    failedTrades,
    cumulativePnL,
    winRate
  };
}
