import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://tradewarriors.dev",
    "X-Title": "TradeWarriors",
  },
});

console.log('Testing Kimi with json_schema...\n');

// Test 1: json_schema
console.log('=== Test 1: json_schema ===');
try {
  const completion = await client.chat.completions.create({
    model: "moonshotai/kimi-k2-thinking",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Say hello with your name." }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "greeting",
        strict: true,
        schema: {
          type: "object",
          properties: {
            message: { type: "string" },
            name: { type: "string" }
          },
          required: ["message", "name"],
          additionalProperties: false
        }
      }
    },
    temperature: 0.0,
    max_tokens: 200,
  });

  console.log('✓ json_schema Success!');
  console.log('Content:', completion.choices[0].message.content);
  console.log('Has reasoning:', !!completion.choices[0].message.reasoning);

} catch (error) {
  console.error('❌ json_schema Error:', error.message);
  if (error.response) {
    console.error('Response status:', error.response.status);
    console.error('Response data:', JSON.stringify(error.response.data, null, 2));
  }
}

// Test 2: json_object fallback
console.log('\n=== Test 2: json_object (fallback) ===');
try {
  const completion = await client.chat.completions.create({
    model: "moonshotai/kimi-k2-thinking",
    messages: [
      { role: "system", content: "You are a helpful assistant. Always respond with valid JSON matching this schema: {message: string, name: string}" },
      { role: "user", content: "Say hello with your name." }
    ],
    response_format: { type: "json_object" },
    temperature: 0.0,
    max_tokens: 200,
  });

  console.log('✓ json_object Success!');
  console.log('Content:', completion.choices[0].message.content);
  console.log('Has reasoning:', !!completion.choices[0].message.reasoning);

} catch (error) {
  console.error('❌ json_object Error:', error.message);
}
