/**
 * Portfolio History API Endpoint
 * Returns time-series portfolio data for all 4 agents for charting
 *
 * Query Parameters:
 * - agent (optional): Filter to specific agent ('openai', 'grok', 'gemini', 'council')
 */

import { NextResponse } from 'next/server';
import { buildPortfolioTimeSeries } from '@/lib/agents/portfolioHistory';

export async function GET(request: Request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const agentFilter = searchParams.get('agent') || undefined;

    console.log(`📈 Building portfolio time-series data${agentFilter ? ` (agent: ${agentFilter})` : ''}...`);

    // Build time-series data (optionally filtered by agent)
    const timeSeries = await buildPortfolioTimeSeries(agentFilter);

    console.log(`✓ Portfolio history generated: ${timeSeries.length} data points`);

    return NextResponse.json(timeSeries);
  } catch (error: any) {
    console.error('❌ Portfolio history error:', error);

    return NextResponse.json(
      {
        error: error.message || 'Failed to build portfolio history',
      },
      { status: 500 }
    );
  }
}
