import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

// Create OpenRouter client
const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    'HTTP-Referer': 'https://tradewarriors.dev',
    'X-Title': 'TradeWarriors',
  },
});

// ProposalSchema matching the council system
const ProposalSchema = z.object({
  actions: z.array(z.object({
    type: z.enum(['PLACE_LIMIT_BUY', 'PLACE_LIMIT_SELL', 'PLACE_MARKET_BUY', 'PLACE_MARKET_SELL', 'CANCEL_ORDER', 'HOLD']),
    asset: z.string().optional(),
    quantity: z.number().optional(),
    price: z.number().optional(),
    orderId: z.string().optional(),
    reasoning: z.string(),
  })).min(1),
  plan: z.string(),
  reasoning: z.string(),
});

// Realistic market context
const ctx = {
  usdtBalance: 10000.00,
  btcBalance: 0.05,
  adaBalance: 500.00,
  btcPrice: 102000.00,
  adaPrice: 0.92,
  portfolioValueUSD: 15560.00,
  MIN_ORDER_VALUE_USD: 10,
  btcPriceChangePercent: 1.83,
  adaPriceChangePercent: -2.15,
  btcIndicators: `RSI (14): 39.89 [neutral]
MACD: -1245.32 [bearish momentum]
Bollinger Bands: Price near middle band (±2σ: $98500 - $105500)
ATR (14): $3538.12 [high volatility]
Signal: Neutral accumulation opportunity`,
  adaIndicators: `RSI (14): 59.98 [neutral-overbought]
MACD: 0.0142 [bullish momentum]
Bollinger Bands: Price in upper half (±2σ: $0.85 - $0.99)
ATR (14): $0.045 [moderate volatility]
Signal: Recent strength, monitor for pullback`,
  btcOrderBook: 'Bid-Ask Spread: 0.01% ($10). Bid depth to -1%: $2.5M. Ask depth to +1%: $2.8M.',
  adaOrderBook: 'Bid-Ask Spread: 0.11% ($0.001). Bid depth to -1%: $180K. Ask depth to +1%: $195K.',
  tradeHistoryEntries: [
    '[2025-11-07 18:30] BUY 0.01 BTC @ $101,500 (LIMIT) - Entry on dip',
    '[2025-11-05 14:20] BUY 200 ADA @ $0.88 (LIMIT) - Oversold bounce',
  ],
  tradeHistorySummary: '2 accumulation entries in last 7 days. Total invested: $1,192.',
  marketNewsFormatted: `📰 BTC institutional buying continues. Fed maintaining rates. ADA ecosystem update expected Q1 2026.`,
};

const modelName = 'Kimi';

// Build system prompt
const systemPrompt = `You are ${modelName}, participating in a 5-model AI council making long-term BTC/ADA accumulation decisions.

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

// Build user prompt
const userPrompt = `MARKET INTELLIGENCE - COUNCIL ACCUMULATION STRATEGY

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

=== OPEN ORDERS ===
No open orders.

=== MARKET NEWS & SENTIMENT ===
${ctx.marketNewsFormatted}

TASK:
Propose your accumulation strategy:
1. Analyze BOTH BTC and ADA market conditions
2. Decide capital deployment (0-100% of USDT)
3. Decide allocation (BTC only, ADA only, or split)
4. Choose order types (LIMIT preferred, MARKET for exceptional cases)
5. Justify with specific data (RSI, price changes, accumulation signals)

Remember: Default to HOLD if no good entry - patience beats impulsive buying.`;

console.log('🧪 Testing Kimi with FULL council context...\\n');
console.log('📝 Model: moonshotai/kimi-k2-thinking');
console.log('📊 Market Data: BTC $102k (+1.83%), ADA $0.92 (-2.15%)');
console.log('💰 Portfolio: $15,560 (USDT: $10k, BTC: 0.05, ADA: 500)');
console.log('⏳ Expected: 30-60 seconds (thinking model)\\n');

try {
  const startTime = Date.now();

  const result = await generateObject({
    model: openrouter('moonshotai/kimi-k2-thinking'),
    schema: ProposalSchema,
    prompt: `${systemPrompt}\n\n${userPrompt}`,
    temperature: 0.0,
  });

  const elapsed = Date.now() - startTime;

  console.log('✅ SUCCESS!\\n');
  console.log('⏱️  Response time:', elapsed, 'ms', `(${(elapsed / 1000).toFixed(1)}s)\\n`);
  console.log('📊 Response object:');
  console.log(JSON.stringify(result.object, null, 2));
  console.log('\\n📈 Usage:', result.usage);
  console.log('\\n✨ Proposal Summary:');
  console.log('   Actions:', result.object.actions.length);
  console.log('   Primary Action:', result.object.actions[0]?.type);
  console.log('   Asset:', result.object.actions[0]?.asset);
  console.log('   Plan length:', result.object.plan.length, 'chars');

} catch (error) {
  console.error('❌ ERROR:', error.message);
  console.error('\\n🔍 Error details:', error);
  if (error.cause) {
    console.error('\\n🔍 Cause:', error.cause);
  }
  if (error.response) {
    console.error('\\n🔍 Response:', error.response);
  }
}
