import { NextResponse } from 'next/server';
import {
  getRecentTrades,
  logTrade,
  getTradeStatistics
} from '@/lib/storage/tradeHistory';
import { TradingDecision, Balance } from '@/types/trading';

/**
 * GET /api/trade-history
 * Returns the last 20 trades sorted by timestamp (most recent first)
 * Also includes trade statistics
 *
 * Query Parameters:
 * - limit (number): Maximum number of trades to return (default: 20)
 * - agent (string): Filter by AI model ('openai', 'grok', 'gemini', 'council')
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const agentFilter = searchParams.get('agent') || undefined;

    // Get recent trades (optionally filtered by agent)
    const trades = await getRecentTrades(limit, agentFilter);

    // Get statistics
    const stats = await getTradeStatistics();

    return NextResponse.json({
      success: true,
      trades,
      statistics: stats,
      count: trades.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching trade history:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch trade history'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trade-history
 * Logs a new trade to the history
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.decision || !body.marketData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: decision, marketData'
        },
        { status: 400 }
      );
    }

    // Log the trade
    const tradeRecord = await logTrade({
      decision: body.decision as TradingDecision,
      marketData: {
        symbol: body.marketData.symbol,
        ticker: body.marketData.ticker,
        balances: body.marketData.balances as Balance[]
      },
      executedOrder: body.executedOrder,
      planSnapshot: body.planSnapshot,
      portfolioValueBefore: body.portfolioValueBefore || 0,
      portfolioValueAfter: body.portfolioValueAfter || 0,
      success: body.success !== false, // Default to true if not specified
      error: body.error
    });

    return NextResponse.json({
      success: true,
      trade: tradeRecord,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error logging trade:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to log trade'
      },
      { status: 500 }
    );
  }
}
