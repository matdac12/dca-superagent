import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { TradingDecisionSchema, TradingDecision } from '@/types/trading';
import { buildTradingPromptWithPlan, PromptConfig, MarketIntelligence } from '@/lib/prompts/tradingPromptBuilder';
import { checkDailyOrderCap, incrementDailyOrderCap } from '@/lib/utils/dailyOrderCap';
import { savePlan, loadPlan } from '@/lib/storage/agentPlans';
import { executeActions, ActionResult } from '@/lib/execution/multiActionExecutor';
import { validateRiskLimits } from '@/lib/execution/orderValidator';
import { Balance, OpenOrder, Action } from '@/types/trading';
import { getAgentConfig } from '@/config/agents';
import { getOpenOrders } from '@/lib/binance/openOrders';

const AGENT_NAME = 'openai';

export interface TradingAgentResult {
  decision: TradingDecision;
  executionResults: ActionResult[];
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Analyzes market data and returns a trading decision using OpenAI gpt-5-nano
 * with Structured Outputs for guaranteed schema compliance.
 *
 * Returns both the decision and execution results for trade history logging.
 */
export async function analyzeTradingOpportunity(
  marketData: MarketIntelligence,
  agentName: string = AGENT_NAME
): Promise<TradingAgentResult> {
  // No daily cap for long-term accumulation strategy
  const dailyCapResult = { count: 0, allowed: true, remaining: 999 };

  const previousPlan = await loadPlan(agentName).catch(error => {
    console.warn(`Failed to load plan for ${agentName}:`, error);
    return null;
  });

  const agentConfig = getAgentConfig(agentName);
  if (!agentConfig) {
    throw new Error(`Agent configuration not found for ${agentName}`);
  }

  // Fetch open orders for both BTC and ADA
  const [btcOrders, adaOrders] = await Promise.all([
    getOpenOrders('BTCUSDT', agentConfig.binanceApiKey, agentConfig.binanceSecretKey).catch(() => []),
    getOpenOrders('ADAUSDT', agentConfig.binanceApiKey, agentConfig.binanceSecretKey).catch(() => [])
  ]);
  const openOrders = [...btcOrders, ...adaOrders];

  // Define prompt configuration for accumulation strategy
  const promptConfig: PromptConfig = {
    tone: 'balanced',
    maxPositionPct: 0.20, // Not strictly enforced for accumulation, agent decides deployment
    minOrderUSD: 10,
    decisionInterval: '8 hours',
    dailyOrderCap: 999 // No daily cap for accumulation
  };

  // Build prompts using unified builder with plan + open orders context
  const { systemPrompt, userPrompt } = await buildTradingPromptWithPlan(
    agentName,
    marketData,
    promptConfig,
    dailyCapResult.count,
    {
      binanceApiKey: agentConfig.binanceApiKey,
      binanceSecretKey: agentConfig.binanceSecretKey,
      openOrdersOverride: openOrders,
      planOverride: previousPlan
        ? {
            text: previousPlan.plan,
            lastUpdated: previousPlan.lastUpdated
          }
        : marketData.plan ?? null
    }
  );

  // Call OpenAI with retry logic
  const maxRetries = 1;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Note: OpenAI Responses API doesn't support temperature parameter
      // gpt-5-nano is already deterministic by default
      const response = await openai.responses.parse({
        model: "gpt-5-nano",
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        text: {
          format: zodTextFormat(TradingDecisionSchema, "trading_decision")
        }
      });

      const decision = response.output_parsed as TradingDecision;

      if (!decision || !Array.isArray(decision.actions) || decision.actions.length === 0) {
        throw new Error('Invalid response: missing actions array');
      }

      if (!decision.plan?.trim()) {
        throw new Error('Invalid response: missing plan');
      }

      // Create price map for both assets
      const priceMap = {
        'BTCUSDT': marketData.btc?.ticker?.lastPrice || 0,
        'ADAUSDT': marketData.ada?.ticker?.lastPrice || 0,
        'BTC': marketData.btc?.ticker?.lastPrice || 0,
        'ADA': marketData.ada?.ticker?.lastPrice || 0
      };

      // Use BTC price for legacy validation (will be updated in validation logic)
      const btcPrice = marketData.btc?.ticker?.lastPrice || 0;

      const riskValidation = validateRiskLimits(
        decision.actions,
        openOrders,
        marketData.balances as Balance[],
        btcPrice // Pass BTC price as default, validation will use action.asset to get correct price
      );

      if (!riskValidation.allowed) {
        throw new Error(`Risk validation failed: ${riskValidation.errors.join('; ')}`);
      }

      const actionResults = await executeActions(
        decision.actions,
        btcPrice, // Legacy parameter, executeActions uses action.asset to determine symbol
        marketData.balances as Balance[],
        openOrders,
        agentConfig.binanceApiKey,
        agentConfig.binanceSecretKey
      );

      await savePlan(agentName, decision.plan);

      return {
        decision: {
          ...decision,
          actions: decision.actions,
          plan: decision.plan,
          reasoning: decision.reasoning
        },
        executionResults: actionResults
      };
    } catch (error: any) {
      lastError = error;
      console.error(`OpenAI API error (attempt ${attempt + 1}/${maxRetries + 1}):`, error.message);

      // Don't retry if it's the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // If all retries failed, throw the last error
  throw new Error(`Failed to get trading decision from OpenAI after ${maxRetries + 1} attempts: ${lastError?.message}`);
}
