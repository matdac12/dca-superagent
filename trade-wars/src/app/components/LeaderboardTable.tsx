'use client';

import { useRouter } from 'next/navigation';

/**
 * Leaderboard Table Component
 * Displays ranked performance of all 4 trading agents
 */

interface LeaderboardEntry {
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

interface LeaderboardTableProps {
  data: LeaderboardEntry[];
}

export default function LeaderboardTable({ data }: LeaderboardTableProps) {
  const router = useRouter();

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No leaderboard data available
      </div>
    );
  }

  const handleRowClick = (agentName: string) => {
    router.push(`/agent/${agentName}`);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Rank
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Agent
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              ROI %
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              P&L
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Current Value
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Trades
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {data.map((entry) => {
            const isWinner = entry.rank === 1;
            const isPositive = entry.roiPercent >= 0;

            return (
              <tr
                key={entry.agent}
                onClick={() => handleRowClick(entry.agent)}
                className={`
                  cursor-pointer hover:bg-blue-50 transition-colors
                  ${isWinner ? 'bg-yellow-50 border-l-4 border-l-yellow-500' : 'border-l-4 border-l-transparent'}
                `}
              >
                {/* Rank */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span
                      className={`
                        text-lg font-bold font-mono
                        ${isWinner ? 'text-yellow-600' : ''}
                      `}
                    >
                      #{entry.rank}
                    </span>
                  </div>
                </td>

                {/* Agent Name with colored dot */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm font-medium">
                      {entry.displayName}
                    </span>
                  </div>
                </td>

                {/* ROI % */}
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <span
                    className={`
                      text-sm font-bold font-mono
                      ${isPositive ? 'text-green-600' : 'text-red-600'}
                    `}
                  >
                    {isPositive ? '+' : ''}
                    {entry.roiPercent.toFixed(2)}%
                  </span>
                </td>

                {/* P&L */}
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <span
                    className={`
                      text-sm font-mono
                      ${isPositive ? 'text-green-600' : 'text-red-600'}
                    `}
                  >
                    {isPositive ? '+' : ''}${entry.absolutePnL.toFixed(2)}
                  </span>
                </td>

                {/* Current Value */}
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <span className="text-sm font-mono">
                    ${entry.currentValue.toFixed(2)}
                  </span>
                </td>

                {/* Total Trades */}
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <span className="text-sm font-mono text-[var(--text-muted)]">
                    {entry.totalTrades}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
