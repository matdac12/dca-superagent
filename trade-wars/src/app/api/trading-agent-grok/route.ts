import { NextResponse } from 'next/server';
import { analyzeTradingOpportunityGrok } from '@/lib/xai/tradingAgentGrok';
import { logTrade } from '@/lib/storage/tradeHistory';
import { getAgentConfig } from '@/config/agents';
import { ActionResult } from '@/lib/execution/multiActionExecutor';
import { calculateTotalPortfolioValue } from '@/lib/utils/portfolioCalculator';
import { Spot } from '@binance/connector';

/**
 * Extracts the first successful PLACE action's order result for trade history logging
 */
function extractExecutedOrder(executionResults: ActionResult[]) {
  for (const result of executionResults) {
    if (result.success && result.order && result.action.type.startsWith('PLACE_')) {
      const isLimitAction = result.action.type.includes('LIMIT');
      const orderType: 'MARKET' | 'LIMIT' = isLimitAction ? 'LIMIT' : 'MARKET';

      return {
        orderId: result.order.orderId,
        price: result.order.price,
        quantity: result.order.quantity,
        status: result.order.status,
        orderType,
        limitPrice: result.action.price,
        executedPrice: result.order.price,
        priceImprovement: isLimitAction && result.action.price
          ? Math.abs(result.order.price - result.action.price) * result.order.quantity
          : undefined
      };
    }
  }
  return undefined;
}

export async function POST(request: Request) {
  try {
    console.log('🤖 Trading agent analysis started (Grok 4 Fast via xAI)...');

    // Get Grok agent configuration
    const agentConfig = getAgentConfig('grok');
    if (!agentConfig) {
      throw new Error('Grok agent configuration not found');
    }

    // Step 1: Get market intelligence (from request body or fetch fresh)
    const body = await request.json().catch(() => ({}));
    let marketData;

    if (body.marketData) {
      // Use provided market data (from trading-cycle)
      console.log('📦 Using provided market data');
      marketData = body.marketData;
    } else {
      // Fetch market intelligence (individual agent trigger)
      console.log('📊 Fetching market intelligence...');
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const marketIntelligenceResponse = await fetch(`${baseUrl}/api/market-intelligence`);

      if (!marketIntelligenceResponse.ok) {
        throw new Error('Failed to fetch market intelligence');
      }

      marketData = await marketIntelligenceResponse.json();
    }

    console.log(`✓ Market data ready: BTC price $${marketData.ticker.lastPrice}`);

    // Calculate portfolio value before trade
    const currentPrices = { BTCUSDT: marketData.ticker.lastPrice };
    const portfolioValueBefore = calculateTotalPortfolioValue(marketData.balances, currentPrices);

    // Step 2: Get LLM trading decision with execution results
    console.log('🧠 Analyzing market with Grok AI (xAI direct)...');
    const result = await analyzeTradingOpportunityGrok(marketData);
    console.log(`✓ Grok Decision received with ${result.decision.actions.length} actions.`);

    // Step 3: Extract executed order details from results
    const executedOrder = extractExecutedOrder(result.executionResults);

    // Step 4: Fetch updated balances and calculate portfolio value after trade
    const client = new Spot(
      agentConfig.binanceApiKey,
      agentConfig.binanceSecretKey,
      { baseURL: process.env.BINANCE_BASE_URL }
    );

    const accountInfo = await client.account();
    const updatedBalances = accountInfo.data.balances
      .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map((b: any) => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
        total: parseFloat(b.free) + parseFloat(b.locked)
      }));

    const portfolioValueAfter = calculateTotalPortfolioValue(updatedBalances, currentPrices);

    // Step 5: Determine trade success
    // - HOLD actions are always successful
    // - PLACE actions require an executed order
    const isHoldAction = result.decision.actions[0]?.type === 'HOLD';
    const tradeSuccess = isHoldAction || executedOrder !== undefined;

    // Step 6: Log trade entry with actual portfolio values
    await logTrade({
      decision: result.decision,
      marketData: {
        symbol: marketData.symbol,
        ticker: marketData.ticker,
        balances: marketData.balances
      },
      executedOrder,
      planSnapshot: result.decision.plan,
      portfolioValueBefore,
      portfolioValueAfter,
      success: tradeSuccess,
      aiModel: 'grok'
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      aiModel: 'grok',
      decision: result.decision,
      executionResults: result.executionResults,
      order: executedOrder,
      executionError: null,
      marketSnapshot: {
        price: marketData.ticker.lastPrice,
        priceChange24h: marketData.ticker.priceChangePercent,
        high24h: marketData.ticker.highPrice,
        low24h: marketData.ticker.lowPrice,
        volume24h: marketData.ticker.volume
      }
    });
  } catch (error: any) {
    console.error('❌ Trading agent error (Grok):', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Trading agent failed',
        timestamp: new Date().toISOString(),
        aiModel: 'grok'
      },
      { status: 500 }
    );
  }
}
