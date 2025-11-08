'use client';

import { useState, useEffect } from 'react';

interface Statistics {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  cumulativePnL: number;
  winRate: number;
}

export default function PerformanceMetrics() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatistics();
    // Refresh every 30 seconds to show updated performance metrics
    const interval = setInterval(fetchStatistics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/trade-history');
      const data = await response.json();

      if (data.success) {
        setStats(data.statistics);
        setError(null);
      } else {
        setError(data.error || 'Failed to load statistics');
      }
    } catch (err: any) {
      console.error('Error fetching statistics:', err);
      setError(err.message || 'Failed to connect to API');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Metrics</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Metrics</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Performance Metrics</h2>
        <button
          onClick={fetchStatistics}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>

      {stats.totalTrades === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No performance data yet. Execute some trades to see metrics.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total P&L */}
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-2">Total P&L</div>
            <div className={`text-3xl font-bold font-mono ${
              stats.cumulativePnL >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stats.cumulativePnL >= 0 ? '+' : ''}${stats.cumulativePnL.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">USDT</div>
          </div>

          {/* Total Trades */}
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-2">Total Trades</div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.totalTrades}
            </div>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs">
              <span className="text-green-600">
                ✓ {stats.successfulTrades}
              </span>
              <span className="text-red-600">
                ✗ {stats.failedTrades}
              </span>
            </div>
          </div>

          {/* Win Rate */}
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-2">Win Rate</div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.winRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Success Rate
            </div>
          </div>
        </div>
      )}

      {/* Performance Bar (if trades exist) */}
      {stats.totalTrades > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <span>Performance Distribution</span>
            <span>{stats.successfulTrades} / {stats.totalTrades} successful</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats.winRate}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
