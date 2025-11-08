/**
 * Real LLM adapters for Council Debate system
 *
 * Each adapter implements the 4 debate phases:
 * 1. Proposal - initial trading decision
 * 2. Critique - analyze other models' proposals
 * 3. Revision - update decision based on critiques
 * 4. Vote - rank other models' revised decisions
 */

import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { TradingDecisionSchema } from '@/types/trading';
import { buildTradingPromptWithPlan, PromptConfig } from '@/lib/prompts/tradingPromptBuilder';
import { loadPlan, savePlan } from '@/lib/storage/agentPlans';
import { getOpenOrders } from '@/lib/binance/openOrders';
import { getAgentConfig } from '@/config/agents';
import { validateRiskLimits } from '@/lib/execution/orderValidator';
import { executeActions } from '@/lib/execution/multiActionExecutor';
import {
  ModelName,
  NormalizedDecision,
  CritiqueOutput,
  VoteOutput,
  MarketIntelligence,
} from './types';
import {
  getProposalSystemPrompt,
  getProposalUserPrompt,
  getCritiqueSystemPrompt,
  getCritiqueUserPrompt,
  getRevisionSystemPrompt,
  getRevisionUserPrompt,
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
  const currentPrice = marketData.ticker.lastPrice;
  const portfolioValueUSD = usdtBalance + (btcBalance * currentPrice);

  const MIN_ORDER_VALUE_USD = 10;
  const maxBuyUSDT = Math.min(usdtBalance * 0.995, portfolioValueUSD * 0.50);
  const maxSellBTC = Math.min(btcBalance * 0.995, (portfolioValueUSD * 0.50) / currentPrice);
  const maxSellValueUSD = maxSellBTC * currentPrice;

  const recentKlines = marketData.klines;
  const priceRangeHigh = Math.max(...recentKlines.map(k => k.high));
  const priceRangeLow = Math.min(...recentKlines.map(k => k.low));
  const priceRangeAvg = recentKlines.reduce((sum, k) => sum + k.close, 0) / recentKlines.length;

  const tradeHistoryEntries = marketData.tradeHistory.entries;
  const tradeHistorySummary = marketData.tradeHistory.summary;
  const indicatorsFormatted = marketData.indicators.formatted;
  const orderBookSummary = marketData.orderBook?.summary ?? 'Order book data unavailable.';
  const orderBookBids = marketData.orderBook
    ? marketData.orderBook.formatted.bids.slice(0, 10)
    : ['No order book bids available.'];
  const orderBookAsks = marketData.orderBook
    ? marketData.orderBook.formatted.asks.slice(0, 10)
    : ['No order book asks available.'];

  const marketNewsFormatted = marketData.marketNews?.formatted ?? null;

  return {
    usdtBalance,
    btcBalance,
    currentPrice,
    portfolioValueUSD,
    maxBuyUSDT,
    maxSellBTC,
    maxSellValueUSD,
    MIN_ORDER_VALUE_USD,
    priceChangePercent: marketData.ticker.priceChangePercent,
    high24h: marketData.ticker.highPrice,
    low24h: marketData.ticker.lowPrice,
    volume24h: marketData.ticker.volume,
    quoteVolume24h: marketData.ticker.quoteVolume,
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

function calculateExposure(openOrders: any[], currentPrice: number, balances: MarketIntelligence['balances']): number {
  const limitExposure = openOrders.reduce((total, order) => {
    const price = Number(order.price ?? currentPrice);
    const quantity = Number(order.origQty ?? order.quantity ?? 0);
    return total + price * quantity;
  }, 0);

  const btcHoldingValue =
    (balances.find(b => b.asset === 'BTC')?.total ?? 0) * currentPrice;

  return limitExposure + btcHoldingValue;
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

// ============================================================================
// ZOD SCHEMAS FOR RESPONSES API
// ============================================================================

const CritiqueSchema = z.object({
  critiques: z.array(z.object({
    targetModel: z.string(),
    critique: z.string(),
    risks: z.array(z.string()).optional(),
    conflicts: z.array(z.string()).optional(),
  }))
});

const VoteSchema = z.object({
  rankings: z.array(z.object({
    rank: z.union([z.literal(1), z.literal(2)]),
    targetModel: z.string(),
    justification: z.string(),
  }))
});

// ============================================================================
// OPENAI ADAPTER
// ============================================================================

export class OpenAIAdapter {
  private client: OpenAI;
  private modelName: ModelName = 'gpt-5-nano';
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

    const openOrders = await getOpenOrders(
      marketData.symbol,
      agentConfig.binanceApiKey,
      agentConfig.binanceSecretKey
    ).catch(error => {
      console.warn(`Failed to fetch open orders for ${this.agentName}:`, error);
      return marketData.openOrders ?? [];
    });

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

  async generateProposal(marketData: MarketIntelligence): Promise<NormalizedDecision> {
    const { systemPrompt, userPrompt, openOrders, previousPlan } = await this.buildPrompts(marketData);

    const response = await this.client.responses.parse({
      model: this.modelName,
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

    // Note: Risk validation and execution happen later in the council orchestrator
    // after consensus is reached. Proposal phase only returns the decision.
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
    };
  }

  async generateCritique(proposals: NormalizedDecision[]): Promise<CritiqueOutput[]> {
    const systemPrompt = getCritiqueSystemPrompt(this.modelName);
    const userPrompt = getCritiqueUserPrompt(proposals, this.modelName);

    const response = await this.client.responses.parse({
      model: this.modelName,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      text: {
        format: zodTextFormat(CritiqueSchema, "critique_response")
      }
    });

    const parsed = CritiqueSchema.parse(response.output_parsed);
    const critiques: CritiqueOutput[] = [];

    for (const c of parsed.critiques) {
      critiques.push({
        model: this.modelName,
        targetModel: c.targetModel,
        critique: c.critique,
        risks: c.risks || [],
        conflicts: c.conflicts || [],
        phaseId: `critique-${this.modelName}-${c.targetModel}`,
        timeMs: 0, // Will be set by orchestrator
      });
    }

    return critiques;
  }

  async generateRevision(
    originalProposal: NormalizedDecision,
    receivedCritiques: Array<{ model: ModelName; critique: string; risks: string[]; conflicts: string[] }>,
    marketData: MarketIntelligence
  ): Promise<NormalizedDecision> {
    const ctx = buildPromptContext(marketData);

    const plan = await loadPlan(this.agentName).catch(() => null);

    const agentConfig = getAgentConfig('council');
    if (!agentConfig) {
      throw new Error('Council agent configuration not found');
    }

    const openOrders = await getOpenOrders(
      marketData.symbol,
      agentConfig.binanceApiKey,
      agentConfig.binanceSecretKey
    ).catch(() => marketData.openOrders ?? []);

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
        planOverride: plan
          ? {
              text: plan.plan,
              lastUpdated: plan.lastUpdated
            }
          : null
      }
    );

    const response = await this.client.responses.parse({
      model: this.modelName,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: getRevisionUserPrompt(originalProposal, receivedCritiques, {
          previousPlan: plan?.plan ?? null,
          openOrders: openOrders.length ? openOrders.map(order => `${order.side} ${order.quantity} @ $${order.price}`).join('\n') : null,
          exposureLine: `Current Exposure: $${calculateExposure(openOrders, marketData.ticker.lastPrice, marketData.balances).toFixed(2)}`
        }) }
      ],
      text: {
        format: zodTextFormat(TradingDecisionSchema, "trading_decision")
      }
    });

    const decision = TradingDecisionSchema.parse(response.output_parsed);

    if (!decision || !Array.isArray(decision.actions) || decision.actions.length === 0) {
      throw new Error('Council OpenAI revision missing actions');
    }

    if (!decision.plan?.trim()) {
      throw new Error('Council OpenAI revision missing plan');
    }

    await savePlan(this.agentName, decision.plan);

    const primaryAction = decision.actions[0];
    return {
      ...decision,
      rawText: JSON.stringify(decision.actions),
      model: this.modelName,
      phaseId: `revision-${this.modelName}`,
      planSnapshot: decision.plan,
      normalizedAction: normalizeActionType(primaryAction.type),
      quantity: primaryAction.quantity || 0,
    };
  }

  async generateVote(revisedProposals: NormalizedDecision[]): Promise<VoteOutput> {
    const systemPrompt = getVoteSystemPrompt(this.modelName);
    const userPrompt = getVoteUserPrompt(revisedProposals, this.modelName);

    const response = await this.client.responses.parse({
      model: this.modelName,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      text: {
        format: zodTextFormat(VoteSchema, "vote_response")
      }
    });

    const parsed = VoteSchema.parse(response.output_parsed);

    return {
      model: this.modelName,
      rankings: parsed.rankings.map((r: any) => ({
        rank: r.rank as 1 | 2,
        targetModel: r.targetModel,
        justification: r.justification,
      })),
      phaseId: `vote-${this.modelName}`,
      timeMs: 0,
    };
  }
}

// ============================================================================
// GROK ADAPTER
// ============================================================================

export class GrokAdapter {
  private client: OpenAI;
  private modelName: ModelName = 'grok-4-fast';

  constructor() {
    this.client = new OpenAI({
      baseURL: "https://api.x.ai/v1",
      apiKey: process.env.GROK_API_KEY,
    });
  }

  async generateProposal(marketData: MarketIntelligence): Promise<NormalizedDecision> {
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
      temperature: 0.4,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('Empty response from Grok');

    const parsed = JSON.parse(content);
    const decision = TradingDecisionSchema.parse(parsed);

    // Validate the new schema structure
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
    };
  }

  async generateCritique(proposals: NormalizedDecision[]): Promise<CritiqueOutput[]> {
    const systemPrompt = getCritiqueSystemPrompt(this.modelName);
    const userPrompt = getCritiqueUserPrompt(proposals, this.modelName);

    const completion = await this.client.chat.completions.create({
      model: "grok-4-fast",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 600,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('Empty response from Grok');

    const parsed = JSON.parse(content);
    const critiques: CritiqueOutput[] = [];

    for (const c of parsed.critiques) {
      critiques.push({
        model: this.modelName,
        targetModel: c.targetModel,
        critique: c.critique,
        risks: c.risks || [],
        conflicts: c.conflicts || [],
        phaseId: `critique-${this.modelName}-${c.targetModel}`,
        timeMs: 0,
      });
    }

    return critiques;
  }

  async generateRevision(
    originalProposal: NormalizedDecision,
    receivedCritiques: Array<{ model: ModelName; critique: string; risks: string[]; conflicts: string[] }>,
    marketData: MarketIntelligence
  ): Promise<NormalizedDecision> {
    const ctx = buildPromptContext(marketData);
    const systemPrompt = getRevisionSystemPrompt(ctx, this.modelName);
    const userPrompt = getRevisionUserPrompt(originalProposal, receivedCritiques);

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
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('Empty response from Grok');

    const parsed = JSON.parse(content);
    const decision = TradingDecisionSchema.parse(parsed);

    // Validate the new schema structure
    if (!decision || !Array.isArray(decision.actions) || decision.actions.length === 0) {
      throw new Error('Council Grok revision missing actions array');
    }

    if (!decision.plan?.trim()) {
      throw new Error('Council Grok revision missing plan');
    }

    const primaryAction = decision.actions[0];
    return {
      ...decision,
      rawText: JSON.stringify(decision.actions),
      model: this.modelName,
      phaseId: `revision-${this.modelName}`,
      planSnapshot: decision.plan,
      normalizedAction: normalizeActionType(primaryAction.type),
      quantity: primaryAction.quantity || 0,
    };
  }

  async generateVote(revisedProposals: NormalizedDecision[]): Promise<VoteOutput> {
    const systemPrompt = getVoteSystemPrompt(this.modelName);
    const userPrompt = getVoteUserPrompt(revisedProposals, this.modelName);

    const completion = await this.client.chat.completions.create({
      model: "grok-4-fast",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 400,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('Empty response from Grok');

    const parsed = JSON.parse(content);

    return {
      model: this.modelName,
      rankings: parsed.rankings.map((r: any) => ({
        rank: r.rank as 1 | 2,
        targetModel: r.targetModel,
        justification: r.justification,
      })),
      phaseId: `vote-${this.modelName}`,
      timeMs: 0,
    };
  }
}

// ============================================================================
// GEMINI ADAPTER
// ============================================================================

export class GeminiAdapter {
  private client: OpenAI;
  private modelName: ModelName = 'google/gemini-2.5-flash';
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

  async generateProposal(marketData: MarketIntelligence): Promise<NormalizedDecision> {
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
      temperature: 0.4,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(content);
    const decision = TradingDecisionSchema.parse(parsed);

    // Validate the new schema structure
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
    };
  }

  async generateCritique(proposals: NormalizedDecision[]): Promise<CritiqueOutput[]> {
    const systemPrompt = getCritiqueSystemPrompt(this.modelName);
    const userPrompt = getCritiqueUserPrompt(proposals, this.modelName);

    const completion = await this.client.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 600,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(content);
    const critiques: CritiqueOutput[] = [];

    for (const c of parsed.critiques) {
      critiques.push({
        model: this.modelName,
        targetModel: c.targetModel,
        critique: c.critique,
        risks: c.risks || [],
        conflicts: c.conflicts || [],
        phaseId: `critique-${this.modelName}-${c.targetModel}`,
        timeMs: 0,
      });
    }

    return critiques;
  }

  async generateRevision(
    originalProposal: NormalizedDecision,
    receivedCritiques: Array<{ model: ModelName; critique: string; risks: string[]; conflicts: string[] }>,
    marketData: MarketIntelligence
  ): Promise<NormalizedDecision> {
    const ctx = buildPromptContext(marketData);
    const systemPrompt = getRevisionSystemPrompt(ctx, this.modelName);
    const userPrompt = getRevisionUserPrompt(originalProposal, receivedCritiques);

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
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(content);
    const decision = TradingDecisionSchema.parse(parsed);

    // Validate the new schema structure
    if (!decision || !Array.isArray(decision.actions) || decision.actions.length === 0) {
      throw new Error('Council Gemini revision missing actions array');
    }

    if (!decision.plan?.trim()) {
      throw new Error('Council Gemini revision missing plan');
    }

    const primaryAction = decision.actions[0];
    return {
      ...decision,
      rawText: JSON.stringify(decision.actions),
      model: this.modelName,
      phaseId: `revision-${this.modelName}`,
      planSnapshot: decision.plan,
      normalizedAction: normalizeActionType(primaryAction.type),
      quantity: primaryAction.quantity || 0,
    };
  }

  async generateVote(revisedProposals: NormalizedDecision[]): Promise<VoteOutput> {
    const systemPrompt = getVoteSystemPrompt(this.modelName);
    const userPrompt = getVoteUserPrompt(revisedProposals, this.modelName);

    const completion = await this.client.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 400,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(content);

    return {
      model: this.modelName,
      rankings: parsed.rankings.map((r: any) => ({
        rank: r.rank as 1 | 2,
        targetModel: r.targetModel,
        justification: r.justification,
      })),
      phaseId: `vote-${this.modelName}`,
      timeMs: 0,
    };
  }
}
