'use client';

/**
 * AI Trading Council Homepage
 * Collaborative decision-making interface where AI models work together
 */

import { useState, useEffect } from 'react';
import CouncilPerformanceDashboard from './components/CouncilPerformanceDashboard';
import DebateViewer from './components/DebateViewer';
import ComprehensiveStatsPanel from './components/ComprehensiveStatsPanel';
import AssetAllocation from './components/AssetAllocation';
import MultiAgentChart from './components/MultiAgentChart';
import MultiAgentTradeHistory from './components/MultiAgentTradeHistory';
import PriceTicker from './components/PriceTicker';
import OpenOrdersTable from './components/OpenOrdersTable';

// TypeScript interfaces
interface PortfolioDataPoint {
  timestamp: string;
  council: number;
}

interface LatestDecision {
  timestamp: string;
  action: string;
  reasoning: string;
  plan: string;
  councilMetadata?: any;
}

export default function Home() {
  const [chartData, setChartData] = useState<PortfolioDataPoint[]>([]);
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [latestDecision, setLatestDecision] = useState<LatestDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executingCouncil, setExecutingCouncil] = useState(false);
  const [executionMessage, setExecutionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setError(null);

      const [portfolioHistoryRes, openOrdersRes, latestDecisionRes] = await Promise.allSettled([
        fetch('/api/portfolio-history?agent=council'),
        fetch('/api/open-orders'),
        fetch('/api/trade-history?limit=1&agent=council'),
      ]);

      // Portfolio chart data (council only)
      if (portfolioHistoryRes.status === 'fulfilled' && portfolioHistoryRes.value.ok) {
        const data = await portfolioHistoryRes.value.json();
        // Extract only council data points
        const councilData = data.map((point: any) => ({
          timestamp: point.timestamp,
          council: point.council || 0,
        }));
        setChartData(councilData);
      }

      // Open orders
      if (openOrdersRes.status === 'fulfilled' && openOrdersRes.value.ok) {
        const ordersPayload = await openOrdersRes.value.json();
        setOpenOrders(ordersPayload.orders || []);
      }

      // Latest council decision
      if (latestDecisionRes.status === 'fulfilled' && latestDecisionRes.value.ok) {
        const data = await latestDecisionRes.value.json();
        const trades = data.trades || [];
        if (trades.length > 0) {
          const latestTrade = trades[0];
          setLatestDecision({
            timestamp: latestTrade.timestamp,
            action: latestTrade.decision?.actions?.[0]?.type || 'UNKNOWN',
            reasoning: latestTrade.decision?.reasoning || '',
            plan: latestTrade.plan || latestTrade.decision?.plan || '',
            councilMetadata: latestTrade.councilMetadata,
          });
        }
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
      setLoading(false);
    }
  };

  // Execute Council Decision
  const handleExecuteCouncil = async () => {
    setExecutingCouncil(true);
    setExecutionMessage(null);

    try {
      const response = await fetch('/api/trading-agent-council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (data.success) {
        setExecutionMessage({
          type: 'success',
          text: `Council decision executed: ${data.decision?.actions?.[0]?.type || 'HOLD'}`,
        });
      } else {
        setExecutionMessage({
          type: 'error',
          text: data.error || 'Council execution failed',
        });
      }

      // Refresh all dashboard data after successful execution
      setTimeout(() => fetchDashboardData(), 1000);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setExecutionMessage({ type: 'error', text: err.message || 'Failed to execute council' });
    } finally {
      setExecutingCouncil(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 30 seconds (components have their own refresh too)
    const intervalId = setInterval(() => fetchDashboardData(), 30000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-medium">Trade Warriors</div>
          <nav className="flex gap-8 text-sm items-center">
            <a href="/docs" className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">Docs</a>
            <button className="bg-black text-white px-4 py-2 text-sm hover:bg-black/90 transition-colors">
              Log In
            </button>
          </nav>
        </div>
      </header>

      {/* Price Ticker */}
      <PriceTicker />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="flex items-start justify-between gap-12">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-medium leading-tight mb-6">
              AI Trading
              <br />
              Council
            </h1>
            <p className="text-xl text-[var(--text-muted)] leading-relaxed mb-8">
              Three AI models collaborate through structured debate to make unified trading decisions.
              OpenAI, Grok, and Gemini reach consensus on every trade.
            </p>

            {/* Execute Council Decision Button */}
            <button
              onClick={handleExecuteCouncil}
              disabled={executingCouncil || loading}
              className={`
                px-6 py-3 text-sm font-bold transition-colors
                ${executingCouncil || loading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-black/90'
                }
              `}
            >
              {executingCouncil ? 'Executing Council...' : 'Execute Council Decision'}
            </button>

            {/* Execution Message */}
            {executionMessage && (
              <div className={`
                mt-4 p-4 text-sm border
                ${executionMessage.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
                }
              `}>
                {executionMessage.text}
              </div>
            )}
          </div>
        </div>
      </section>

      {loading && (
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-3 text-[var(--text-muted)]">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm">Loading council dashboard...</span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-black text-white text-sm font-bold hover:bg-black/90"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Council Performance Dashboard */}
          <section className="max-w-7xl mx-auto px-6 mb-12">
            <CouncilPerformanceDashboard />
          </section>

          {/* Latest Council Decision & Model Proposals - Combined & Prominent */}
          {latestDecision && (
            <section className="max-w-7xl mx-auto px-6 mb-12">
              <div className="bg-white border border-[var(--border)] rounded-lg p-6 shadow-sm">
                <h2 className="text-2xl font-semibold mb-6">
                  Latest Council Decision
                </h2>

                {/* Decision Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="text-sm text-[var(--text-muted)] mb-1">Timestamp</div>
                    <div className="font-[family-name:var(--font-mono)]">
                      {new Date(latestDecision.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-[var(--text-muted)] mb-1">Final Action</div>
                    <div className="font-bold">{latestDecision.action}</div>
                  </div>
                </div>

                {/* Model Proposals - Expanded by Default */}
                {latestDecision.councilMetadata && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4">Individual Model Proposals</h3>
                    <DebateViewer
                      councilMetadata={latestDecision.councilMetadata}
                      defaultExpanded={true}
                    />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Asset Allocation - Moved Up */}
          <section className="max-w-7xl mx-auto px-6 mb-12">
            <AssetAllocation />
          </section>

          {/* Comprehensive Stats Panel - Moved Down */}
          <section className="max-w-7xl mx-auto px-6 mb-12">
            <ComprehensiveStatsPanel />
          </section>

          {/* Open Orders Section */}
          <section className="max-w-7xl mx-auto px-6 mb-12">
            <div className="bg-white border border-[var(--border)] rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Open Orders</h2>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                Active limit orders from council decisions
              </p>
              <OpenOrdersTable orders={openOrders} />
            </div>
          </section>

          {/* Portfolio Chart Section - Single Council Line */}
          <section className="max-w-7xl mx-auto px-6 mb-12">
            <div className="bg-white border border-[var(--border)] rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">
                Council Portfolio Performance
              </h2>
              {chartData.length > 0 ? (
                <MultiAgentChart data={chartData} singleAgentMode={true} />
              ) : (
                <div className="text-[var(--text-muted)] text-center py-8">
                  No portfolio history yet. Execute first decision to start tracking.
                </div>
              )}
            </div>
          </section>

          {/* Trade History Section - Council Only, No Filter Tabs */}
          <section className="max-w-7xl mx-auto px-6 mb-12">
            <div className="bg-white border border-[var(--border)] rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">
                Council Trade History
              </h2>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                Complete history of council decisions with expandable debate details
              </p>
              <MultiAgentTradeHistory agentFilter="council" showDebateViewers={true} />
            </div>
          </section>
        </>
      )}

      {/* Footer */}
      <footer className="border-t border-[var(--border)] mt-32">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex justify-between items-center">
            <p className="text-sm text-[var(--text-muted)]">© Trade Wars 2025</p>
            <div className="flex gap-8 text-sm text-[var(--text-muted)]">
              <a href="/docs" className="hover:text-[var(--text)] transition-colors">Docs</a>
              <a href="#" className="hover:text-[var(--text)] transition-colors">Privacy</a>
              <a href="#" className="hover:text-[var(--text)] transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
