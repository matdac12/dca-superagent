#!/usr/bin/env node

/**
 * Comprehensive Adapter Test Suite
 * Tests OpenAI (Responses API), Grok (xAI API), Gemini (OpenRouter API)
 * Then runs a full council debate
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.local') });

const BASE_URL = 'http://localhost:3000';

// Helper function to make API calls
async function testEndpoint(name, endpoint) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TESTING: ${name}`);
  console.log('='.repeat(60));
  console.log(`Endpoint: POST ${endpoint}`);

  const startTime = Date.now();

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\n❌ ${name} FAILED (HTTP ${response.status}) - ${duration}ms`);
      console.error('Error:', errorText.substring(0, 500));
      return { success: false, duration, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    console.log(`\n✅ ${name} SUCCESS - ${duration}ms`);

    // Extract decision info
    const action = data.decision?.actions?.[0]?.type || data.decision?.action || 'UNKNOWN';
    const reasoning = data.decision?.reasoning?.substring(0, 150) || 'N/A';

    console.log(`Action: ${action}`);
    console.log(`Reasoning: ${reasoning}...`);

    if (data.portfolio) {
      console.log(`Portfolio: $${data.portfolio.valueBefore.toFixed(2)} → $${data.portfolio.valueAfter.toFixed(2)}`);
      console.log(`P&L: ${data.portfolio.pnl >= 0 ? '+' : ''}$${data.portfolio.pnl.toFixed(2)}`);
    }

    return { success: true, duration, action, data };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ ${name} ERROR - ${duration}ms`);
    console.error('Exception:', error.message);
    return { success: false, duration, error: error.message };
  }
}

async function main() {
  console.log('\n' + '█'.repeat(60));
  console.log('TRADE WARRIORS - ADAPTER TEST SUITE');
  console.log('█'.repeat(60));
  console.log(`\nBase URL: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  const results = [];

  // Test 1: OpenAI (Responses API)
  const openaiResult = await testEndpoint(
    '1️⃣  OpenAI (gpt-5-nano) - Responses API',
    '/api/trading-agent'
  );
  results.push({ name: 'OpenAI', ...openaiResult });

  // Wait 2s between tests
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Grok (xAI API)
  const grokResult = await testEndpoint(
    '2️⃣  Grok (grok-4-fast) - xAI API',
    '/api/trading-agent-grok'
  );
  results.push({ name: 'Grok', ...grokResult });

  // Wait 2s between tests
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Gemini (OpenRouter API)
  const geminiResult = await testEndpoint(
    '3️⃣  Gemini (gemini-2.5-flash) - OpenRouter API',
    '/api/trading-agent-gemini'
  );
  results.push({ name: 'Gemini', ...geminiResult });

  // Wait 2s before council test
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 4: Full Council Debate (all 3 models)
  const councilResult = await testEndpoint(
    '4️⃣  Council Debate (all 3 models)',
    '/api/trading-agent-council'
  );
  results.push({ name: 'Council', ...councilResult });

  // Display council-specific info
  if (councilResult.success && councilResult.data?.meta) {
    const meta = councilResult.data.meta;
    console.log(`\n📊 Council Details:`);
    console.log(`  Selected Model: ${meta.selectedModel || 'N/A'}`);
    console.log(`  Consensus: ${meta.consensusType || 'N/A'}`);
    console.log(`  Models Participating: ${meta.individualProposals?.length || 0}/3`);

    if (meta.individualProposals && meta.individualProposals.length > 0) {
      console.log(`\n  Individual Proposals:`);
      meta.individualProposals.forEach((prop, idx) => {
        const modelName = prop.model?.includes('gpt') ? 'OpenAI'
          : prop.model?.includes('grok') ? 'Grok'
          : prop.model?.includes('gemini') ? 'Gemini'
          : prop.model || 'Unknown';
        const actionType = prop.actions?.[0]?.type || prop.action || 'UNKNOWN';
        console.log(`    ${idx + 1}. ${modelName}: ${actionType}`);
      });
    }
  }

  // Summary Table
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log('\n| Test       | Status | Duration | Action           |');
  console.log('|------------|--------|----------|------------------|');

  results.forEach(r => {
    const status = r.success ? '✅ PASS' : '❌ FAIL';
    const duration = `${r.duration}ms`.padEnd(8);
    const action = (r.action || r.error || 'N/A').substring(0, 16).padEnd(16);
    console.log(`| ${r.name.padEnd(10)} | ${status}  | ${duration} | ${action} |`);
  });

  const passCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`FINAL RESULT: ${passCount}/${totalCount} tests passed`);
  console.log('='.repeat(60));

  if (passCount === totalCount) {
    console.log('\n🎉 All tests passed! All adapters working correctly.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.\n');
    process.exit(1);
  }
}

main();
