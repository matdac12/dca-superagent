import OpenAI from 'openai';
import { TradingDecisionSchema, TradingDecision } from '@/types/trading';
import { buildTradingPromptWithPlan, PromptConfig, MarketIntelligence } from '@/lib/prompts/tradingPromptBuilder';
import { checkDailyOrderCap, incrementDailyOrderCap } from '@/lib/utils/dailyOrderCap';
import { loadPlan, savePlan } from '@/lib/storage/agentPlans';
import { getAgentConfig } from '@/config/agents';
import { getOpenOrders } from '@/lib/binance/openOrders';
import { validateRiskLimits } from '@/lib/execution/orderValidator';
import { executeActions, ActionResult } from '@/lib/execution/multiActionExecutor';
import { Balance } from '@/types/trading';

export interface TradingAgentResult {
  decision: TradingDecision;
  executionResults: ActionResult[];
}

// Initialize xAI client for Grok (lazy initialization)
let xai: OpenAI | null = null;

function getXAIClient(): OpenAI {
  if (!xai) {
    if (!process.env.GROK_API_KEY) {
      throw new Error('GROK_API_KEY environment variable is not set');
    }
    xai = new OpenAI({
      baseURL: "https://api.x.ai/v1",
      apiKey: process.env.GROK_API_KEY,
    });
  }
  return xai;
}

/**
 * Analyzes market data and returns a trading decision using Grok 4 Fast
 * via xAI direct API with structured outputs for guaranteed schema compliance.
 *
 * Returns both the decision and execution results for trade history logging.
 */
const AGENT_NAME = 'grok';

export async function analyzeTradingOpportunityGrok(
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
    maxPositionPct: 0.20,
    minOrderUSD: 10,
    decisionInterval: '8 hours',
    dailyOrderCap: 999
  };

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

  // Call xAI API with retry logic
  const maxRetries = 1;
  let lastError: Error | null = null;
  const client = getXAIClient();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Temperature 0.0 ensures deterministic, repeatable decisions (Task 6.3.7)
      const completion = await client.chat.completions.create({
        model: "grok-4-fast",
        temperature: 0.0, // Task 6.3.6
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "trading_decision",
            strict: true,
            schema: {
              type: "object",
              properties: {
                actions: {
                  type: "array",
                  minItems: 1,
                  items: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        enum: [
                          "PLACE_LIMIT_BUY",
                          "PLACE_LIMIT_SELL",
                          "PLACE_MARKET_BUY",
                          "PLACE_MARKET_SELL",
                          "CANCEL_ORDER",
                          "HOLD"
                        ]
                      },
                      orderId: {
                        type: "string"
                      },
                      price: {
                        type: "number"
                      },
                      quantity: {
                        type: "number"
                      },
                      asset: {
                        type: "string"
                      },
                      reasoning: {
                        type: "string"
                      }
                    },
                    required: ["type"],
                    additionalProperties: false
                  }
                },
                plan: {
                  type: "string",
                  maxLength: 500
                },
                reasoning: {
                  type: "string"
                }
              },
              required: ["actions", "plan", "reasoning"],
              additionalProperties: false
            }
          }
        }
      });

      // Extract and parse the response
      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from Grok model');
      }

      const decision = TradingDecisionSchema.parse(JSON.parse(content));

      if (!decision || !Array.isArray(decision.actions) || decision.actions.length === 0) {
        throw new Error('Invalid response: missing actions array');
      }

      if (!decision.plan?.trim()) {
        throw new Error('Invalid response: missing plan');
      }

      // Use BTC price for legacy validation
      const btcPrice = marketData.btc?.ticker?.lastPrice || 0;

      const riskValidation = validateRiskLimits(
        decision.actions,
        openOrders,
        marketData.balances as Balance[],
        btcPrice
      );

      if (!riskValidation.allowed) {
        throw new Error(`Risk validation failed: ${riskValidation.errors.join('; ')}`);
      }

      const actionResults = await executeActions(
        decision.actions,
        btcPrice,
        marketData.balances as Balance[],
        openOrders,
        agentConfig.binanceApiKey,
        agentConfig.binanceSecretKey
      );

      await savePlan(agentName, decision.plan);

      return {
        decision,
        executionResults: actionResults
      };
    } catch (error: any) {
      lastError = error;

      // Better error logging for Zod validation errors
      if (error.name === 'ZodError') {
        console.error(`Grok Zod validation error (attempt ${attempt + 1}/${maxRetries + 1}):`, JSON.stringify(error.errors, null, 2));
      } else {
        console.error(`Grok API error (attempt ${attempt + 1}/${maxRetries + 1}):`, error.message);
      }

      // Don't retry if it's the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // If all retries failed, throw the last error
  throw new Error(`Failed to get trading decision from Grok after ${maxRetries + 1} attempts: ${lastError?.message}`);
}
