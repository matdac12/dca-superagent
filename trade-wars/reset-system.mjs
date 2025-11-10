#!/usr/bin/env node
/**
 * System Reset Script
 * - Liquidates all BTC positions (sells to USDT)
 * - Clears trade history
 * - Clears agent plans
 * - Resets counters and baselines
 */

import { Spot } from '@binance/connector';
import { config } from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
config({ path: '.env.local' });

const AGENTS = [
  {
    name: 'openai',
    apiKey: process.env.BINANCE_API_KEY,
    secretKey: process.env.BINANCE_SECRET_KEY,
  },
  {
    name: 'grok',
    apiKey: process.env.BINANCE_API_KEY,
    secretKey: process.env.BINANCE_SECRET_KEY,
  },
  {
    name: 'gemini',
    apiKey: process.env.BINANCE_API_KEY,
    secretKey: process.env.BINANCE_SECRET_KEY,
  },
  {
    name: 'council',
    apiKey: process.env.BINANCE_API_KEY,
    secretKey: process.env.BINANCE_SECRET_KEY,
  },
];

const BINANCE_BASE_URL = process.env.BINANCE_BASE_URL || 'https://testnet.binance.vision';

/**
 * Get account balances for an agent
 */
async function getBalances(client) {
  const response = await client.account();
  return response.data.balances
    .filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
    .map(b => ({
      asset: b.asset,
      free: parseFloat(b.free),
      locked: parseFloat(b.locked),
      total: parseFloat(b.free) + parseFloat(b.locked)
    }));
}

/**
 * Liquidate all BTC to USDT for a single agent
 */
async function liquidateBTC(agent) {
  console.log(`\n📊 Processing ${agent.name.toUpperCase()} agent...`);

  if (!agent.apiKey || !agent.secretKey) {
    console.log(`  ⚠️  Missing credentials for ${agent.name}, skipping...`);
    return;
  }

  try {
    const client = new Spot(agent.apiKey, agent.secretKey, {
      baseURL: BINANCE_BASE_URL
    });

    // Get current balances
    const balances = await getBalances(client);
    const btcBalance = balances.find(b => b.asset === 'BTC');
    const usdtBalance = balances.find(b => b.asset === 'USDT');

    console.log(`  Current balances:`);
    if (btcBalance) {
      console.log(`    BTC: ${btcBalance.free.toFixed(8)} (locked: ${btcBalance.locked.toFixed(8)})`);
    }
    if (usdtBalance) {
      console.log(`    USDT: ${usdtBalance.free.toFixed(2)} (locked: ${usdtBalance.locked.toFixed(2)})`);
    }

    // Check if there's BTC to liquidate
    if (!btcBalance || btcBalance.free === 0) {
      console.log(`  ✅ No BTC to liquidate`);
      return;
    }

    // Get current BTC price
    const ticker = await client.tickerPrice('BTCUSDT');
    const btcPrice = parseFloat(ticker.data.price);
    console.log(`  Current BTC price: $${btcPrice.toFixed(2)}`);

    // Calculate quantity to sell (use free balance only)
    const quantityToSell = btcBalance.free;

    if (quantityToSell < 0.00001) {
      console.log(`  ⚠️  BTC amount too small to sell (${quantityToSell.toFixed(8)})`);
      return;
    }

    // Place market sell order
    console.log(`  💰 Selling ${quantityToSell.toFixed(8)} BTC...`);
    const order = await client.newOrder('BTCUSDT', 'SELL', 'MARKET', {
      quantity: quantityToSell.toFixed(8)
    });

    console.log(`  ✅ Sold successfully! Order ID: ${order.data.orderId}`);
    console.log(`     Executed qty: ${order.data.executedQty}`);
    console.log(`     Cumulative quote qty: ${order.data.cummulativeQuoteQty} USDT`);

    // Get updated balances
    const newBalances = await getBalances(client);
    const newUsdtBalance = newBalances.find(b => b.asset === 'USDT');
    console.log(`  📈 New USDT balance: ${newUsdtBalance?.total.toFixed(2) || '0.00'}`);

  } catch (error) {
    console.error(`  ❌ Error processing ${agent.name}:`, error.message);
    if (error.response?.data) {
      console.error(`     API Error:`, error.response.data);
    }
  }
}

/**
 * Clear all data files
 */
async function clearDataFiles() {
  console.log('\n🗑️  Clearing data files...');

  const dataDir = path.join(__dirname, 'data');

  try {
    // Clear trade history
    const tradeHistoryPath = path.join(dataDir, 'trade-history.json');
    await fs.writeFile(tradeHistoryPath, JSON.stringify([], null, 2));
    console.log('  ✅ Cleared trade-history.json');

    // Clear agent plans
    const agentPlansDir = path.join(dataDir, 'agent-plans');
    const planFiles = await fs.readdir(agentPlansDir);
    for (const file of planFiles) {
      if (file.endsWith('.json')) {
        await fs.unlink(path.join(agentPlansDir, file));
        console.log(`  ✅ Deleted ${file}`);
      }
    }

    // Reset daily order cap
    const dailyCapPath = path.join(dataDir, 'daily-order-cap.json');
    await fs.writeFile(dailyCapPath, JSON.stringify({ date: new Date().toISOString().split('T')[0], count: 0 }, null, 2));
    console.log('  ✅ Reset daily-order-cap.json');

    // Reset agent baselines
    const baselinesPath = path.join(dataDir, 'agent-baselines.json');
    await fs.writeFile(baselinesPath, JSON.stringify({}, null, 2));
    console.log('  ✅ Reset agent-baselines.json');

  } catch (error) {
    console.error('  ❌ Error clearing data files:', error.message);
  }
}

/**
 * Main reset process
 */
async function main() {
  console.log('🔄 SYSTEM RESET STARTING...');
  console.log('═══════════════════════════════════════════');

  // Step 1: Liquidate all BTC positions
  console.log('\n📦 STEP 1: Liquidating BTC positions');
  console.log('───────────────────────────────────────────');
  for (const agent of AGENTS) {
    await liquidateBTC(agent);
  }

  // Step 2: Clear all data files
  console.log('\n📦 STEP 2: Clearing data files');
  console.log('───────────────────────────────────────────');
  await clearDataFiles();

  console.log('\n═══════════════════════════════════════════');
  console.log('✅ SYSTEM RESET COMPLETE!');
  console.log('   All agents now have USDT only');
  console.log('   Trade history cleared');
  console.log('   Agent plans cleared');
  console.log('   Ready to start fresh trading!');
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
