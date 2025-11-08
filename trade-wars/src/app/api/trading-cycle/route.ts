/**
 * Trading Cycle API Endpoint
 * Triggers all 4 trading agents simultaneously with shared market data
 *
 * SCHEDULE: Every 8 hours (3x daily: 8 AM, 4 PM, Midnight UTC)
 * STRATEGY: Long-term accumulation of BTC and ADA
 */

import { NextResponse } from 'next/server';
import { getAllAgents } from '@/config/agents';

interface AgentResult {
  agent: string;
  success: boolean;
  decision?: {
    action: 'BUY' | 'SELL' | 'HOLD';
    asset: string;
    quantity: number;
    reasoning: string;
  };
  order?: {
    orderId: string;
    symbol: string;
    side: string;
    price: number;
    quantity: number;
    status: string;
  };
  error?: string;
}

interface TradingCycleResponse {
  success: boolean;
  timestamp: string;
  results: AgentResult[];
  marketSnapshot: {
    price: number;
    priceChange24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
  };
}

/**
 * Maps agent names to their API endpoints
 */
const AGENT_ENDPOINTS: Record<string, string> = {
  openai: '/api/trading-agent',
  grok: '/api/trading-agent-grok',
  gemini: '/api/trading-agent-gemini',
  council: '/api/trading-agent-council',
};

/**
 * Executes a single agent's trading logic
 * @param agentName - Name of the agent to execute
 * @param baseUrl - Base URL for API calls
 * @param marketData - Shared market intelligence data
 * @returns Agent result with decision and order info
 */
async function executeAgent(agentName: string, baseUrl: string, marketData: any): Promise<AgentResult> {
  const endpoint = AGENT_ENDPOINTS[agentName];

  if (!endpoint) {
    return {
      agent: agentName,
      success: false,
      error: `Unknown agent: ${agentName}`,
    };
  }

  try {
    console.log(`[Trading Cycle] Executing ${agentName} agent...`);

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ marketData }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        agent: agentName,
        success: false,
        error: errorData.error || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    // Extract relevant fields from agent response
    return {
      agent: agentName,
      success: data.success || false,
      decision: data.decision ? {
        action: data.decision.action,
        asset: data.decision.asset,
        quantity: data.decision.quantity,
        reasoning: data.decision.reasoning,
      } : undefined,
      order: data.order ? {
        orderId: data.order.orderId,
        symbol: data.order.symbol,
        side: data.order.side,
        price: data.order.price,
        quantity: data.order.quantity,
        status: data.order.status,
      } : undefined,
      error: data.executionError || data.error,
    };
  } catch (error: any) {
    console.error(`[Trading Cycle] Error executing ${agentName}:`, error.message);
    return {
      agent: agentName,
      success: false,
      error: error.message || 'Agent execution failed',
    };
  }
}

export async function POST() {
  try {
    console.log('🔄 Trading cycle started - executing all 4 agents...');

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Step 1: Fetch market intelligence once (to be shared by all agents)
    console.log('📊 Fetching market intelligence...');
    const marketIntelligenceResponse = await fetch(`${baseUrl}/api/market-intelligence`);

    if (!marketIntelligenceResponse.ok) {
      throw new Error('Failed to fetch market intelligence');
    }

    const marketData = await marketIntelligenceResponse.json();
    console.log(`✓ Market data fetched: BTC price $${marketData.ticker.lastPrice}`);

    // Step 2: Get all agent configurations
    const agents = getAllAgents();
    const agentNames = agents.map(a => a.name);

    console.log(`🤖 Executing ${agentNames.length} agents in parallel: ${agentNames.join(', ')}`);

    // Step 3: Execute all agents in parallel using Promise.allSettled
    // This ensures that if one agent fails, others continue executing
    // Pass shared marketData to all agents (avoid duplicate API calls)
    const agentPromises = agentNames.map(agentName =>
      executeAgent(agentName, baseUrl, marketData)
    );

    const results = await Promise.allSettled(agentPromises);

    // Step 4: Process results
    const agentResults: AgentResult[] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // Promise was rejected
        return {
          agent: agentNames[index],
          success: false,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });

    // Step 5: Determine overall success
    const successfulAgents = agentResults.filter(r => r.success).length;
    const totalAgents = agentResults.length;
    const overallSuccess = successfulAgents > 0; // At least one agent succeeded

    console.log(`✅ Trading cycle completed: ${successfulAgents}/${totalAgents} agents succeeded`);

    // Step 6: Build market snapshot
    const marketSnapshot = {
      price: marketData.ticker.lastPrice,
      priceChange24h: marketData.ticker.priceChangePercent,
      high24h: marketData.ticker.highPrice,
      low24h: marketData.ticker.lowPrice,
      volume24h: marketData.ticker.volume,
    };

    // Step 7: Return comprehensive response
    const response: TradingCycleResponse = {
      success: overallSuccess,
      timestamp: new Date().toISOString(),
      results: agentResults,
      marketSnapshot,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ Trading cycle error:', error);

    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: error.message || 'Trading cycle failed',
        results: [],
        marketSnapshot: {
          price: 0,
          priceChange24h: 0,
          high24h: 0,
          low24h: 0,
          volume24h: 0,
        },
      },
      { status: 500 }
    );
  }
}
