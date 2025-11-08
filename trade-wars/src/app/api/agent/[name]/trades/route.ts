/**
 * Individual Agent Trades API Endpoint
 * Returns trade history for a specific agent
 */

import { NextResponse } from 'next/server';
import { readTradeHistory } from '@/lib/storage/tradeHistory';

interface AgentTrade {
  id: string;
  timestamp: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  asset: string;
  quantity: number;
  price: number;
  portfolioValueBefore: number;
  portfolioValueAfter: number;
  pnl: number;
  success: boolean;
  error?: string;
}

const VALID_AGENTS = ['openai', 'grok', 'gemini', 'council'];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: agentName } = await params;

    // Validate agent name
    if (!VALID_AGENTS.includes(agentName)) {
      return NextResponse.json(
        {
          error: `Invalid agent name. Must be one of: ${VALID_AGENTS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    // Validate limit
    if (isNaN(limit) || limit < 1) {
      return NextResponse.json(
        {
          error: 'Invalid limit parameter. Must be a positive integer.',
        },
        { status: 400 }
      );
    }

    console.log(`📜 Fetching last ${limit} trades for ${agentName} agent...`);

    // Read all trade history
    const allTrades = await readTradeHistory();

    // Filter trades for this agent
    const agentTrades = allTrades.filter(trade => trade.aiModel === agentName);

    // Sort by timestamp descending (most recent first)
    const sortedTrades = agentTrades.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Limit to N trades
    const limitedTrades = sortedTrades.slice(0, limit);

    // Transform trades to API response format
    const trades: AgentTrade[] = limitedTrades.map(trade => {
      // Calculate P&L for this trade
      const pnl = trade.portfolioValueAfter - trade.portfolioValueBefore;

      // Get price from executed order or market data
      const price = trade.executedOrder?.price || trade.marketData?.ticker?.lastPrice || 0;

      return {
        id: trade.id,
        timestamp: trade.timestamp,
        action: trade.decision.action,
        asset: trade.decision.asset,
        quantity: trade.decision.quantity,
        price,
        portfolioValueBefore: trade.portfolioValueBefore,
        portfolioValueAfter: trade.portfolioValueAfter,
        pnl,
        success: trade.success,
        error: trade.error,
      };
    });

    console.log(`✓ Retrieved ${trades.length} trades for ${agentName}`);

    return NextResponse.json(trades);
  } catch (error: any) {
    console.error('❌ Agent trades error:', error);

    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch agent trades',
      },
      { status: 500 }
    );
  }
}
