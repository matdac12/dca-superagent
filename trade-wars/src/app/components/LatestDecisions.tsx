'use client';

/**
 * Latest Decisions Component
 * Displays the most recent trading decision from each of the 4 agents
 */

import { useState, useEffect } from 'react';

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

export default function LatestDecisions() {
  const [decisions, setDecisions] = useState<LatestDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchDecisions = async () => {
      try {
        const response = await fetch('/api/latest-decisions');

        if (!response.ok) {
          throw new Error('Failed to fetch latest decisions');
        }

        const data = await response.json();
        setDecisions(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching latest decisions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load decisions');
      } finally {
        setLoading(false);
      }
    };

    fetchDecisions();

    // Auto-refresh every 30 seconds
    const intervalId = setInterval(fetchDecisions, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const toggleExpanded = (agent: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(agent)) {
        newSet.delete(agent);
      } else {
        newSet.add(agent);
      }
      return newSet;
    });
  };

  // Format timestamp as relative time
  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="animate-spin h-6 w-6 border-4 border-gray-300 border-t-blue-600 rounded-full" />
          <span className="text-sm text-gray-600">Loading latest decisions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-sm mb-2">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-gray-600 hover:text-gray-900 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {decisions.map((decision) => {
        const isExpanded = expandedCards.has(decision.agent);
        const reasoningLong = decision.decision.reasoning.length > 150;
        const displayReasoning = !reasoningLong || isExpanded
          ? decision.decision.reasoning
          : decision.decision.reasoning.slice(0, 150) + '...';

        const primaryAction = decision.decision.actions?.[0];
        const isLimit = primaryAction?.type?.startsWith('PLACE_LIMIT');
        const isMarket = primaryAction?.type?.startsWith('PLACE_MARKET');
        const isCancel = primaryAction?.type === 'CANCEL_ORDER';

        return (
          <div
            key={decision.agent}
            className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
            style={{ borderLeftWidth: '4px', borderLeftColor: decision.color }}
          >
            {/* Card Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: decision.color }}
                />
                <span className="text-sm font-semibold text-gray-900">
                  {decision.displayName}
                </span>
              </div>

              {/* Action Badge & Details */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${
                    isLimit
                      ? 'bg-[#2FD1FF]/10 text-[#036781] border-[#2FD1FF]/60'
                      : isMarket
                      ? primaryAction?.type?.includes('BUY')
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                      : isCancel
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}
                >
                  {isLimit
                    ? `LIMIT ${primaryAction?.type?.includes('BUY') ? 'BUY' : 'SELL'}${
                        primaryAction?.price ? ` @ $${primaryAction.price}` : ''
                      }`
                    : isMarket
                    ? `${primaryAction?.type?.includes('BUY') ? 'MARKET BUY' : 'MARKET SELL'}`
                    : isCancel
                    ? 'CANCEL ORDER'
                    : 'HOLD'}
                </span>
                {primaryAction?.quantity && (
                  <span className="text-xs text-gray-600 font-mono">
                    • {primaryAction.quantity.toFixed(6)} BTC
                  </span>
                )}
              </div>

              <div className="text-xs text-gray-500 mt-2">
                {formatRelativeTime(decision.timestamp)}
              </div>
            </div>

            {/* Plan & Reasoning */}
            <div className="p-4 flex flex-col gap-3">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Current Plan
                </h3>
                <p className="text-sm text-gray-800 leading-relaxed">
                  {decision.decision.plan || 'No plan submitted.'}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Reasoning
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  "{displayReasoning}"
                </p>
                {reasoningLong && (
                  <button
                    onClick={() => toggleExpanded(decision.agent)}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-2 font-medium"
                  >
                    {isExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            </div>

            {/* Footer with P&L and Success */}
            <div className="px-4 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-mono font-semibold ${
                    decision.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {decision.pnl >= 0 ? '+' : ''}${decision.pnl.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {decision.success ? (
                  <span className="text-green-600 text-sm">✓</span>
                ) : (
                  <span className="text-red-600 text-sm">✗</span>
                )}
                <span className="text-xs text-gray-600">
                  {decision.success ? 'Success' : 'Failed'}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
