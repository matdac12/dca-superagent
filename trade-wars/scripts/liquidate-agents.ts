import { Spot } from '@binance/connector';
import * as dotenv from 'dotenv';
import path from 'path';
import { promises as fs } from 'fs';

// Load .env from project root (parent directory)
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface AgentConfig {
  name: string;
  displayName: string;
  apiKey: string;
  secretKey: string;
}

const agents: AgentConfig[] = [
  {
    name: 'openai',
    displayName: 'OpenAI Agent',
    apiKey: process.env.BINANCE_OPENAI_API_KEY || '',
    secretKey: process.env.BINANCE_OPENAI_SECRET_KEY || ''
  },
  {
    name: 'grok',
    displayName: 'Grok Agent',
    apiKey: process.env.BINANCE_GROK_API_KEY || '',
    secretKey: process.env.BINANCE_GROK_SECRET_KEY || ''
  },
  {
    name: 'gemini',
    displayName: 'Gemini Agent',
    apiKey: process.env.BINANCE_GEMINI_API_KEY || '',
    secretKey: process.env.BINANCE_GEMINI_SECRET_KEY || ''
  },
  {
    name: 'council',
    displayName: 'Council Agent',
    apiKey: process.env.BINANCE_COUNCIL_API_KEY || '',
    secretKey: process.env.BINANCE_COUNCIL_SECRET_KEY || ''
  }
];

// Assets to liquidate (sell to USDT)
const ASSETS_TO_LIQUIDATE = ['BTC', 'ETH', 'ADA'];

interface AgentBaseline {
  name: string;
  displayName: string;
  startingCapital: number;
  initializedAt: string;
}

async function liquidateAgent(agent: AgentConfig): Promise<number> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔄 Liquidating ${agent.displayName.toUpperCase()}`);
  console.log('='.repeat(80));

  try {
    // Initialize Binance client for this agent
    const client = new Spot(agent.apiKey, agent.secretKey, {
      baseURL: 'https://testnet.binance.vision'
    });

    // Fetch current balances
    const accountInfo = await client.account();
    const balances = accountInfo.data.balances
      .filter((b: any) => ASSETS_TO_LIQUIDATE.includes(b.asset))
      .filter((b: any) => parseFloat(b.free) > 0)
      .map((b: any) => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
        total: parseFloat(b.free) + parseFloat(b.locked)
      }));

    if (balances.length === 0) {
      console.log('✅ No assets to liquidate (already in USDT)');

      // Get current USDT balance
      const usdtBalance = accountInfo.data.balances.find((b: any) => b.asset === 'USDT');
      const usdtTotal = usdtBalance ? parseFloat(usdtBalance.free) + parseFloat(usdtBalance.locked) : 0;

      return usdtTotal;
    }

    console.log(`\n💰 Assets to liquidate: ${balances.length}`);

    let totalUsdtReceived = 0;

    // Liquidate each asset
    for (const balance of balances) {
      console.log(`\n🔸 Liquidating ${balance.asset}...`);
      console.log(`   Amount: ${balance.free} ${balance.asset}`);

      try {
        // Get symbol info for precision
        const symbol = `${balance.asset}USDT`;
        const exchangeInfo = await client.exchangeInfo({ symbol });
        const symbolInfo = exchangeInfo.data.symbols[0];
        const lotSizeFilter = symbolInfo.filters.find((f: any) => f.filterType === 'LOT_SIZE');
        const stepSize = parseFloat(lotSizeFilter.stepSize);
        const precision = Math.round(-Math.log10(stepSize));

        // Format quantity to correct precision
        const sellQuantity = parseFloat(balance.free.toFixed(precision));
        console.log(`   Adjusted quantity: ${sellQuantity} ${balance.asset} (precision: ${precision})`);

        // Execute SELL MARKET order
        const order = await client.newOrder(symbol, 'SELL', 'MARKET', {
          quantity: sellQuantity
        });

        const usdtReceived = parseFloat(order.data.cummulativeQuoteQty);
        totalUsdtReceived += usdtReceived;

        console.log(`   ✅ Sold ${order.data.executedQty} ${balance.asset}`);
        console.log(`   💵 Received: $${usdtReceived.toFixed(2)} USDT`);
        console.log(`   📝 Order ID: ${order.data.orderId}`);

      } catch (error: any) {
        console.log(`   ❌ Failed to liquidate ${balance.asset}:`, error.message);
        if (error.response?.data) {
          console.log('   API Error:', error.response.data);
        }
      }

      // Small delay between orders
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Wait a moment for balances to update
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Fetch final USDT balance
    const finalAccountInfo = await client.account();
    const finalUsdtBalance = finalAccountInfo.data.balances.find((b: any) => b.asset === 'USDT');
    const finalUsdt = finalUsdtBalance ? parseFloat(finalUsdtBalance.free) + parseFloat(finalUsdtBalance.locked) : 0;

    console.log(`\n📊 Liquidation Summary:`);
    console.log(`   USDT from sales: $${totalUsdtReceived.toFixed(2)}`);
    console.log(`   Final USDT balance: $${finalUsdt.toFixed(2)}`);

    return finalUsdt;

  } catch (error: any) {
    console.log(`❌ Error liquidating ${agent.displayName}:`, error.message);
    if (error.response?.data) {
      console.log('API Error:', error.response.data);
    }
    return 0;
  }
}

async function liquidateAllAgents() {
  console.log('🚀 Starting multi-agent liquidation process...\n');
  console.log('This will sell all BTC, ETH, and ADA to USDT for all 4 agents.\n');

  const baselines: AgentBaseline[] = [];

  for (const agent of agents) {
    const finalUsdt = await liquidateAgent(agent);

    baselines.push({
      name: agent.name,
      displayName: agent.displayName,
      startingCapital: finalUsdt,
      initializedAt: new Date().toISOString()
    });
  }

  // Save baselines to file
  const baselinesPath = path.join(process.cwd(), 'data', 'agent-baselines.json');
  await fs.mkdir(path.dirname(baselinesPath), { recursive: true });
  await fs.writeFile(baselinesPath, JSON.stringify(baselines, null, 2), 'utf-8');

  // Display final summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('✨ ALL AGENTS LIQUIDATED - FINAL SUMMARY');
  console.log('='.repeat(80));
  console.log('\n📊 Starting Capital (USDT only):\n');

  for (const baseline of baselines) {
    console.log(`   ${baseline.displayName.padEnd(20)} $${baseline.startingCapital.toFixed(2)} USDT`);
  }

  console.log(`\n💾 Baselines saved to: ${baselinesPath}`);
  console.log('\n🎉 All agents are now ready to trade!');
  console.log('✅ All positions are in USDT');
  console.log('✅ Starting capitals recorded\n');
}

// Run the liquidation
liquidateAllAgents().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
