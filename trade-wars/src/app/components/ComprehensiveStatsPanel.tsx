'use client';

/**
 * Comprehensive Stats Panel - Minimal Design
 * Simple gray boxes matching the original agent detail page style
 */

import { useState, useEffect } from 'react';
import ModelContributionChart from './ModelContributionChart';

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
  modelContribution: {
    openai: { timesSelected: number; winRate: number; avgPnL: number };
    grok: { timesSelected: number; winRate: number; avgPnL: number };
    gemini: { timesSelected: number; winRate: number; avgPnL: number };
  };
  consensusPatterns: {
    unanimous: number;
    majority: number;
    none: number;
    unanimousPercentage: number;
    majorityPercentage: number;
    avgDebateDuration: number;
  };
  riskMetrics: {
    maxDrawdown: number;
    maxDrawdownValue: number;
    sharpeRatio: number;
    volatility: number;
  };
  executionMetrics: {
    marketOrders: number;
    limitOrders: number;
    holdDecisions: number;
    avgExecutionTime: number;
    orderTypeDistribution: {
      market: number;
      limit: number;
      hold: number;
    };
  };
}

export default function ComprehensiveStatsPanel() {
  const [stats, setStats] = useState<CouncilStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default

  const fetchData = async () => {
    try {
      setError(null);
      const response = await fetch('/api/council/stats');
      if (!response.ok) throw new Error('Failed to fetch council statistics');
      const data = await response.json();
      setStats(data);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching comprehensive stats:', err);
      setError(err.message || 'Failed to load statistics');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm animate-pulse">
        <div className="h-8 bg-gray-100 rounded w-64 mb-6"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-20 bg-gray-100 rounded"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-red-600 mb-2">Error Loading Statistics</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="bg-black text-white px-4 py-2 rounded font-semibold hover:bg-gray-800 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-8">
      {/* Header with Toggle Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Detailed Statistics</h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="space-y-8">

      {/* Model Contribution */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Selection Counter</h3>
        <ModelContributionChart data={stats.modelContribution} />
      </div>

      {/* Execution Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Execution Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Market Orders</div>
            <div className="text-xl font-bold font-mono text-gray-900">
              {stats.executionMetrics.marketOrders}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Limit Orders</div>
            <div className="text-xl font-bold font-mono text-gray-900">
              {stats.executionMetrics.limitOrders}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Hold Decisions</div>
            <div className="text-xl font-bold font-mono text-gray-900">
              {stats.executionMetrics.holdDecisions}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Avg Execution Time</div>
            <div className="text-xl font-bold font-mono text-gray-900">
              {stats.executionMetrics.avgExecutionTime > 0 ? `${(stats.executionMetrics.avgExecutionTime / 1000).toFixed(1)}s` : 'N/A'}
            </div>
          </div>
        </div>
      </div>
        </div>
      )}
    </div>
  );
}
