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

// Simple test schema
const TestSchema = z.object({
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

console.log('🧪 Testing OpenAI via OpenRouter (openai/gpt-5-mini)...\n');

try {
  const result = await generateObject({
    model: openrouter('openai/gpt-5-mini'),
    schema: TestSchema,
    prompt: `You are a BTC trading agent. Current portfolio: 10000 USDT, 0.1 BTC. BTC price: $102000.

Generate a trading decision with:
- actions array (at least 1 action)
- plan string
- reasoning string

Recommend a conservative strategy.`,
    temperature: 0.0,
  });

  console.log('✅ SUCCESS!\n');
  console.log('📊 Response object:');
  console.log(JSON.stringify(result.object, null, 2));
  console.log('\n📈 Usage:', result.usage);

} catch (error) {
  console.error('❌ ERROR:', error.message);
  console.error('\n🔍 Error details:', error);
  if (error.cause) {
    console.error('\n🔍 Cause:', error.cause);
  }
  if (error.response) {
    console.error('\n🔍 Response:', error.response);
  }
}
