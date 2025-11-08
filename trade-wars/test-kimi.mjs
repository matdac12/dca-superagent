import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://tradewarriors.dev",
    "X-Title": "TradeWarriors",
  },
});

console.log('Testing Kimi model...');

try {
  const completion = await client.chat.completions.create({
    model: "moonshotai/kimi-k2-thinking",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Say hello in JSON format with a 'message' field." }
    ],
    response_format: { type: "json_object" },
    temperature: 0.0,
    max_tokens: 100,
  });

  console.log('\n✓ Success! Full response:');
  console.log(JSON.stringify(completion, null, 2));

  console.log('\n✓ Message content:');
  console.log(completion.choices[0].message.content);

} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error('Full error:', error);
}
