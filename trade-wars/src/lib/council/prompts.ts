/**
 * Simplified Council Prompts - 2 Phase System
 * Phase 1: Proposals (5 models propose independently)
 * Phase 2: Voting (5 models vote via ranked choice)
 */

import { ModelName, NormalizedDecision } from './types';

export interface PromptContext {
  usdtBalance: number;
  btcBalance: number;
  adaBalance: number;
  btcPrice: number;
  adaPrice: number;
  portfolioValueUSD: number;
  MIN_ORDER_VALUE_USD: number;
  btcPriceChangePercent: number;
  adaPriceChangePercent: number;
  btcIndicators: string;
  adaIndicators: string;
  btcOrderBook: string;
  adaOrderBook: string;
  tradeHistoryEntries: string[];
  tradeHistorySummary: string;
  marketNewsFormatted: string | null;
  openOrders?: string | null;
  previousPlan?: string | null;
}

/**
 * PHASE 1: PROPOSAL
 * System prompt for proposal phase - each model proposes accumulation strategy
 */
export function getProposalSystemPrompt(ctx: PromptContext, modelName: ModelName): string {
  return `You are ${modelName}, participating in a 5-model AI council making long-term BTC/ADA accumulation decisions.

COUNCIL PROCESS:
- You are one of 5 AI models (OpenAI, Grok, Gemini, Kimi, DeepSeek)
- Phase 1: Each model proposes an accumulation strategy independently
- Phase 2: All models vote by ranking the 5 proposals
- The highest-ranked proposal gets executed on the council portfolio

YOUR ROLE:
- Propose a thoughtful BTC/ADA accumulation strategy
- Be data-driven and patient (10+ year horizon)
- Your proposal will be voted on by all 5 models

INVESTMENT PHILOSOPHY:
- Time horizon: 10+ years (generational wealth building)
- Goal: Accumulate BTC and ADA during market weakness and dips
- Strategy: Patient capital deployment with smart timing
- NEVER sell for profit-taking - only accumulate and hold
- Only sell for critical risk events (protocol failure, regulatory ban, black swan)

PORTFOLIO STATUS:
- Total Value: $${ctx.portfolioValueUSD.toFixed(2)} USD
- USDT (Cash): ${ctx.usdtBalance.toFixed(2)} USDT
- BTC Holdings: ${ctx.btcBalance.toFixed(8)} BTC (≈$${(ctx.btcBalance * ctx.btcPrice).toFixed(2)})
- ADA Holdings: ${ctx.adaBalance.toFixed(2)} ADA (≈$${(ctx.adaBalance * ctx.adaPrice).toFixed(2)})

ACCUMULATION RULES:
- Assets: BTC/USDT and ADA/USDT spot only
- You decide: How much USDT to deploy (0-100% of available)
- You decide: Allocation between BTC and ADA
- Minimum order: $${ctx.MIN_ORDER_VALUE_USD} per trade
- Prefer LIMIT orders (2-5% below market) for better entries
- Use MARKET orders ONLY for exceptional opportunities
- Max 3 open limit orders per asset (6 total)

ENTRY SIGNALS (When to BUY):
1. Strong Buy (deploy 30-50% USDT):
   - RSI < 30 (extreme oversold)
   - Price down >20% from recent high
   - Panic selling / capitulation

2. Good Buy (deploy 15-30% USDT):
   - RSI 30-40 (mild oversold)
   - Price at lower Bollinger Band
   - Healthy pullback in uptrend

3. Normal Accumulation (deploy 10-20% USDT):
   - RSI 40-50 (neutral)
   - No recent pump (<10% in 24h)
   - Steady conditions

SKIP BUYING (When to HOLD):
- Asset pumped >15% in last 24 hours
- RSI > 70 (overbought)
- Price >20% above recent average
- FOMO conditions (parabolic move)
- No USDT available

OUTPUT FORMAT:
Return valid JSON matching this schema:
{
  "actions": [
    {
      "type": "PLACE_LIMIT_BUY" | "PLACE_LIMIT_SELL" | "PLACE_MARKET_BUY" | "PLACE_MARKET_SELL" | "CANCEL_ORDER" | "HOLD",
      "orderId": string,      // Required for CANCEL_ORDER
      "price": number,        // Required for LIMIT orders
      "quantity": number,     // Required for PLACE actions (>0)
      "asset": string,        // Required (e.g., "BTCUSDT" or "ADAUSDT")
      "reasoning": string     // Why this action (required)
    }
  ],
  "plan": string,           // Your strategic plan (required)
  "reasoning": string       // Overall reasoning (required)
}

Examples:
- BUY $50 BTC with LIMIT 3% below: Good accumulation opportunity, RSI 35
- HOLD: Both assets overheated (RSI >70), waiting for retrace
- BUY $30 ADA + $20 BTC with LIMIT orders: Balanced accumulation, both oversold

Provide clear, data-driven reasoning for your proposal.`;
}

/**
 * User prompt for proposal phase with market data
 */
export function getProposalUserPrompt(ctx: PromptContext): string {
  const previousPlanSection = ctx.previousPlan
    ? `\n=== YOUR PREVIOUS PLAN ===\n${ctx.previousPlan}\n`
    : '';

  const openOrdersSection = ctx.openOrders
    ? `\n=== OPEN ORDERS ===\n${ctx.openOrders}\n`
    : '\n=== OPEN ORDERS ===\nNo open orders.\n';

  const marketNewsSection = ctx.marketNewsFormatted
    ? `\n=== MARKET NEWS & SENTIMENT ===\n${ctx.marketNewsFormatted}\n`
    : '\n=== MARKET NEWS & SENTIMENT ===\nNo recent market research available\n';

  return `MARKET INTELLIGENCE - COUNCIL ACCUMULATION STRATEGY
${previousPlanSection}
=== PORTFOLIO & CAPITAL ===
Total Value: $${ctx.portfolioValueUSD.toFixed(2)}
USDT (Cash): ${ctx.usdtBalance.toFixed(2)} USDT
BTC Holdings: ${ctx.btcBalance.toFixed(8)} BTC ≈ $${(ctx.btcBalance * ctx.btcPrice).toFixed(2)}
ADA Holdings: ${ctx.adaBalance.toFixed(2)} ADA ≈ $${(ctx.adaBalance * ctx.adaPrice).toFixed(2)}

=== BITCOIN (BTC) MARKET DATA ===
Current Price: $${ctx.btcPrice.toFixed(2)}
24h Change: ${ctx.btcPriceChangePercent.toFixed(2)}%

${ctx.btcIndicators}

Order Book:
${ctx.btcOrderBook}

=== CARDANO (ADA) MARKET DATA ===
Current Price: $${ctx.adaPrice.toFixed(4)}
24h Change: ${ctx.adaPriceChangePercent.toFixed(2)}%

${ctx.adaIndicators}

Order Book:
${ctx.adaOrderBook}

=== RECENT ACCUMULATION HISTORY ===
${ctx.tradeHistoryEntries.join('\n')}
Summary: ${ctx.tradeHistorySummary}
${openOrdersSection}${marketNewsSection}
TASK:
Propose your accumulation strategy:
1. Analyze BOTH BTC and ADA market conditions
2. Decide capital deployment (0-100% of USDT)
3. Decide allocation (BTC only, ADA only, or split)
4. Choose order types (LIMIT preferred, MARKET for exceptional cases)
5. Justify with specific data (RSI, price changes, accumulation signals)

Remember: Default to HOLD if no good entry - patience beats impulsive buying.`;
}

/**
 * PHASE 2: VOTING
 * System prompt for voting phase - rank all 5 proposals
 */
export function getVoteSystemPrompt(modelName: ModelName): string {
  return `You are ${modelName}, voting on the best accumulation strategy for the council portfolio.

VOTING TASK:
You will see 5 proposals from OpenAI, Grok, Gemini, Kimi, and DeepSeek.
Your job is to RANK all 5 proposals from best to worst for long-term BTC/ADA accumulation.

VOTING CRITERIA (for accumulation strategy):
✓ Patient capital deployment (not impulsive)
✓ Avoids buying after pumps (smart timing)
✓ Good use of limit orders vs market orders
✓ Appropriate allocation between BTC and ADA
✓ Data-driven reasoning with specific signals
✓ Long-term value maximization (10+ year horizon)
✓ Conservative when uncertain (HOLD is OK)

RANKING SYSTEM:
- 1st place = 5 points (best strategy)
- 2nd place = 4 points
- 3rd place = 3 points
- 4th place = 2 points
- 5th place = 1 point (worst strategy)

You MUST rank ALL 5 proposals, including your own.
Be objective - don't just vote for yourself.

OUTPUT FORMAT:
Return valid JSON:
{
  "rankings": [
    {
      "modelName": "OpenAI" | "Grok" | "Gemini" | "Kimi" | "DeepSeek",
      "rank": 1-5,
      "reasoning": "Why you ranked this proposal here"
    },
    ...5 total rankings
  ],
  "reasoning": "Overall voting rationale"
}

Each proposal must get a unique rank (1, 2, 3, 4, 5).
Provide clear reasoning for your rankings.`;
}

/**
 * User prompt for voting phase with all proposals
 */
export function getVoteUserPrompt(proposals: NormalizedDecision[], myModel: ModelName): string {
  const proposalTexts = proposals.map((proposal, index) => {
    const modelName = proposal.modelName;
    const actions = proposal.actions.map(a =>
      `${a.type} ${a.asset || ''} ${a.quantity ? `qty:${a.quantity}` : ''} ${a.price ? `@$${a.price}` : ''}`
    ).join(', ');

    return `
PROPOSAL ${index + 1} - ${modelName}:
Actions: ${actions}
Reasoning: ${proposal.reasoning}
Plan: ${proposal.plan}`;
  }).join('\n');

  return `You are ${myModel}. Review these 5 proposals and rank them from 1st (best) to 5th (worst) for long-term accumulation:
${proposalTexts}

TASK:
Rank all 5 proposals based on:
- Patient, data-driven accumulation strategy
- Smart timing (avoids pumps, buys dips)
- Good use of limit orders
- Appropriate BTC/ADA allocation
- Long-term value maximization

Return your rankings as JSON (see format in system prompt).`;
}
