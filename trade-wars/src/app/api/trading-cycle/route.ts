/**
 * Trading Cycle API Endpoint
 * Triggers the 5-model council for collaborative trading decisions
 *
 * SCHEDULE: Every 8 hours (3x daily: 8 AM, 4 PM, Midnight UTC)
 * STRATEGY: Long-term accumulation of BTC and ADA via 5-model consensus
 * MODELS: OpenAI GPT-5-Nano, Grok 4 Fast, Gemini 2.5 Flash, Kimi K2, DeepSeek Chat v3
 */

import { NextResponse } from 'next/server';

interface CouncilResult {
  success: boolean;
  timestamp: string;
  decision?: {
    actions: Array<{
      type: string;
      asset?: string;
      quantity?: number;
      price?: number;
      reasoning: string;
    }>;
    plan: string;
    reasoning: string;
  };
  executedOrder?: {
    orderId: string;
    price: number;
    quantity: number;
    status: string;
  };
  meta?: {
    selectedModel: string;
    consensusType: string;
    totalTimeMs: number;
    voteScores: Record<string, number>;
    votingMatrix: Record<string, Record<string, number>>;
    individualProposals: Record<string, any>;
  };
  error?: string;
}

interface TradingCycleResponse {
  success: boolean;
  timestamp: string;
  councilResult: CouncilResult;
  marketSnapshot: {
    price: number;
    priceChange24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
  };
}

export async function POST() {
  try {
    console.log('🔄 Trading cycle started - executing 5-model council...');

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Step 1: Fetch market intelligence for both BTC and ADA
    console.log('📊 Fetching market intelligence...');
    const marketIntelligenceResponse = await fetch(`${baseUrl}/api/market-intelligence`);

    if (!marketIntelligenceResponse.ok) {
      throw new Error('Failed to fetch market intelligence');
    }

    const marketData = await marketIntelligenceResponse.json();
    console.log(`✓ Market data fetched: BTC price $${marketData.ticker.lastPrice}`);

    // Step 2: Execute council debate (5 models: OpenAI, Grok, Gemini, Kimi, DeepSeek)
    console.log('🏛️ Executing 5-model council debate...');
    const councilResponse = await fetch(`${baseUrl}/api/trading-agent-council`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ marketData }),
    });

    if (!councilResponse.ok) {
      const errorData = await councilResponse.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Council execution failed: ${errorData.error || `HTTP ${councilResponse.status}`}`);
    }

    const councilResult: CouncilResult = await councilResponse.json();

    // Log council decision summary
    const actionType = councilResult.decision?.actions?.[0]?.type || 'UNKNOWN';
    const actionAsset = councilResult.decision?.actions?.[0]?.asset || 'N/A';
    const selectedModel = councilResult.meta?.selectedModel || 'Unknown';
    const consensusType = councilResult.meta?.consensusType || 'none';

    console.log(`✅ Council decision: ${actionType} on ${actionAsset}`);
    console.log(`   Selected model: ${selectedModel} (${consensusType} consensus)`);

    if (councilResult.meta?.voteScores) {
      const scores = Object.entries(councilResult.meta.voteScores)
        .map(([model, score]) => `${model}:${score}`)
        .join(', ');
      console.log(`   Vote scores: ${scores}`);
    }

    // Step 3: Build market snapshot
    const marketSnapshot = {
      price: marketData.ticker.lastPrice,
      priceChange24h: marketData.ticker.priceChangePercent,
      high24h: marketData.ticker.highPrice,
      low24h: marketData.ticker.lowPrice,
      volume24h: marketData.ticker.volume,
    };

    // Step 4: Return comprehensive response
    const response: TradingCycleResponse = {
      success: councilResult.success,
      timestamp: new Date().toISOString(),
      councilResult,
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
        councilResult: {
          success: false,
          timestamp: new Date().toISOString(),
          error: error.message || 'Council execution failed',
        },
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
