/**
 * Council Statistics API Endpoint
 *
 * Provides comprehensive statistics for the collaborative trading council system.
 * Returns performance metrics, model contributions, consensus patterns,
 * risk metrics, and execution statistics.
 */

import { NextResponse } from 'next/server';
import { readTradeHistory } from '@/lib/storage/tradeHistory';
import {
  calculateDecisionQualityMetrics,
  calculateModelContribution,
  calculateConsensusPatterns,
  calculateRiskMetrics,
  calculateExecutionMetrics,
} from '@/lib/council/statistics';

export async function GET(request: Request) {
  try {
    console.log('📊 Fetching council statistics...');

    // Read all trade history
    const allTrades = await readTradeHistory();

    // Filter to council trades only
    const councilTrades = allTrades.filter(trade => trade.aiModel === 'council');

    console.log(`✓ Found ${councilTrades.length} council trades`);

    // Handle case with no trades
    if (councilTrades.length === 0) {
      console.log('⚠️  No council trades found, returning default values');
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        tradeCount: 0,
        decisionQuality: {
          totalTrades: 0,
          successfulTrades: 0,
          failedTrades: 0,
          winRate: 0,
          avgPnL: 0,
          totalPnL: 0,
          roi: 0,
        },
        modelContribution: {
          openai: { timesSelected: 0, winRate: 0, avgPnL: 0 },
          grok: { timesSelected: 0, winRate: 0, avgPnL: 0 },
          gemini: { timesSelected: 0, winRate: 0, avgPnL: 0 },
        },
        consensusPatterns: {
          unanimous: 0,
          majority: 0,
          none: 0,
          unanimousPercentage: 0,
          majorityPercentage: 0,
          avgDebateDuration: 0,
        },
        riskMetrics: {
          maxDrawdown: 0,
          maxDrawdownValue: 0,
          sharpeRatio: 0,
          volatility: 0,
        },
        executionMetrics: {
          marketOrders: 0,
          limitOrders: 0,
          holdDecisions: 0,
          avgExecutionTime: 0,
          orderTypeDistribution: { market: 0, limit: 0, hold: 0 },
        },
      });
    }

    // Calculate all statistics using the statistics functions
    console.log('📈 Calculating decision quality metrics...');
    const decisionQuality = calculateDecisionQualityMetrics(councilTrades);

    console.log('🤖 Calculating model contribution...');
    const modelContribution = calculateModelContribution(councilTrades);

    console.log('🗳️  Calculating consensus patterns...');
    const consensusPatterns = calculateConsensusPatterns(councilTrades);

    console.log('⚠️  Calculating risk metrics...');
    const riskMetrics = calculateRiskMetrics(councilTrades);

    console.log('⚡ Calculating execution metrics...');
    const executionMetrics = calculateExecutionMetrics(councilTrades);

    console.log('✅ All statistics calculated successfully');

    // Return comprehensive statistics
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tradeCount: councilTrades.length,
      decisionQuality,
      modelContribution,
      consensusPatterns,
      riskMetrics,
      executionMetrics,
    });
  } catch (error: any) {
    console.error('❌ Council statistics error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to calculate council statistics',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
