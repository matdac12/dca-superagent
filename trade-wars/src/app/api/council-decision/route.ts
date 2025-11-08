/**
 * Council Decision API Endpoint
 *
 * Runs the LLM council debate and streams real-time events to the client
 * using Server-Sent Events (SSE).
 */

import { NextResponse } from 'next/server';
import { Spot } from '@binance/connector';
import { runCouncilDebate } from '@/lib/council/councilDebate';
import { CouncilEvent } from '@/lib/council/types';
import { adjustQuantityToLimit, calculateTotalPortfolioValue } from '@/lib/utils/portfolioCalculator';
// DEPRECATED: validateAndExecuteOrder removed
// import { validateAndExecuteOrder } from '@/lib/binance/orderExecution';
import { logTrade } from '@/lib/storage/tradeHistory';
import { getAgentConfig } from '@/config/agents';

export async function POST() {
  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  const streamTransform = new TransformStream();
  const writer = streamTransform.writable.getWriter();

  // Helper function to send SSE events
  const sendEvent = (event: CouncilEvent) => {
    const data = JSON.stringify(event);
    writer.write(encoder.encode(`data: ${data}\n\n`));
  };

  // Run the council debate in the background
  (async () => {
    try {
      console.log('🏛️ Council debate started...');

      // Get Council agent configuration
      const agentConfig = getAgentConfig('council');
      if (!agentConfig) {
        throw new Error('Council agent configuration not found');
      }

      // Step 1: Fetch market intelligence
      console.log('📊 Fetching market intelligence...');
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const marketIntelligenceResponse = await fetch(`${baseUrl}/api/market-intelligence`);

      if (!marketIntelligenceResponse.ok) {
        throw new Error('Failed to fetch market intelligence');
      }

      const marketData = await marketIntelligenceResponse.json();
      console.log(`✓ Market data fetched: BTC price $${marketData.ticker.lastPrice}`);

      // Step 2: Run council debate with real-time event streaming
      console.log('🧠 Starting council debate...');
      const finalDecision = await runCouncilDebate(
        marketData,
        (event: CouncilEvent) => {
          // Stream each event to the client
          sendEvent(event);
          console.log(`[Event] ${event.type}`);
        }
      );

      console.log(`✓ Council decision: ${finalDecision.action} ${finalDecision.quantity} ${finalDecision.asset}`);
      console.log(`  Selected model: ${finalDecision._meta.selectedModel}`);
      console.log(`  Consensus: ${finalDecision._meta.consensusType}`);

      // Step 3: Adjust quantity if needed
      const currentPrices = {
        BTCUSDT: marketData.ticker.lastPrice,
        ADAUSDT: 0,
      };

      const adjustment = adjustQuantityToLimit(
        finalDecision.asset,
        finalDecision.quantity,
        marketData.balances,
        currentPrices
      );

      if (adjustment.wasAdjusted) {
        console.log(`⚠️ Quantity adjusted: ${finalDecision.quantity} → ${adjustment.adjustedQuantity}`);
        console.log(`   Reason: ${adjustment.reason}`);
        finalDecision.quantity = adjustment.adjustedQuantity;
      }

      // Calculate portfolio value before trade
      const portfolioValueBefore = calculateTotalPortfolioValue(marketData.balances, currentPrices);

      // Step 4: Execute trade (if not HOLD)
      let orderResult = null;
      let executionError = null;

      if (finalDecision.action !== 'HOLD') {
        console.log(`📈 Executing ${finalDecision.action} order...`);
        const execution = await validateAndExecuteOrder(
          {
            action: finalDecision.action,
            asset: finalDecision.asset,
            quantity: finalDecision.quantity,
            reasoning: finalDecision.reasoning,
          },
          marketData.ticker.lastPrice,
          marketData.balances,
          agentConfig.binanceApiKey,
          agentConfig.binanceSecretKey
        );

        if (execution.success && execution.order) {
          orderResult = execution.order;
          console.log(`✓ Order executed: ${orderResult.orderId}`);

          // Send trade execution event
          sendEvent({
            type: 'trade_executed',
            order: {
              orderId: orderResult.orderId.toString(),
              symbol: orderResult.symbol,
              side: orderResult.side,
              price: orderResult.price || marketData.ticker.lastPrice,
              quantity: parseFloat(orderResult.executedQty),
              status: orderResult.status,
              totalValue: orderResult.cummulativeQuoteQty,
            },
            timestamp: Date.now(),
          } as any);
        } else {
          executionError = execution.error;
          console.log(`✗ Order failed: ${executionError}`);
        }
      } else {
        console.log('⏸️ HOLD decision - no order executed');
      }

      // Step 5: Fetch updated balances and calculate portfolio value after trade
      const client = new Spot(
        agentConfig.binanceApiKey,
        agentConfig.binanceSecretKey,
        { baseURL: process.env.BINANCE_BASE_URL }
      );

      let updatedBalances = marketData.balances;
      let portfolioValueAfter = portfolioValueBefore;

      if (orderResult) {
        const accountInfo = await client.account();
        updatedBalances = accountInfo.data.balances
          .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
          .map((b: any) => ({
            asset: b.asset,
            free: parseFloat(b.free),
            locked: parseFloat(b.locked),
            total: parseFloat(b.free) + parseFloat(b.locked)
          }));

        portfolioValueAfter = calculateTotalPortfolioValue(updatedBalances, currentPrices);
      }

      // Step 6: Log trade to history (with council metadata)
      await logTrade({
        decision: {
          action: finalDecision.action,
          asset: finalDecision.asset,
          quantity: finalDecision.quantity,
          reasoning: `[Council ${finalDecision._meta.consensusType}] ${finalDecision.reasoning}`,
        },
        marketData: {
          symbol: marketData.symbol,
          ticker: marketData.ticker,
          balances: marketData.balances,
        },
        executedOrder: orderResult ? {
          orderId: orderResult.orderId.toString(),
          price: orderResult.price || marketData.ticker.lastPrice,
          quantity: parseFloat(orderResult.executedQty),
          status: orderResult.status,
        } : undefined,
        portfolioValueBefore,
        portfolioValueAfter,
        success: orderResult ? true : (finalDecision.action === 'HOLD' ? true : false),
        error: executionError || undefined,
        aiModel: 'council',
      });

      // Step 7: Send final summary event
      sendEvent({
        type: 'final_decision',
        decision: {
          ...finalDecision,
          _meta: {
            ...finalDecision._meta,
            orderExecuted: orderResult ? true : false,
            executionError,
          },
        },
        timestamp: Date.now(),
      } as any);

      console.log('✅ Council debate completed successfully');

    } catch (error: any) {
      console.error('❌ Council debate error:', error);

      // Send error event
      const errorEvent = JSON.stringify({
        type: 'error',
        error: error.message || 'Council debate failed',
        timestamp: Date.now(),
      });
      writer.write(encoder.encode(`data: ${errorEvent}\n\n`));
    } finally {
      // Close the stream
      await writer.close();
    }
  })();

  // Return the stream as a Response with SSE headers
  return new Response(streamTransform.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
