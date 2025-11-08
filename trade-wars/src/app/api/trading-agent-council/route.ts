/**
 * Council Trading Agent API Endpoint
 * Runs council debate and executes trades, returns JSON (not SSE)
 * Used by trading-cycle to trigger council agent
 */

import { NextResponse } from 'next/server';
import { Spot } from '@binance/connector';
import { runCouncilDebate } from '@/lib/council/councilDebate';
import { calculateTotalPortfolioValue } from '@/lib/utils/portfolioCalculator';
import { savePlan } from '@/lib/storage/agentPlans';
import { logTrade } from '@/lib/storage/tradeHistory';
import { getAgentConfig } from '@/config/agents';
import { ActionResult } from '@/lib/execution/multiActionExecutor';

/**
 * Extracts the first successful PLACE action's order result for trade history logging
 */
function extractExecutedOrder(executionResults: ActionResult[]) {
  for (const result of executionResults) {
    if (result.success && result.order && result.action.type.startsWith('PLACE_')) {
      const isPriceAction = result.action.type.includes('LIMIT');
      const orderType: 'MARKET' | 'LIMIT' = isPriceAction ? 'LIMIT' : 'MARKET';

      return {
        orderId: result.order.orderId,
        price: result.order.price,
        quantity: result.order.quantity,
        status: result.order.status,
        orderType,
        limitPrice: result.action.price,
        executedPrice: result.order.price,
        priceImprovement: isPriceAction && result.action.price
          ? Math.abs(result.order.price - result.action.price) * result.order.quantity
          : undefined
      };
    }
  }
  return undefined;
}

export async function POST(request: Request) {
  try {
    console.log('🏛️ Council trading agent started...');

    // Get Council agent configuration
    const agentConfig = getAgentConfig('council');
    if (!agentConfig) {
      throw new Error('Council agent configuration not found');
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
    const currentPrices = {
      BTCUSDT: marketData.ticker.lastPrice,
    };
    const portfolioValueBefore = calculateTotalPortfolioValue(marketData.balances, currentPrices);

    // Step 2: Run council debate (execution happens inside this function)
    console.log('🧠 Running council debate...');
    const finalDecision = await runCouncilDebate(marketData, () => {
      // No-op callback for non-streaming mode
    });
    const actionType = finalDecision.actions?.[0]?.type || 'UNKNOWN';
    const actionAsset = finalDecision.actions?.[0]?.asset || 'N/A';
    console.log(`✓ Council decision: ${actionType} on ${actionAsset}`);
    console.log(`  Selected model: ${finalDecision._meta.selectedModel}`);
    console.log(`  Consensus: ${finalDecision._meta.consensusType}`);

    // Step 3: Build concise council plan (max 500 chars)
    const selectedModelName = finalDecision._meta.selectedModel
      ? finalDecision._meta.selectedModel
          .replace('OpenAI', 'GPT')
          .replace('Grok', 'Grok')
          .replace('Gemini', 'Gemini')
          .replace('Kimi', 'Kimi')
          .replace('DeepSeek', 'DS')
      : 'None';

    const voteInfo = finalDecision._meta.voteScores
      ? `Votes: ${Object.entries(finalDecision._meta.voteScores)
          .map(([m, s]) => `${m.split(/[-\/]/)[0].substring(0,3)}:${s}`)
          .join(' ')}`
      : '';

    // Truncate reasoning to fit within 500 char limit
    const maxReasoningLength = 500 - 80; // Reserve space for prefix and vote info
    const truncatedReasoning = finalDecision.reasoning.length > maxReasoningLength
      ? finalDecision.reasoning.substring(0, maxReasoningLength - 3) + '...'
      : finalDecision.reasoning;

    const councilPlan = `[${finalDecision._meta.consensusType.toUpperCase()}${finalDecision._meta.selectedModel ? `-${selectedModelName}` : ''}] ${truncatedReasoning}${voteInfo ? ` ${voteInfo}` : ''}`.substring(0, 500);

    // Save the council plan
    await savePlan('council', councilPlan);

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

    // Step 5: Convert council output to TradingDecision format for consistency
    // CouncilOutput has actions array from TradingDecision, but also has legacy action/asset/quantity fields
    const councilDecision = {
      actions: finalDecision.actions || [],  // Use the actions array from TradingDecision
      plan: councilPlan,
      reasoning: `[Council ${finalDecision._meta.consensusType}] ${finalDecision.reasoning}`
    };

    // Step 6: Convert proposals array to object with model keys (all 5 models)
    const proposals = finalDecision._meta.individualProposals || [];
    const proposalsObject: any = {};

    proposals.forEach((proposal: any) => {
      // Normalize model names to lowercase keys
      const modelName = proposal.model || proposal.modelName || '';
      let modelKey: string | null = null;

      if (modelName === 'OpenAI' || modelName.includes('gpt')) {
        modelKey = 'openai';
      } else if (modelName === 'Grok' || modelName.includes('grok')) {
        modelKey = 'grok';
      } else if (modelName === 'Gemini' || modelName.includes('gemini')) {
        modelKey = 'gemini';
      } else if (modelName === 'Kimi' || modelName.includes('kimi') || modelName.includes('moonshot')) {
        modelKey = 'kimi';
      } else if (modelName === 'DeepSeek' || modelName.includes('deepseek')) {
        modelKey = 'deepseek';
      }

      if (modelKey) {
        proposalsObject[modelKey] = {
          action: proposal.actions?.[0]?.type || 'UNKNOWN',
          reasoning: proposal.reasoning || '',
          plan: proposal.plan || '',
          quantity: proposal.actions?.[0]?.quantity,
          price: proposal.actions?.[0]?.price,
          asset: proposal.actions?.[0]?.asset || proposal.asset,
        };
      }
    });

    // Extract execution results and determine success
    const executionResults = finalDecision._meta.executionResults || [];
    const executedOrder = extractExecutedOrder(executionResults);

    // Determine trade success:
    // - HOLD actions are always successful
    // - PLACE actions require an executed order
    const isHoldAction = finalDecision.actions?.[0]?.type === 'HOLD';
    const tradeSuccess = isHoldAction || executedOrder !== undefined;

    // Log trade to history with council metadata
    await logTrade({
      decision: councilDecision,
      marketData: {
        symbol: marketData.symbol,
        ticker: marketData.ticker,
        balances: updatedBalances
      },
      executedOrder,
      planSnapshot: councilPlan,
      portfolioValueBefore,
      portfolioValueAfter,
      success: tradeSuccess,
      aiModel: 'council',
      councilMetadata: {
        individualProposals: proposalsObject,
        votingMatrix: finalDecision._meta.votingMatrix || {},
        selectedModel: finalDecision._meta.selectedModel || '',
        consensusType: finalDecision._meta.consensusType || 'none',
        voteScores: finalDecision._meta.voteScores || {},
        debateDurationMs: finalDecision._meta.totalTimeMs || 0
      }
    });

    console.log(`✓ Trade logged with council metadata (success: ${tradeSuccess})`);

    // Step 7: Return comprehensive response matching other agents' format
    return NextResponse.json({
      success: tradeSuccess,
      timestamp: new Date().toISOString(),
      decision: councilDecision,
      executionResults,
      executedOrder,
      meta: {
        selectedModel: finalDecision._meta.selectedModel,
        consensusType: finalDecision._meta.consensusType,
        totalTimeMs: finalDecision._meta.totalTimeMs,
        voteScores: finalDecision._meta.voteScores,
        votingMatrix: finalDecision._meta.votingMatrix || {},
        individualProposals: proposalsObject
      },
      marketSnapshot: {
        price: marketData.ticker.lastPrice,
        priceChange24h: marketData.ticker.priceChangePercent,
        high24h: marketData.ticker.highPrice,
        low24h: marketData.ticker.lowPrice,
        volume24h: marketData.ticker.volume
      },
      portfolio: {
        valueBefore: portfolioValueBefore,
        valueAfter: portfolioValueAfter,
        pnl: portfolioValueAfter - portfolioValueBefore
      }
    });
  } catch (error: any) {
    console.error('❌ Council trading agent error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Council trading agent failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
