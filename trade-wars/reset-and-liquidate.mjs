#!/usr/bin/env node

/**
 * Reset and Liquidate Script
 * 1. Liquidates all non-USDT assets to USDT
 * 2. Resets trade history and other data files
 */

import { Spot } from '@binance/connector';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Binance client setup
const client = new Spot(
  process.env.BINANCE_API_KEY,
  process.env.BINANCE_SECRET_KEY,
  { baseURL: 'https://testnet.binance.vision' }
);

async function getAccountBalances() {
  try {
    const response = await client.account();
    return response.data.balances
      .filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map(b => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
        total: parseFloat(b.free) + parseFloat(b.locked)
      }));
  } catch (error) {
    console.error('Failed to fetch account balances:', error.message);
    throw error;
  }
}

async function getCurrentPrice(symbol) {
  try {
    const response = await client.tickerPrice(symbol);
    return parseFloat(response.data.price);
  } catch (error) {
    console.error(`Failed to fetch price for ${symbol}:`, error.message);
    throw error;
  }
}

async function sellAllToUSDT(balances) {
  const nonUSDTBalances = balances.filter(b => b.asset !== 'USDT' && b.total > 0);

  if (nonUSDTBalances.length === 0) {
    console.log('✓ No non-USDT assets to liquidate');
    return;
  }

  console.log(`\nLiquidating ${nonUSDTBalances.length} asset(s) to USDT...\n`);

  for (const balance of nonUSDTBalances) {
    const symbol = `${balance.asset}USDT`;
    console.log(`Selling ${balance.total} ${balance.asset}...`);

    try {
      const currentPrice = await getCurrentPrice(symbol);
      console.log(`  Current price: $${currentPrice.toFixed(2)}`);

      // Get symbol info for precision
      const exchangeInfo = await client.exchangeInfo({ symbol });
      const symbolInfo = exchangeInfo.data.symbols[0];
      const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
      const stepSize = parseFloat(lotSizeFilter.stepSize);
      const precision = Math.round(-Math.log10(stepSize));

      const formattedQuantity = parseFloat(balance.total.toFixed(precision));

      // Execute market sell
      const order = await client.newOrder(symbol, 'SELL', 'MARKET', {
        quantity: formattedQuantity
      });

      const executedPrice = parseFloat(order.data.fills?.[0]?.price || currentPrice);
      const executedQty = parseFloat(order.data.executedQty);
      const usdtReceived = parseFloat(order.data.cummulativeQuoteQty);

      console.log(`  ✓ Sold ${executedQty} ${balance.asset} @ $${executedPrice.toFixed(2)}`);
      console.log(`  ✓ Received ${usdtReceived.toFixed(2)} USDT\n`);
    } catch (error) {
      console.error(`  ✗ Failed to sell ${balance.asset}:`, error.message);
      console.log('');
    }
  }
}

async function clearDataFiles() {
  console.log('\nClearing data files...\n');

  const dataDir = path.join(__dirname, 'data');
  const filesToClear = [
    'trade-history.json',
    'agent-plans'  // Directory to clear
  ];

  for (const file of filesToClear) {
    const filePath = path.join(dataDir, file);

    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
          // Clear directory contents
          const files = fs.readdirSync(filePath);
          for (const f of files) {
            fs.unlinkSync(path.join(filePath, f));
          }
          console.log(`  ✓ Cleared ${file}/ directory (${files.length} files removed)`);
        } else {
          // Clear file by writing empty array
          fs.writeFileSync(filePath, '[]', 'utf8');
          console.log(`  ✓ Cleared ${file}`);
        }
      } else {
        console.log(`  - ${file} does not exist (skipping)`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to clear ${file}:`, error.message);
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('RESET AND LIQUIDATE SCRIPT');
  console.log('='.repeat(60));

  try {
    // Step 1: Get current balances
    console.log('\n📊 Fetching current account balances...\n');
    const balances = await getAccountBalances();

    console.log('Current Balances:');
    balances.forEach(b => {
      console.log(`  ${b.asset}: ${b.total} (free: ${b.free}, locked: ${b.locked})`);
    });

    // Step 2: Liquidate all non-USDT assets
    await sellAllToUSDT(balances);

    // Step 3: Get final balances
    console.log('📊 Final account balances:\n');
    const finalBalances = await getAccountBalances();
    finalBalances.forEach(b => {
      console.log(`  ${b.asset}: ${b.total}`);
    });

    // Step 4: Clear data files
    await clearDataFiles();

    console.log('\n' + '='.repeat(60));
    console.log('✓ RESET COMPLETE');
    console.log('='.repeat(60));
    console.log('\nAll assets have been liquidated to USDT and history has been cleared.\n');
  } catch (error) {
    console.error('\n❌ Reset failed:', error.message);
    process.exit(1);
  }
}

main();
