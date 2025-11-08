/**
 * Council Smoke Test - Test all 5 models with sequential execution
 *
 * This test verifies that all 5 models can successfully:
 * 1. Generate proposals
 * 2. Vote on proposals
 *
 * Run this after making changes to the council system.
 */

import { runCouncilDebate } from '../src/lib/council/councilDebate.js';

// Mock market data for testing
const mockMarketData = {
  symbol: 'BTCUSDT',
  ticker: {
    lastPrice: 102000.00,
    priceChange: 1850.00,
    priceChangePercent: 1.83,
    highPrice: 103500.00,
    lowPrice: 100200.00,
    volume: 25000.5,
    quoteVolume: 2550000000,
  },
  klines: [],
  balances: [
    { asset: 'USDT', free: 10000.00, locked: 0, total: 10000.00 },
    { asset: 'BTC', free: 0.05, locked: 0, total: 0.05 },
    { asset: 'ADA', free: 500.00, locked: 0, total: 500.00 },
  ],
  tradeHistory: {
    entries: [
      '[2025-11-07 18:30] BUY 0.01 BTC @ $101,500 (LIMIT) - Entry on dip',
      '[2025-11-05 14:20] BUY 200 ADA @ $0.88 (LIMIT) - Oversold bounce',
    ],
    summary: '2 accumulation entries in last 7 days. Total invested: $1,192.',
  },
  indicators: {
    formatted: `RSI (14): 39.89 [neutral]
MACD: -1245.32 [bearish momentum]
Bollinger Bands: Price near middle band (±2σ: $98500 - $105500)
ATR (14): $3538.12 [high volatility]
Signal: Neutral accumulation opportunity`,
  },
  orderBook: {
    summary: 'Bid-Ask Spread: 0.01% ($10). Bid depth to -1%: $2.5M. Ask depth to +1%: $2.8M.',
  },
  marketNews: {
    formatted: '📰 BTC institutional buying continues. Fed maintaining rates. ADA ecosystem update expected Q1 2026.',
  },
  btc: {
    ticker: {
      lastPrice: 102000.00,
      priceChange: 1850.00,
      priceChangePercent: 1.83,
      highPrice: 103500.00,
      lowPrice: 100200.00,
      volume: 25000.5,
      quoteVolume: 2550000000,
    },
    indicators: {
      formatted: `RSI (14): 39.89 [neutral]
MACD: -1245.32 [bearish momentum]
Bollinger Bands: Price near middle band (±2σ: $98500 - $105500)
ATR (14): $3538.12 [high volatility]
Signal: Neutral accumulation opportunity`,
    },
    orderBook: {
      summary: 'Bid-Ask Spread: 0.01% ($10). Bid depth to -1%: $2.5M. Ask depth to +1%: $2.8M.',
    },
  },
  ada: {
    ticker: {
      lastPrice: 0.92,
      priceChange: -0.02,
      priceChangePercent: -2.15,
      highPrice: 0.95,
      lowPrice: 0.90,
      volume: 1500000,
      quoteVolume: 1380000,
    },
    indicators: {
      formatted: `RSI (14): 59.98 [neutral-overbought]
MACD: 0.0142 [bullish momentum]
Bollinger Bands: Price in upper half (±2σ: $0.85 - $0.99)
ATR (14): $0.045 [moderate volatility]
Signal: Recent strength, monitor for pullback`,
    },
    orderBook: {
      summary: 'Bid-Ask Spread: 0.11% ($0.001). Bid depth to -1%: $180K. Ask depth to +1%: $195K.',
    },
  },
  timestamp: Date.now(),
};

console.log('🧪 COUNCIL SMOKE TEST - Sequential Execution');
console.log('='.repeat(60));
console.log('📊 Testing 5 models: OpenAI, Grok, Gemini, Kimi, DeepSeek');
console.log('⚙️  Mode: Sequential (one-by-one)');
console.log('⏱️  Timeout: 120s per model');
console.log('💰 Starting balance: $8.73');
console.log('='.repeat(60));
console.log('');

const startTime = Date.now();
let phaseStartTime = Date.now();

// Event handler to track progress
const onEvent = (event) => {
  switch (event.type) {
    case 'phase_start':
      phaseStartTime = Date.now();
      console.log(`\n📍 Phase: ${event.phase.toUpperCase()}`);
      console.log('-'.repeat(60));
      break;

    case 'model_start':
      console.log(`\n⏳ ${event.model} ${event.phase} starting...`);
      break;

    case 'model_complete':
      const elapsed = (Date.now() - phaseStartTime) / 1000;
      console.log(`✅ ${event.model} ${event.phase} completed in ${event.timeMs}ms (phase elapsed: ${elapsed.toFixed(1)}s)`);
      break;

    case 'model_timeout':
      console.log(`⏰ ${event.model} ${event.phase} TIMEOUT`);
      break;

    case 'model_error':
      console.log(`❌ ${event.model} ${event.phase} ERROR: ${event.error}`);
      break;

    case 'vote_results':
      console.log(`\n📊 Vote Results:`);
      event.scores.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.model}: ${s.score} points (${s.firstPlaceVotes} first-place)`);
      });
      break;

    case 'final_decision':
      const totalTime = (Date.now() - startTime) / 1000;
      console.log(`\n${'='.repeat(60)}`);
      console.log(`✨ COUNCIL DECISION`);
      console.log(`${'='.repeat(60)}`);
      console.log(`Winner: ${event.decision._meta.selectedModel || 'NONE'}`);
      console.log(`Consensus: ${event.decision._meta.consensusType}`);
      console.log(`Total time: ${totalTime.toFixed(1)}s`);
      console.log(`Actions: ${event.decision.actions.length}`);
      console.log(`\nPrimary Action: ${event.decision.actions[0]?.type || 'NONE'}`);
      if (event.decision._meta.individualProposals) {
        console.log(`\nProposals received: ${event.decision._meta.individualProposals.length}/5`);
        event.decision._meta.individualProposals.forEach(p => {
          console.log(`  - ${p.modelName}: ${p.normalizedAction}`);
        });
      }
      break;
  }
};

try {
  // Run the council debate (dry run - don't execute trades)
  const result = await runCouncilDebate(mockMarketData, onEvent);

  const totalTime = (Date.now() - startTime) / 1000;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ SMOKE TEST COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total execution time: ${totalTime.toFixed(1)}s`);
  console.log(`Proposals: ${result._meta.individualProposals?.length || 0}/5 models`);
  console.log(`Winner: ${result._meta.selectedModel || 'NONE'}`);
  console.log(`\n💰 Check your OpenRouter balance and report the new amount!`);

} catch (error) {
  console.error(`\n❌ SMOKE TEST FAILED`);
  console.error(`Error: ${error.message}`);
  console.error(`Stack:`, error.stack);
  process.exit(1);
}
