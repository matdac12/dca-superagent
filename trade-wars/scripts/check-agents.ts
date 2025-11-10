import { Spot } from '@binance/connector';
import * as dotenv from 'dotenv';
import path from 'path';

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
    apiKey: process.env.BINANCE_API_KEY || '',
    secretKey: process.env.BINANCE_SECRET_KEY || ''
  },
  {
    name: 'grok',
    displayName: 'Grok Agent',
    apiKey: process.env.BINANCE_API_KEY || '',
    secretKey: process.env.BINANCE_SECRET_KEY || ''
  },
  {
    name: 'gemini',
    displayName: 'Gemini Agent',
    apiKey: process.env.BINANCE_API_KEY || '',
    secretKey: process.env.BINANCE_SECRET_KEY || ''
  },
  {
    name: 'council',
    displayName: 'Council Agent',
    apiKey: process.env.BINANCE_API_KEY || '',
    secretKey: process.env.BINANCE_SECRET_KEY || ''
  }
];

interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

async function checkAgentBalances() {
  console.log('🔍 Checking all agent balances on Binance Testnet...\n');
  console.log('='.repeat(80));

  for (const agent of agents) {
    try {
      console.log(`\n📊 ${agent.displayName.toUpperCase()}`);
      console.log('-'.repeat(80));

      // Verify API keys are present
      if (!agent.apiKey || !agent.secretKey) {
        console.log(`❌ Missing API keys for ${agent.displayName}`);
        console.log(`   API Key: ${agent.apiKey ? '✓' : '✗'}`);
        console.log(`   Secret Key: ${agent.secretKey ? '✓' : '✗'}`);
        continue;
      }

      // Initialize Binance client for this agent
      const client = new Spot(agent.apiKey, agent.secretKey, {
        baseURL: 'https://testnet.binance.vision'
      });

      // Fetch account info (filter for only USDT, BTC, ADA, ETH)
      const TRACKED_ASSETS = ['USDT', 'BTC', 'ADA', 'ETH'];
      const accountInfo = await client.account();
      const balances: Balance[] = accountInfo.data.balances
        .filter((b: any) => TRACKED_ASSETS.includes(b.asset))
        .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
        .map((b: any) => ({
          asset: b.asset,
          free: parseFloat(b.free),
          locked: parseFloat(b.locked),
          total: parseFloat(b.free) + parseFloat(b.locked)
        }));

      if (balances.length === 0) {
        console.log('⚠️  No balances found (account may be empty)');
        continue;
      }

      // Display balances
      console.log('\n💰 Current Holdings:');
      let totalUsdtValue = 0;
      const usdtBalance = balances.find(b => b.asset === 'USDT');

      for (const balance of balances) {
        if (balance.asset === 'USDT') {
          console.log(`   ${balance.asset.padEnd(10)} ${balance.total.toFixed(2).padStart(15)} (no liquidation needed)`);
          totalUsdtValue += balance.total;
        } else {
          // Fetch current price to estimate USDT value
          try {
            const ticker = await client.tickerPrice(`${balance.asset}USDT`);
            const price = parseFloat(ticker.data.price);
            const usdtValue = balance.total * price;
            totalUsdtValue += usdtValue;
            console.log(`   ${balance.asset.padEnd(10)} ${balance.total.toFixed(8).padStart(15)} (≈ $${usdtValue.toFixed(2)}) → needs liquidation`);
          } catch (error) {
            console.log(`   ${balance.asset.padEnd(10)} ${balance.total.toFixed(8).padStart(15)} (price unavailable)`);
          }
        }
      }

      console.log('\n📈 Summary:');
      console.log(`   Estimated Total Value: $${totalUsdtValue.toFixed(2)} USDT`);
      console.log(`   Current USDT Balance: $${usdtBalance ? usdtBalance.total.toFixed(2) : '0.00'} USDT`);
      console.log(`   Non-USDT Assets: ${balances.filter(b => b.asset !== 'USDT').length}`);

    } catch (error: any) {
      console.log(`❌ Error checking ${agent.displayName}:`, error.message);
      if (error.response?.data) {
        console.log('   API Error:', error.response.data);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Balance check complete!');
  console.log('\n💡 Next steps:');
  console.log('   1. Review the balances above');
  console.log('   2. Run setup-agents.ts to liquidate all non-USDT assets');
  console.log('   3. This will give each agent a clean USDT-only starting balance\n');
}

// Run the check
checkAgentBalances().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
