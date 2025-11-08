import { Spot } from '@binance/connector';
import { promises as fs } from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const TRADE_HISTORY_FILE = path.join(process.cwd(), 'data', 'trade-history.json');

async function resetPortfolio() {
  console.log('🔄 Resetting portfolio to start fresh...\n');

  // Initialize Binance client
  const client = new Spot(
    process.env.BINANCE_API_KEY || '',
    process.env.BINANCE_SECRET_KEY || '',
    { baseURL: process.env.BINANCE_BASE_URL }
  );

  try {
    // Step 1: Get current balances
    console.log('📊 Fetching current balances...');
    const accountInfo = await client.account();
    const balances = accountInfo.data.balances
      .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map((b: any) => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
        total: parseFloat(b.free) + parseFloat(b.locked)
      }));

    console.log('\n📋 Current Balances:');
    balances.forEach((b: any) => {
      console.log(`   ${b.asset}: ${b.total.toFixed(8)} (Free: ${b.free.toFixed(8)}, Locked: ${b.locked.toFixed(8)})`);
    });

    // Step 2: Find BTC balance
    const btcBalance = balances.find((b: any) => b.asset === 'BTC');
    const usdtBalance = balances.find((b: any) => b.asset === 'USDT');

    console.log(`\n💰 USDT Balance: ${usdtBalance ? usdtBalance.total.toFixed(2) : '0.00'} USDT`);
    console.log(`💰 BTC Balance: ${btcBalance ? btcBalance.total.toFixed(8) : '0.00000000'} BTC`);

    // Step 3: Sell all BTC if we have any
    if (btcBalance && btcBalance.total > 0) {
      console.log(`\n🔴 Selling ALL BTC (${btcBalance.total.toFixed(8)} BTC)...`);

      // Get current BTC price
      const ticker = await client.tickerPrice('BTCUSDT');
      const currentPrice = parseFloat(ticker.data.price);
      console.log(`   Current BTC price: $${currentPrice.toFixed(2)}`);
      console.log(`   Estimated value: $${(btcBalance.total * currentPrice).toFixed(2)} USDT`);

      // Get symbol info for precision
      const exchangeInfo = await client.exchangeInfo({ symbol: 'BTCUSDT' });
      const symbol = exchangeInfo.data.symbols[0];
      const lotSizeFilter = symbol.filters.find((f: any) => f.filterType === 'LOT_SIZE');
      const stepSize = parseFloat(lotSizeFilter.stepSize);
      const precision = Math.abs(Math.log10(stepSize));

      // Format quantity to correct precision
      const sellQuantity = parseFloat(btcBalance.total.toFixed(precision));
      console.log(`   Adjusted quantity for precision: ${sellQuantity.toFixed(precision)} BTC`);

      // Execute SELL order
      console.log(`\n📤 Executing SELL MARKET order...`);
      const order = await client.newOrder('BTCUSDT', 'SELL', 'MARKET', {
        quantity: sellQuantity
      });

      console.log(`✅ Order executed successfully!`);
      console.log(`   Order ID: ${order.data.orderId}`);
      console.log(`   Executed Qty: ${order.data.executedQty} BTC`);
      console.log(`   Total Value: ${order.data.cummulativeQuoteQty} USDT`);
      console.log(`   Status: ${order.data.status}`);

      // Wait a moment for balance to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fetch updated balances
      const updatedAccountInfo = await client.account();
      const updatedUsdtBalance = updatedAccountInfo.data.balances
        .find((b: any) => b.asset === 'USDT');
      const finalUsdt = parseFloat(updatedUsdtBalance.free) + parseFloat(updatedUsdtBalance.locked);

      console.log(`\n💵 New USDT Balance: ${finalUsdt.toFixed(2)} USDT`);
    } else {
      console.log('\n✅ No BTC to sell. Portfolio already in USDT.');
    }

    // Step 4: Clear trade history
    console.log('\n🗑️  Clearing trade history...');
    await fs.writeFile(TRADE_HISTORY_FILE, JSON.stringify([], null, 2), 'utf-8');
    console.log('✅ Trade history cleared.');

    // Step 5: Show final state
    console.log('\n' + '='.repeat(60));
    console.log('✨ Portfolio Reset Complete!');
    console.log('='.repeat(60));

    const finalAccountInfo = await client.account();
    const finalBalances = finalAccountInfo.data.balances
      .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map((b: any) => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
        total: parseFloat(b.free) + parseFloat(b.locked)
      }));

    console.log('\n📊 Final Balances:');
    finalBalances.forEach((b: any) => {
      console.log(`   ${b.asset}: ${b.total.toFixed(8)}`);
    });

    console.log('\n🎉 Ready to start testing with fresh USDT balance!\n');

  } catch (error: any) {
    console.error('\n❌ Error resetting portfolio:', error.message);
    if (error.response?.data) {
      console.error('API Error:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the reset
resetPortfolio();
