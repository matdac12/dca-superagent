import dotenv from 'dotenv';
import { Spot } from '@binance/connector';

// Load .env.local from parent directory
dotenv.config({ path: './.env.local' });

const client = new Spot(
  process.env.BINANCE_API_KEY,
  process.env.BINANCE_SECRET_KEY,
  { baseURL: process.env.BINANCE_BASE_URL }
);

console.log('============================================================');
console.log('LIQUIDATE BTC ONLY');
console.log('============================================================\n');

try {
  // Get account balances
  const accountInfo = await client.account();
  const balances = accountInfo.data.balances
    .filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
    .map(b => ({
      asset: b.asset,
      free: parseFloat(b.free),
      locked: parseFloat(b.locked),
      total: parseFloat(b.free) + parseFloat(b.locked)
    }));

  const btcBalance = balances.find(b => b.asset === 'BTC');

  if (!btcBalance || btcBalance.free === 0) {
    console.log('❌ No BTC balance to liquidate');
    process.exit(0);
  }

  console.log(`📊 Current BTC Balance: ${btcBalance.free} BTC (free) + ${btcBalance.locked} BTC (locked)\n`);

  // Get BTC price
  const ticker = await client.tickerPrice('BTCUSDT');
  const btcPrice = parseFloat(ticker.data.price);
  console.log(`💰 Current BTC Price: $${btcPrice.toFixed(2)}\n`);

  // Sell all free BTC
  if (btcBalance.free > 0) {
    console.log(`Selling ${btcBalance.free} BTC...`);
    const sellOrder = await client.newOrder('BTCUSDT', 'SELL', 'MARKET', {
      quantity: btcBalance.free
    });

    const executedQty = parseFloat(sellOrder.data.executedQty);
    const usdtReceived = parseFloat(sellOrder.data.cummulativeQuoteQty);
    const avgPrice = usdtReceived / executedQty;

    console.log(`✓ Sold ${executedQty} BTC @ $${avgPrice.toFixed(2)}`);
    console.log(`✓ Received ${usdtReceived.toFixed(2)} USDT\n`);
  }

  // Get updated balances
  const updatedAccountInfo = await client.account();
  const updatedBalances = updatedAccountInfo.data.balances
    .filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
    .map(b => ({
      asset: b.asset,
      free: parseFloat(b.free),
      locked: parseFloat(b.locked),
      total: parseFloat(b.free) + parseFloat(b.locked)
    }));

  const usdtBalance = updatedBalances.find(b => b.asset === 'USDT');
  const remainingBtc = updatedBalances.find(b => b.asset === 'BTC');

  console.log('============================================================');
  console.log('FINAL BALANCES');
  console.log('============================================================');
  console.log(`USDT: ${usdtBalance?.total.toFixed(2) || 0} (free: ${usdtBalance?.free.toFixed(2) || 0})`);
  console.log(`BTC: ${remainingBtc?.total || 0} (locked: ${remainingBtc?.locked || 0})`);

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
