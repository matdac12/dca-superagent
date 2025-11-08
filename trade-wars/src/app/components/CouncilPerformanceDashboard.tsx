'use client';

/**
 * Council Performance Dashboard Component
 *
 * Displays high-level performance metrics for the collaborative trading council.
 * Shows portfolio value, ROI, P&L, trades, win rate, and consensus patterns.
 * Auto-refreshes every 30 seconds.
 */

import { useState, useEffect } from 'react';

interface CouncilStats {
  success: boolean;
  timestamp: string;
  tradeCount: number;
  decisionQuality: {
    totalTrades: number;
    successfulTrades: number;
    failedTrades: number;
    winRate: number;
    avgPnL: number;
    totalPnL: number;
    roi: number;
  };
  consensusPatterns: {
    unanimous: number;
    majority: number;
    none: number;
    unanimousPercentage: number;
    majorityPercentage: number;
    avgDebateDuration: number;
  };
}

interface MarketData {
  currentPrice: number;
  priceChange24h: number;
}

export default function CouncilPerformanceDashboard() {
  const [stats, setStats] = useState<CouncilStats | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [portfolioValue, setPortfolioValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);

      // Fetch council statistics
      const statsResponse = await fetch('/api/council/stats');
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch council statistics');
      }
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Fetch market data for current portfolio value
      const marketResponse = await fetch('/api/market');
      if (!marketResponse.ok) {
        throw new Error('Failed to fetch market data');
      }
      const marketData = await marketResponse.json();

      // Safely extract data with null checking
      if (marketData?.ticker) {
        setMarketData({
          currentPrice: marketData.ticker.lastPrice || 0,
          priceChange24h: marketData.ticker.priceChangePercent || 0,
        });
      }
      setPortfolioValue(marketData?.totalPortfolioValue || 0);

      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching council dashboard data:', err);
      setError(err.message || 'Failed to load data');
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);

    return () => clearInterval(interval);
  }, []);

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white border border-[var(--border)] rounded-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-100 rounded w-48 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 bg-gray-100 rounded"></div>
          <div className="h-24 bg-gray-100 rounded"></div>
          <div className="h-24 bg-gray-100 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white border border-red-300 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-red-600 mb-2">Error Loading Dashboard</h3>
            <p className="text-[var(--text-muted)] mb-4">{error}</p>
          </div>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchData();
          }}
          className="bg-black text-white px-4 py-2 rounded-lg font-bold hover:bg-black/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats || portfolioValue === null) {
    return null;
  }

  const roi = stats.decisionQuality.roi;
  const roiColor = roi > 0 ? 'text-green-600' : roi < 0 ? 'text-red-600' : 'text-[var(--text-muted)]';
  const roiSign = roi > 0 ? '+' : '';

  const totalPnL = stats.decisionQuality.totalPnL;
  const pnlColor = totalPnL > 0 ? 'text-green-600' : totalPnL < 0 ? 'text-red-600' : 'text-[var(--text-muted)]';
  const pnlSign = totalPnL > 0 ? '+' : '';

  return (
    <div className="bg-white border border-[var(--border)] rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">
          Council Performance
        </h2>
        <div className="text-sm text-[var(--text-muted)]">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Portfolio Value */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <div className="text-sm text-[var(--text-muted)] mb-1">Portfolio Value</div>
          <div className="text-3xl font-bold font-[family-name:var(--font-mono)]">
            ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {marketData && (
            <div className="text-xs text-[var(--text-muted)] mt-1">
              BTC: ${marketData.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
        </div>

        {/* ROI */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <div className="text-sm text-[var(--text-muted)] mb-1">Return on Investment</div>
          <div className={`text-3xl font-bold font-[family-name:var(--font-mono)] ${roiColor}`}>
            {roiSign}{roi.toFixed(2)}%
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            {stats.decisionQuality.totalTrades} total trades
          </div>
        </div>

        {/* Total P&L */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <div className="text-sm text-[var(--text-muted)] mb-1">Total P&L</div>
          <div className={`text-3xl font-bold font-[family-name:var(--font-mono)] ${pnlColor}`}>
            {pnlSign}${Math.abs(totalPnL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            Avg: ${stats.decisionQuality.avgPnL.toFixed(2)} per trade
          </div>
        </div>
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Win Rate */}
        <div className="bg-white border border-[var(--border)] rounded-lg p-4">
          <div className="text-sm text-[var(--text-muted)] mb-2">Win Rate</div>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold font-[family-name:var(--font-mono)]">
              {stats.decisionQuality.winRate.toFixed(1)}%
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              {stats.decisionQuality.successfulTrades}W / {stats.decisionQuality.failedTrades}L
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-2 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-green-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(stats.decisionQuality.winRate, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Consensus Patterns */}
        <div className="bg-white border border-[var(--border)] rounded-lg p-4">
          <div className="text-sm text-[var(--text-muted)] mb-2">Consensus Pattern</div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--text-muted)]">Unanimous</span>
            <span className="text-sm font-bold text-green-600">
              {stats.consensusPatterns.unanimous} ({stats.consensusPatterns.unanimousPercentage.toFixed(0)}%)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">Majority</span>
            <span className="text-sm font-bold text-blue-600">
              {stats.consensusPatterns.majority} ({stats.consensusPatterns.majorityPercentage.toFixed(0)}%)
            </span>
          </div>
        </div>

        {/* Debate Duration */}
        <div className="bg-white border border-[var(--border)] rounded-lg p-4">
          <div className="text-sm text-[var(--text-muted)] mb-2">Avg Debate Time</div>
          <div className="text-2xl font-bold font-[family-name:var(--font-mono)]">
            {stats.consensusPatterns.avgDebateDuration > 0
              ? `${(stats.consensusPatterns.avgDebateDuration / 1000).toFixed(1)}s`
              : 'N/A'}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            Time to reach consensus
          </div>
        </div>
      </div>
    </div>
  );
}
