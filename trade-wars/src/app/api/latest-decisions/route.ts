/**
 * Latest Decisions API Endpoint
 * Returns the most recent trading decision for each of the 4 agents
 */

import { NextResponse } from 'next/server';
import { readTradeHistory } from '@/lib/storage/tradeHistory';
import { getAllAgents } from '@/config/agents';
import { loadPlan } from '@/lib/storage/agentPlans';

interface LatestDecision {
  agent: string;
  displayName: string;
  color: string;
  decision: {
    actions: Array<{
      type: string;
      asset?: string;
      price?: number;
      quantity?: number;
    }>;
    plan: string;
    reasoning: string;
  };
  timestamp: string;
  pnl: number;
  success: boolean;
  error?: string;
}

export async function GET() {
  try {
    console.log('📊 Fetching latest decisions for all agents...');

    // Get all trade history
    const allTrades = await readTradeHistory();

    // Get agent configurations
    const agents = getAllAgents();

    // Get the latest trade for each agent
    const latestDecisions: LatestDecision[] = agents.map(agent => {
      // Filter trades for this agent
      const agentTrades = allTrades.filter(trade => trade.aiModel === agent.name);

      // Sort by timestamp descending (most recent first)
      const sortedTrades = agentTrades.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Get the most recent trade
      const latestTrade = sortedTrades[0];

      if (!latestTrade) {
        // No trades yet for this agent
        return {
          agent: agent.name,
          displayName: agent.displayName,
          color: agent.color,
          decision: {
            actions: [],
            plan: 'No trading activity yet',
            reasoning: 'No trading activity yet',
          },
          timestamp: new Date().toISOString(),
          pnl: 0,
          success: true,
        };
      }

      // Calculate P&L
      const pnl = latestTrade.portfolioValueAfter - latestTrade.portfolioValueBefore;

      // For council, plan is stored separately in agent-plans, not in trade history
      let plan = latestTrade.plan || '';

      return {
        agent: agent.name,
        displayName: agent.displayName,
        color: agent.color,
        decision: {
          actions: latestTrade.decision.actions,
          plan,
          reasoning: latestTrade.decision.reasoning,
        },
        timestamp: latestTrade.timestamp,
        pnl,
        success: latestTrade.success,
        error: latestTrade.error,
      };
    });

    // For council agent, fetch plan from agent-plans storage since it doesn't log to trade history
    const councilIndex = latestDecisions.findIndex(d => d.agent === 'council');
    if (councilIndex !== -1) {
      const councilPlanData = await loadPlan('council').catch(() => null);
      if (councilPlanData?.plan) {
        latestDecisions[councilIndex].decision.plan = councilPlanData.plan;
      }
    }

    console.log(`✓ Retrieved latest decisions for ${latestDecisions.length} agents`);

    return NextResponse.json(latestDecisions);
  } catch (error: any) {
    console.error('❌ Latest decisions error:', error);

    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch latest decisions',
      },
      { status: 500 }
    );
  }
}
