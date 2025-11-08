/**
 * Leaderboard API Endpoint
 * Returns ranked performance statistics for all 4 trading agents
 */

import { NextResponse } from 'next/server';
import { getAllAgents } from '@/config/agents';
import { calculateAgentStats } from '@/lib/agents/agentStats';

export interface LeaderboardEntry {
  rank: number;
  agent: string;
  displayName: string;
  color: string;
  roiPercent: number;
  absolutePnL: number;
  currentValue: number;
  startingCapital: number;
  totalTrades: number;
}

export async function GET() {
  try {
    console.log('📊 Calculating leaderboard rankings...');

    // Get all agent configurations
    const agents = getAllAgents();

    // Calculate stats for each agent in parallel
    const statsPromises = agents.map(async (agentConfig) => {
      try {
        const stats = await calculateAgentStats(agentConfig.name);

        return {
          agent: agentConfig.name,
          displayName: agentConfig.displayName,
          color: agentConfig.color,
          ...stats,
        };
      } catch (error: any) {
        console.error(`Error calculating stats for ${agentConfig.name}:`, error.message);

        // Return default values if stats calculation fails
        return {
          agent: agentConfig.name,
          displayName: agentConfig.displayName,
          color: agentConfig.color,
          startingCapital: 124038.33,
          currentValue: 124038.33,
          roiPercent: 0,
          absolutePnL: 0,
          totalTrades: 0,
        };
      }
    });

    const agentStats = await Promise.all(statsPromises);

    // Sort by ROI % descending (highest ROI = rank 1)
    const sortedAgents = agentStats.sort((a, b) => b.roiPercent - a.roiPercent);

    // Assign ranks (1-4)
    const leaderboard: LeaderboardEntry[] = sortedAgents.map((stats, index) => ({
      rank: index + 1,
      agent: stats.agent,
      displayName: stats.displayName,
      color: stats.color,
      roiPercent: stats.roiPercent,
      absolutePnL: stats.absolutePnL,
      currentValue: stats.currentValue,
      startingCapital: stats.startingCapital,
      totalTrades: stats.totalTrades,
    }));

    console.log(`✓ Leaderboard calculated: Winner is ${leaderboard[0].displayName} with ${leaderboard[0].roiPercent.toFixed(2)}% ROI`);

    return NextResponse.json(leaderboard);
  } catch (error: any) {
    console.error('❌ Leaderboard calculation error:', error);

    return NextResponse.json(
      {
        error: error.message || 'Failed to calculate leaderboard',
      },
      { status: 500 }
    );
  }
}
