/**
 * Real LLM adapters for 2-Phase Council Debate system
 *
 * Each adapter implements 2 debate phases:
 * 1. Proposal - initial trading decision
 * 2. Vote - rank ALL 5 proposals (1-5 points)
 *
 * Temperature: 0.0 (deterministic decisions)
 * Models: OpenAI, Grok, Gemini, Kimi, DeepSeek
 */

import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { TradingDecisionSchema } from '@/types/trading';
import { buildTradingPromptWithPlan, PromptConfig } from '@/lib/prompts/tradingPromptBuilder';
import { loadPlan, savePlan } from '@/lib/storage/agentPlans';
import { getOpenOrders } from '@/lib/binance/openOrders';
import { getAgentConfig } from '@/config/agents';
import {
  ModelName,
  NormalizedDecision,
  VoteOutput,
  MarketIntelligence,
} from './types';
import {
  getProposalSystemPrompt,
  getProposalUserPrompt,
  getVoteSystemPrompt,
  getVoteUserPrompt,
  PromptContext,
} from './prompts';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildPromptContext(marketData: MarketIntelligence): PromptContext {
  const usdtBalance = marketData.balances.find(b => b.asset === 'USDT')?.total || 0;
  const btcBalance = marketData.balances.find(b => b.asset === 'BTC')?.total || 0;
  const adaBalance = marketData.balances.find(b => b.asset === 'ADA')?.total || 0;

  // Handle dual-asset market intelligence format (btc.ticker) or legacy single-asset format (ticker)
  const currentPrice = marketData.btc?.ticker?.lastPrice || marketData.ticker?.lastPrice || 0;
  const portfolioValueUSD = usdtBalance + (btcBalance * currentPrice);

  const MIN_ORDER_VALUE_USD = 10;
  const maxBuyUSDT = Math.min(usdtBalance * 0.995, portfolioValueUSD * 0.50);
  const maxSellBTC = Math.min(btcBalance * 0.995, (portfolioValueUSD * 0.50) / currentPrice);
  const maxSellValueUSD = maxSellBTC * currentPrice;

  // Handle dual-asset format (btc.klines) or legacy single-asset format (klines)
  const recentKlines = marketData.btc?.klines || marketData.klines || [];
  const priceRangeHigh = recentKlines.length > 0 ? Math.max(...recentKlines.map(k => k.high)) : currentPrice;
  const priceRangeLow = recentKlines.length > 0 ? Math.min(...recentKlines.map(k => k.low)) : currentPrice;
  const priceRangeAvg = recentKlines.length > 0 ? recentKlines.reduce((sum, k) => sum + k.close, 0) / recentKlines.length : currentPrice;

  const tradeHistoryEntries = marketData.tradeHistory?.entries || [];
  const tradeHistorySummary = marketData.tradeHistory?.summary || 'No trade history';
  const indicatorsFormatted = marketData.btc?.indicators?.formatted || marketData.indicators?.formatted || 'No indicators available';
  const orderBookData = marketData.btc?.orderBook || marketData.orderBook;
  const orderBookSummary = orderBookData?.summary ?? 'Order book data unavailable.';
  const orderBookBids = orderBookData?.formatted?.bids?.slice(0, 10) || ['No order book bids available.'];
  const orderBookAsks = orderBookData?.formatted?.asks?.slice(0, 10) || ['No order book asks available.'];

  const marketNewsFormatted = marketData.marketNews?.formatted ?? null;

  const ticker = marketData.btc?.ticker || marketData.ticker || {};

  return {
    usdtBalance,
    btcBalance,
    adaBalance, // Added for dual-asset support
    currentPrice,
    portfolioValueUSD,
    maxBuyUSDT,
    maxSellBTC,
    maxSellValueUSD,
    MIN_ORDER_VALUE_USD,
    priceChangePercent: ticker.priceChangePercent || 0,
    high24h: ticker.highPrice || 0,
    low24h: ticker.lowPrice || 0,
    volume24h: ticker.volume || 0,
    quoteVolume24h: ticker.quoteVolume || 0,
    priceRangeHigh,
    priceRangeLow,
    priceRangeAvg,
    tradeHistoryEntries,
    tradeHistorySummary,
    indicatorsFormatted,
    orderBookSummary,
    orderBookBids,
    orderBookAsks,
    marketNewsFormatted,
  };
}

/**
 * Normalize action types for consensus checking
 * Maps PLACE_LIMIT_BUY, PLACE_MARKET_BUY → BUY
 * Maps PLACE_LIMIT_SELL, PLACE_MARKET_SELL → SELL
 * Maps CANCEL_ORDER → CANCEL
 * Maps HOLD → HOLD
 */
function normalizeActionType(actionType: string): 'BUY' | 'SELL' | 'HOLD' | 'CANCEL' {
  if (actionType.includes('BUY')) return 'BUY';
  if (actionType.includes('SELL')) return 'SELL';
  if (actionType.includes('CANCEL')) return 'CANCEL';
  return 'HOLD';
}

/**
 * Retry wrapper for API calls with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  modelName: string,
  maxRetries = 1
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.error(`[${new Date().toISOString()}] ${modelName} API call failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s, etc.
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`${modelName} failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
}

// ============================================================================
// ZOD SCHEMAS FOR RESPONSES API
// ============================================================================

const VoteSchema = z.object({
  rankings: z.array(z.object({
    rank: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5)
    ]),
    targetModel: z.string(),
    justification: z.string(),
  }))
});

// ============================================================================
// OPENAI ADAPTER
// ============================================================================

export class OpenAIAdapter {
  private client: OpenAI;
  private modelName: ModelName = 'OpenAI';
  private agentName = 'council-openai';

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  private async buildPrompts(marketData: MarketIntelligence) {
    const ctx = buildPromptContext(marketData);
    const agentConfig = getAgentConfig('council');
    if (!agentConfig) {
      throw new Error('Council agent configuration not found');
    }

    const previousPlan = await loadPlan(this.agentName).catch(error => {
      console.warn(`Failed to load plan for ${this.agentName}:`, error);
      return null;
    });

    // Fetch open orders for both BTC and ADA
    const [btcOrders, adaOrders] = await Promise.all([
      getOpenOrders('BTCUSDT', agentConfig.binanceApiKey, agentConfig.binanceSecretKey).catch(() => []),
      getOpenOrders('ADAUSDT', agentConfig.binanceApiKey, agentConfig.binanceSecretKey).catch(() => [])
    ]);
    const openOrders = [...btcOrders, ...adaOrders];

    const promptConfig: PromptConfig = {
      tone: 'analytical',
      maxPositionPct: 0.20,
      minOrderUSD: 10,
      decisionInterval: '4 hours',
      dailyOrderCap: 10
    };

    const { systemPrompt, userPrompt } = await buildTradingPromptWithPlan(
      this.agentName,
      marketData,
      promptConfig,
      0,
      {
        symbol: marketData.symbol,
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

    return { systemPrompt, userPrompt, openOrders, previousPlan };
  }

  async propose(marketData: MarketIntelligence): Promise<NormalizedDecision> {
    return withRetry(async () => {
      const { systemPrompt, userPrompt, previousPlan } = await this.buildPrompts(marketData);

      const response = await this.client.responses.parse({
        model: 'gpt-5-nano',
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        text: {
          format: zodTextFormat(TradingDecisionSchema, "trading_decision")
        }
      });

      const decision = TradingDecisionSchema.parse(response.output_parsed);

      if (!decision || !Array.isArray(decision.actions) || decision.actions.length === 0) {
        throw new Error('Council OpenAI proposal missing actions');
      }

      if (!decision.plan?.trim()) {
        throw new Error('Council OpenAI proposal missing plan');
      }

      await savePlan(this.agentName, decision.plan);

      const primaryAction = decision.actions[0];
      return {
        ...decision,
        rawText: JSON.stringify(decision.actions),
        model: this.modelName,
        phaseId: `proposal-${this.modelName}`,
        planSnapshot: previousPlan?.plan ?? decision.plan,
        normalizedAction: normalizeActionType(primaryAction.type),
        quantity: primaryAction.quantity || 0,
        asset: primaryAction.asset || marketData.symbol,
      };
    }, this.modelName);
  }

  async vote(proposals: NormalizedDecision[]): Promise<VoteOutput> {
    return withRetry(async () => {
      const ctx = buildPromptContext({} as MarketIntelligence); // Empty context for voting
      const systemPrompt = getVoteSystemPrompt(this.modelName);
      const userPrompt = getVoteUserPrompt(proposals, this.modelName);

      const response = await this.client.responses.parse({
        model: 'gpt-5-nano',
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        text: {
          format: zodTextFormat(VoteSchema, "vote_response")
        }
      });

      const parsed = VoteSchema.parse(response.output_parsed);

      // Validate that all 5 ranks are present and unique
      const ranks = parsed.rankings.map(r => r.rank);
      const uniqueRanks = new Set(ranks);
      if (uniqueRanks.size !== 5 || ranks.length !== 5) {
        throw new Error(`OpenAI vote must include exactly 5 unique ranks (1-5), got: ${ranks.join(', ')}`);
      }

      return {
        model: this.modelName,
        rankings: parsed.rankings.map((r: any) => ({
          rank: r.rank as 1 | 2 | 3 | 4 | 5,
          targetModel: r.targetModel,
          justification: r.justification,
        })),
        phaseId: `vote-${this.modelName}`,
        timeMs: 0,
      };
    }, this.modelName);
  }
}

// ============================================================================
// GROK ADAPTER
// ============================================================================

export class GrokAdapter {
  private client: OpenAI;
  private modelName: ModelName = 'Grok';

  constructor() {
    this.client = new OpenAI({
      baseURL: "https://api.x.ai/v1",
      apiKey: process.env.GROK_API_KEY,
    });
  }

  async propose(marketData: MarketIntelligence): Promise<NormalizedDecision> {
    return withRetry(async () => {
      const ctx = buildPromptContext(marketData);
      const systemPrompt = getProposalSystemPrompt(ctx, this.modelName);
      const userPrompt = getProposalUserPrompt(ctx);

      const completion = await this.client.chat.completions.create({
        model: "grok-4-fast",
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
                      orderId: { type: "string" },
                      price: { type: "number" },
                      quantity: { type: "number" },
                      asset: { type: "string" },
                      reasoning: { type: "string" }
                    },
                    required: ["type", "reasoning"],
                    additionalProperties: false
                  }
                },
                plan: {
                  type: "string"
                },
                reasoning: {
                  type: "string"
                }
              },
              required: ["actions", "plan", "reasoning"],
              additionalProperties: false
            }
          }
        },
        temperature: 0.0, // Deterministic
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('Empty response from Grok');

      const parsed = JSON.parse(content);
      const decision = TradingDecisionSchema.parse(parsed);

      if (!decision || !Array.isArray(decision.actions) || decision.actions.length === 0) {
        throw new Error('Council Grok proposal missing actions array');
      }

      if (!decision.plan?.trim()) {
        throw new Error('Council Grok proposal missing plan');
      }

      const primaryAction = decision.actions[0];
      return {
        ...decision,
        rawText: JSON.stringify(decision.actions),
        model: this.modelName,
        phaseId: `proposal-${this.modelName}`,
        planSnapshot: decision.plan,
        normalizedAction: normalizeActionType(primaryAction.type),
        quantity: primaryAction.quantity || 0,
        asset: primaryAction.asset || marketData.symbol,
      };
    }, this.modelName);
  }

  async vote(proposals: NormalizedDecision[]): Promise<VoteOutput> {
    return withRetry(async () => {
      const systemPrompt = getVoteSystemPrompt(this.modelName);
      const userPrompt = getVoteUserPrompt(proposals, this.modelName);

      const completion = await this.client.chat.completions.create({
        model: "grok-4-fast",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.0, // Deterministic
        max_tokens: 800,
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('Empty response from Grok');

      const parsed = JSON.parse(content);

      // Validate that all 5 ranks are present and unique
      const ranks = parsed.rankings.map((r: any) => r.rank);
      const uniqueRanks = new Set(ranks);
      if (uniqueRanks.size !== 5 || ranks.length !== 5) {
        throw new Error(`Grok vote must include exactly 5 unique ranks (1-5), got: ${ranks.join(', ')}`);
      }

      return {
        model: this.modelName,
        rankings: parsed.rankings.map((r: any) => ({
          rank: r.rank as 1 | 2 | 3 | 4 | 5,
          targetModel: r.targetModel,
          justification: r.justification,
        })),
        phaseId: `vote-${this.modelName}`,
        timeMs: 0,
      };
    }, this.modelName);
  }
}

// ============================================================================
// GEMINI ADAPTER
// ============================================================================

export class GeminiAdapter {
  private client: OpenAI;
  private modelName: ModelName = 'Gemini';
  private agentName = 'council-gemini';

  constructor() {
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": "https://tradewarriors.dev",
        "X-Title": "TradeWarriors",
      },
    });
  }

  async propose(marketData: MarketIntelligence): Promise<NormalizedDecision> {
    return withRetry(async () => {
      const ctx = buildPromptContext(marketData);
      const systemPrompt = getProposalSystemPrompt(ctx, this.modelName);
      const userPrompt = getProposalUserPrompt(ctx);

      const completion = await this.client.chat.completions.create({
        model: "google/gemini-2.5-flash",
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
                    oneOf: [
                      {
                        type: "object",
                        properties: {
                          type: { type: "string", enum: ["CANCEL_ORDER"] },
                          orderId: { type: "string" },
                          asset: { type: "string" },
                          reasoning: { type: "string" }
                        },
                        required: ["type", "orderId", "asset", "reasoning"],
                        additionalProperties: false
                      },
                      {
                        type: "object",
                        properties: {
                          type: { type: "string", enum: ["PLACE_LIMIT_BUY"] },
                          asset: { type: "string" },
                          quantity: { type: "number" },
                          price: { type: "number" },
                          reasoning: { type: "string" }
                        },
                        required: ["type", "asset", "quantity", "price", "reasoning"],
                        additionalProperties: false
                      },
                      {
                        type: "object",
                        properties: {
                          type: { type: "string", enum: ["PLACE_LIMIT_SELL"] },
                          asset: { type: "string" },
                          quantity: { type: "number" },
                          price: { type: "number" },
                          reasoning: { type: "string" }
                        },
                        required: ["type", "asset", "quantity", "price", "reasoning"],
                        additionalProperties: false
                      },
                      {
                        type: "object",
                        properties: {
                          type: { type: "string", enum: ["PLACE_MARKET_BUY"] },
                          asset: { type: "string" },
                          quantity: { type: "number" },
                          reasoning: { type: "string" }
                        },
                        required: ["type", "asset", "quantity", "reasoning"],
                        additionalProperties: false
                      },
                      {
                        type: "object",
                        properties: {
                          type: { type: "string", enum: ["PLACE_MARKET_SELL"] },
                          asset: { type: "string" },
                          quantity: { type: "number" },
                          reasoning: { type: "string" }
                        },
                        required: ["type", "asset", "quantity", "reasoning"],
                        additionalProperties: false
                      },
                      {
                        type: "object",
                        properties: {
                          type: { type: "string", enum: ["HOLD"] },
                          asset: { type: "string" },
                          reasoning: { type: "string" }
                        },
                        required: ["type", "reasoning"],
                        additionalProperties: false
                      }
                    ]
                  }
                },
                plan: {
                  type: "string"
                },
                reasoning: {
                  type: "string"
                }
              },
              required: ["actions", "plan", "reasoning"],
              additionalProperties: false
            }
          }
        },
        temperature: 0.0, // Deterministic
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('Empty response from Gemini');

      const parsed = JSON.parse(content);
      const decision = TradingDecisionSchema.parse(parsed);

      if (!decision || !Array.isArray(decision.actions) || decision.actions.length === 0) {
        throw new Error('Council Gemini proposal missing actions array');
      }

      if (!decision.plan?.trim()) {
        throw new Error('Council Gemini proposal missing plan');
      }

      const primaryAction = decision.actions[0];
      return {
        ...decision,
        rawText: JSON.stringify(decision.actions),
        model: this.modelName,
        phaseId: `proposal-${this.modelName}`,
        planSnapshot: decision.plan,
        normalizedAction: normalizeActionType(primaryAction.type),
        quantity: primaryAction.quantity || 0,
        asset: primaryAction.asset || marketData.symbol,
      };
    }, this.modelName);
  }

  async vote(proposals: NormalizedDecision[]): Promise<VoteOutput> {
    return withRetry(async () => {
      const systemPrompt = getVoteSystemPrompt(this.modelName);
      const userPrompt = getVoteUserPrompt(proposals, this.modelName);

      const completion = await this.client.chat.completions.create({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.0, // Deterministic
        max_tokens: 800,
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('Empty response from Gemini');

      const parsed = JSON.parse(content);

      // Validate that all 5 ranks are present and unique
      const ranks = parsed.rankings.map((r: any) => r.rank);
      const uniqueRanks = new Set(ranks);
      if (uniqueRanks.size !== 5 || ranks.length !== 5) {
        throw new Error(`Gemini vote must include exactly 5 unique ranks (1-5), got: ${ranks.join(', ')}`);
      }

      return {
        model: this.modelName,
        rankings: parsed.rankings.map((r: any) => ({
          rank: r.rank as 1 | 2 | 3 | 4 | 5,
          targetModel: r.targetModel,
          justification: r.justification,
        })),
        phaseId: `vote-${this.modelName}`,
        timeMs: 0,
      };
    }, this.modelName);
  }
}

// ============================================================================
// KIMI ADAPTER
// ============================================================================

export class KimiAdapter {
  private client: OpenAI;
  private modelName: ModelName = 'Kimi';
  private agentName = 'council-kimi';

  constructor() {
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": "https://tradewarriors.dev",
        "X-Title": "TradeWarriors",
      },
    });
  }

  async propose(marketData: MarketIntelligence): Promise<NormalizedDecision> {
    return withRetry(async () => {
      const ctx = buildPromptContext(marketData);
      const systemPrompt = getProposalSystemPrompt(ctx, this.modelName);
      const userPrompt = getProposalUserPrompt(ctx);

      const completion = await this.client.chat.completions.create({
        model: "moonshotai/kimi-k2-thinking",
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
                      orderId: { type: "string" },
                      price: { type: "number" },
                      quantity: { type: "number" },
                      asset: { type: "string" },
                      reasoning: { type: "string" }
                    },
                    required: ["type", "reasoning"],
                    additionalProperties: false
                  }
                },
                plan: {
                  type: "string"
                },
                reasoning: {
                  type: "string"
                }
              },
              required: ["actions", "plan", "reasoning"],
              additionalProperties: false
            }
          }
        },
        temperature: 0.0, // Deterministic
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('Empty response from Kimi');

      const parsed = JSON.parse(content);
      const decision = TradingDecisionSchema.parse(parsed);

      if (!decision || !Array.isArray(decision.actions) || decision.actions.length === 0) {
        throw new Error('Council Kimi proposal missing actions array');
      }

      if (!decision.plan?.trim()) {
        throw new Error('Council Kimi proposal missing plan');
      }

      const primaryAction = decision.actions[0];
      return {
        ...decision,
        rawText: JSON.stringify(decision.actions),
        model: this.modelName,
        phaseId: `proposal-${this.modelName}`,
        planSnapshot: decision.plan,
        normalizedAction: normalizeActionType(primaryAction.type),
        quantity: primaryAction.quantity || 0,
        asset: primaryAction.asset || marketData.symbol,
      };
    }, this.modelName);
  }

  async vote(proposals: NormalizedDecision[]): Promise<VoteOutput> {
    return withRetry(async () => {
      const systemPrompt = getVoteSystemPrompt(this.modelName);
      const userPrompt = getVoteUserPrompt(proposals, this.modelName);

      const completion = await this.client.chat.completions.create({
        model: "moonshotai/kimi-k2-thinking",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.0, // Deterministic
        max_tokens: 800,
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('Empty response from Kimi');

      const parsed = JSON.parse(content);

      // Validate that all 5 ranks are present and unique
      const ranks = parsed.rankings.map((r: any) => r.rank);
      const uniqueRanks = new Set(ranks);
      if (uniqueRanks.size !== 5 || ranks.length !== 5) {
        throw new Error(`Kimi vote must include exactly 5 unique ranks (1-5), got: ${ranks.join(', ')}`);
      }

      return {
        model: this.modelName,
        rankings: parsed.rankings.map((r: any) => ({
          rank: r.rank as 1 | 2 | 3 | 4 | 5,
          targetModel: r.targetModel,
          justification: r.justification,
        })),
        phaseId: `vote-${this.modelName}`,
        timeMs: 0,
      };
    }, this.modelName);
  }
}

// ============================================================================
// DEEPSEEK ADAPTER
// ============================================================================

export class DeepSeekAdapter {
  private client: OpenAI;
  private modelName: ModelName = 'DeepSeek';
  private agentName = 'council-deepseek';

  constructor() {
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": "https://tradewarriors.dev",
        "X-Title": "TradeWarriors",
      },
    });
  }

  async propose(marketData: MarketIntelligence): Promise<NormalizedDecision> {
    return withRetry(async () => {
      const ctx = buildPromptContext(marketData);
      const systemPrompt = getProposalSystemPrompt(ctx, this.modelName);
      const userPrompt = getProposalUserPrompt(ctx);

      const completion = await this.client.chat.completions.create({
        model: "deepseek/deepseek-chat-v3-0324",
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
                      orderId: { type: "string" },
                      price: { type: "number" },
                      quantity: { type: "number" },
                      asset: { type: "string" },
                      reasoning: { type: "string" }
                    },
                    required: ["type", "reasoning"],
                    additionalProperties: false
                  }
                },
                plan: {
                  type: "string"
                },
                reasoning: {
                  type: "string"
                }
              },
              required: ["actions", "plan", "reasoning"],
              additionalProperties: false
            }
          }
        },
        temperature: 0.0, // Deterministic
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('Empty response from DeepSeek');

      const parsed = JSON.parse(content);
      const decision = TradingDecisionSchema.parse(parsed);

      if (!decision || !Array.isArray(decision.actions) || decision.actions.length === 0) {
        throw new Error('Council DeepSeek proposal missing actions array');
      }

      if (!decision.plan?.trim()) {
        throw new Error('Council DeepSeek proposal missing plan');
      }

      const primaryAction = decision.actions[0];
      return {
        ...decision,
        rawText: JSON.stringify(decision.actions),
        model: this.modelName,
        phaseId: `proposal-${this.modelName}`,
        planSnapshot: decision.plan,
        normalizedAction: normalizeActionType(primaryAction.type),
        quantity: primaryAction.quantity || 0,
        asset: primaryAction.asset || marketData.symbol,
      };
    }, this.modelName);
  }

  async vote(proposals: NormalizedDecision[]): Promise<VoteOutput> {
    return withRetry(async () => {
      const systemPrompt = getVoteSystemPrompt(this.modelName);
      const userPrompt = getVoteUserPrompt(proposals, this.modelName);

      const completion = await this.client.chat.completions.create({
        model: "deepseek/deepseek-chat-v3-0324",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.0, // Deterministic
        max_tokens: 800,
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('Empty response from DeepSeek');

      const parsed = JSON.parse(content);

      // Validate that all 5 ranks are present and unique
      const ranks = parsed.rankings.map((r: any) => r.rank);
      const uniqueRanks = new Set(ranks);
      if (uniqueRanks.size !== 5 || ranks.length !== 5) {
        throw new Error(`DeepSeek vote must include exactly 5 unique ranks (1-5), got: ${ranks.join(', ')}`);
      }

      return {
        model: this.modelName,
        rankings: parsed.rankings.map((r: any) => ({
          rank: r.rank as 1 | 2 | 3 | 4 | 5,
          targetModel: r.targetModel,
          justification: r.justification,
        })),
        phaseId: `vote-${this.modelName}`,
        timeMs: 0,
      };
    }, this.modelName);
  }
}
