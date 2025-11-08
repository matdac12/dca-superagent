'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import SingleAgentChart from '@/app/components/SingleAgentChart';
import MultiAgentTradeHistory from '@/app/components/MultiAgentTradeHistory';

interface Allocation {
  asset: string;
  balance: number;
  price: number;
  usdValue: number;
  percentage: number;
}

interface AgentStats {
  agent: string;
  displayName: string;
  color: string;
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

export default function AgentAllocationsPage() {
  const router = useRouter();
  const params = useParams();
  const agentName = params.agentName as string;

  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentName) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/agent/${agentName}/stats`);

        if (!response.ok) {
          throw new Error(`Failed to fetch agent stats: ${response.statusText}`);
        }

        const data = await response.json();

        // Calculate percentages for allocations
        const totalValue = data.allocations.reduce((sum: number, a: Allocation) => sum + a.usdValue, 0);
        const allocationsWithPercentage = data.allocations.map((allocation: Allocation) => ({
          ...allocation,
          percentage: totalValue > 0 ? (allocation.usdValue / totalValue) * 100 : 0
        }));

        setStats({
          ...data,
          allocations: allocationsWithPercentage
        });
        setError(null);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch agent stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [agentName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full" />
              <span className="text-gray-600">Loading agent allocations...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="text-blue-600 hover:underline mb-6 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">Error loading allocations</div>
            <div className="text-gray-600">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  const isPositiveROI = stats.performance.roiPercent >= 0;

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          href="/"
          className="text-blue-600 hover:underline mb-6 inline-block"
        >
          ← Back to Dashboard
        </Link>

        {/* Agent Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: stats.color }}
            />
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">
                {stats.displayName}
              </h1>
              <div className="text-sm text-gray-600 mt-1">
                Rank #{stats.ranking.currentRank} of {stats.ranking.totalAgents}
              </div>
            </div>
          </div>

          {/* Performance Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">
                Portfolio Value
              </div>
              <div className="text-xl font-bold font-mono text-gray-900">
                ${stats.performance.currentValue.toFixed(2)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">
                ROI
              </div>
              <div
                className={`text-xl font-bold font-mono ${
                  isPositiveROI ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {isPositiveROI ? '+' : ''}
                {stats.performance.roiPercent.toFixed(2)}%
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">
                P&L
              </div>
              <div
                className={`text-xl font-bold font-mono ${
                  isPositiveROI ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {isPositiveROI ? '+' : ''}${stats.performance.absolutePnL.toFixed(2)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">
                Total Trades
              </div>
              <div className="text-xl font-bold font-mono text-gray-900">
                {stats.trading.totalTrades}
              </div>
            </div>
          </div>
        </div>

        {/* Asset Allocations with Orange Bars */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Asset Allocation</h2>
            <p className="text-sm text-gray-600">
              Holdings sorted by USD value (highest to lowest)
            </p>
          </div>

          {stats.allocations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No active allocations
            </div>
          ) : (
            <div className="space-y-4">
              {stats.allocations.map((allocation) => (
                <div key={allocation.asset} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold text-gray-900">
                        {allocation.asset}
                      </span>
                      <span className="text-gray-600 font-mono">
                        {allocation.balance.toFixed(allocation.asset === 'BTC' ? 8 : 2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-gray-900">
                        ${allocation.usdValue.toFixed(2)}
                      </span>
                      <span className="text-gray-600 min-w-[4rem] text-right">
                        {allocation.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${allocation.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Total Footer */}
          {stats.allocations.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium text-gray-700">
                  Total Portfolio Value
                </div>
                <div className="text-lg font-bold font-mono text-gray-900">
                  ${stats.allocations
                    .reduce((sum, a) => sum + a.usdValue, 0)
                    .toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Portfolio Performance Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Portfolio Performance</h2>
            <p className="text-sm text-gray-600">
              Value over time
            </p>
          </div>
          <SingleAgentChart
            agentName={agentName}
            agentColor={stats.color}
            agentDisplayName={stats.displayName}
          />
        </div>

        {/* Trade History */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Trade History</h2>
            <p className="text-sm text-gray-600">
              Recent trades for this agent
            </p>
          </div>
          <MultiAgentTradeHistory agentFilter={agentName} />
        </div>
      </div>
    </div>
  );
}
