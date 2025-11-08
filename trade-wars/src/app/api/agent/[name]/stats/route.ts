/**
 * Individual Agent Stats API Endpoint
 * Returns detailed statistics for a specific agent
 */

import { NextResponse } from 'next/server';
import { Spot } from '@binance/connector';
import { getAgentConfig, getAllAgents } from '@/config/agents';
import { calculateAgentStats } from '@/lib/agents/agentStats';
import { readTradeHistory } from '@/lib/storage/tradeHistory';

interface Allocation {
  asset: string;
  balance: number;
  price: number;
  usdValue: number;
}

interface AgentStatsResponse {
  agent: string;
  displayName: string;
  color: string;
  balances: {
    usdt: number;
    btc: number;
    ada: number;
  };
  allocations: Allocation[];
  performance: {
    currentValue: number;
    startingCapital: number;
    roiPercent: number;
    absolutePnL: number;
  };
  trading: {
    totalTrades: number;
    lastTradeTime: string | null;
  };
  ranking: {
    currentRank: number;
    totalAgents: 4;
  };
}

const VALID_AGENTS = ['openai', 'grok', 'gemini', 'council'];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: agentName } = await params;

    // Validate agent name
    if (!VALID_AGENTS.includes(agentName)) {
      return NextResponse.json(
        {
          error: `Invalid agent name. Must be one of: ${VALID_AGENTS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    console.log(`📊 Fetching stats for ${agentName} agent...`);

    // Get agent configuration
    const agentConfig = getAgentConfig(agentName);
    if (!agentConfig) {
      return NextResponse.json(
        {
          error: `Agent configuration not found for: ${agentName}`,
        },
        { status: 404 }
      );
    }

    // Calculate agent stats (ROI, P&L, etc.)
    const stats = await calculateAgentStats(agentName);

    // Fetch current balances from Binance
    const client = new Spot(
      agentConfig.binanceApiKey,
      agentConfig.binanceSecretKey,
      { baseURL: process.env.BINANCE_BASE_URL }
    );

    const accountInfo = await client.account();
    const balances = accountInfo.data.balances;

    const usdtBalance = balances.find((b: any) => b.asset === 'USDT');
    const btcBalance = balances.find((b: any) => b.asset === 'BTC');
    const adaBalance = balances.find((b: any) => b.asset === 'ADA');

    // Get last trade time for this agent
    const tradeHistory = await readTradeHistory();
    const agentTrades = tradeHistory.filter(trade => trade.aiModel === agentName);
    const lastTradeTime = agentTrades.length > 0
      ? agentTrades[agentTrades.length - 1].timestamp
      : null;

    // Calculate current rank by comparing with all agents
    const allAgents = getAllAgents();
    const allStatsPromises = allAgents.map(async (agent) => {
      try {
        const agentStats = await calculateAgentStats(agent.name);
        return {
          name: agent.name,
          roiPercent: agentStats.roiPercent,
        };
      } catch (error) {
        return {
          name: agent.name,
          roiPercent: 0,
        };
      }
    });

    const allStats = await Promise.all(allStatsPromises);
    const sortedStats = allStats.sort((a, b) => b.roiPercent - a.roiPercent);
    const currentRank = sortedStats.findIndex(s => s.name === agentName) + 1;

    // Fetch current market prices
    let marketPrices: Record<string, number> = {
      USDT: 1,
      BTC: 0,
      ADA: 0,
    };

    try {
      const marketResponse = await fetch(`${new URL(request.url).origin}/api/market`);
      if (marketResponse.ok) {
        const marketData = await marketResponse.json();
        marketData.data?.forEach((item: any) => {
          if (item.symbol === 'BTCUSDT') {
            marketPrices.BTC = parseFloat(item.price);
          } else if (item.symbol === 'ADAUSDT') {
            marketPrices.ADA = parseFloat(item.price);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to fetch market prices:', error);
    }

    // Calculate allocations with USD values
    const usdtBalance_num = parseFloat(usdtBalance?.free || '0') + parseFloat(usdtBalance?.locked || '0');
    const btcBalance_num = parseFloat(btcBalance?.free || '0') + parseFloat(btcBalance?.locked || '0');
    const adaBalance_num = parseFloat(adaBalance?.free || '0') + parseFloat(adaBalance?.locked || '0');

    const allocations: Allocation[] = [];

    if (usdtBalance_num > 0) {
      allocations.push({
        asset: 'USDT',
        balance: usdtBalance_num,
        price: marketPrices.USDT,
        usdValue: usdtBalance_num * marketPrices.USDT,
      });
    }

    if (btcBalance_num > 0) {
      allocations.push({
        asset: 'BTC',
        balance: btcBalance_num,
        price: marketPrices.BTC,
        usdValue: btcBalance_num * marketPrices.BTC,
      });
    }

    if (adaBalance_num > 0) {
      allocations.push({
        asset: 'ADA',
        balance: adaBalance_num,
        price: marketPrices.ADA,
        usdValue: adaBalance_num * marketPrices.ADA,
      });
    }

    // Sort allocations by USD value descending
    allocations.sort((a, b) => b.usdValue - a.usdValue);

    // Build response
    const response: AgentStatsResponse = {
      agent: agentName,
      displayName: agentConfig.displayName,
      color: agentConfig.color,
      balances: {
        usdt: usdtBalance_num,
        btc: btcBalance_num,
        ada: adaBalance_num,
      },
      allocations,
      performance: {
        currentValue: stats.currentValue,
        startingCapital: stats.startingCapital,
        roiPercent: stats.roiPercent,
        absolutePnL: stats.absolutePnL,
      },
      trading: {
        totalTrades: stats.totalTrades,
        lastTradeTime,
      },
      ranking: {
        currentRank,
        totalAgents: 4,
      },
    };

    console.log(`✓ Stats retrieved for ${agentName}: Rank #${currentRank}, ROI ${stats.roiPercent.toFixed(2)}%`);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ Agent stats error:', error);

    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch agent stats',
      },
      { status: 500 }
    );
  }
}
