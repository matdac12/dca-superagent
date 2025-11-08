'use client';

/**
 * Multi-Agent Trade History Component
 * Displays trade history with optional agent filtering and debate viewers
 */

import { useState, useEffect, Fragment } from 'react';
import { getAgentConfig } from '@/config/agents';
import DebateViewer from './DebateViewer';

interface Trade {
  id: string;
  timestamp: string;
  agent?: string; // aiModel from TradeRecord
  action: string; // Full action type like "MARKET BUY", "LIMIT SELL", "HOLD", etc.
  asset: string;
  quantity: number;
  price: number;
  pnl: number;
  success: boolean;
  error?: string;
  councilMetadata?: any; // Council debate metadata
}

interface MultiAgentTradeHistoryProps {
  agentFilter?: string;
  showDebateViewers?: boolean; // If true, show expandable debate viewers for council trades
}

export default function MultiAgentTradeHistory({ agentFilter, showDebateViewers = false }: MultiAgentTradeHistoryProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Toggle row expansion
  const toggleRow = (tradeId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tradeId)) {
        newSet.delete(tradeId);
      } else {
        newSet.add(tradeId);
      }
      return newSet;
    });
  };

  // Fetch trades from appropriate endpoint
  const fetchTrades = async () => {
    try {
      setError(null);

      let url: string;
      if (agentFilter) {
        // Fetch trades for specific agent
        url = `/api/trade-history?limit=10&agent=${agentFilter}`;
      } else {
        // Fetch all trades
        url = `/api/trade-history?limit=10`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Transform data to common format
      // API returns { success: true, trades: [...] }
      const tradeRecords = data.trades || [];
      const transformedTrades: Trade[] = tradeRecords.map((record: any) => {
        // Calculate P&L
        const pnl = record.portfolioValueAfter - record.portfolioValueBefore;

        // Get price from executed order or market data
        const price = record.executedOrder?.executedPrice || record.executedOrder?.price || record.marketData?.ticker?.lastPrice || 0;

        // Extract action/asset/quantity from first action in actions array
        const primaryAction = record.decision?.actions?.[0];
        // Keep the full action type (PLACE_MARKET_BUY, PLACE_LIMIT_BUY, etc.)
        // Format as "Market Buy", "Limit Buy", "Hold", etc.
        let action = 'Hold';
        if (primaryAction?.type) {
          if (primaryAction.type === 'HOLD') {
            action = 'Hold';
          } else if (primaryAction.type === 'CANCEL_ORDER') {
            action = 'Cancel';
          } else {
            // Convert PLACE_MARKET_BUY -> Market Buy, PLACE_LIMIT_SELL -> Limit Sell
            const parts = primaryAction.type.replace('PLACE_', '').split('_');
            action = parts.map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');
          }
        }
        const asset = primaryAction?.asset || record.marketData?.symbol || 'BTCUSDT';
        const quantity = primaryAction?.quantity || 0;

        return {
          id: record.id,
          timestamp: record.timestamp,
          agent: record.aiModel,
          action,
          asset,
          quantity,
          price,
          pnl,
          success: record.success,
          error: record.error,
          councilMetadata: record.councilMetadata,
        };
      });

      setTrades(transformedTrades);
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to fetch trades:', err);
      setError(err.message || 'Failed to fetch trade history');
      setLoading(false);
    }
  };

  // Initial fetch and auto-refresh every 30 seconds
  useEffect(() => {
    fetchTrades();

    const intervalId = setInterval(() => {
      fetchTrades();
    }, 30000); // 30 seconds

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [agentFilter]); // Re-fetch when filter changes

  // Format timestamp as "Oct 15, 3:42 PM"
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Normalize asset display - show "BTC" instead of "BTCUSDT" or "BTC/USDT"
  const formatAsset = (asset: string) => {
    if (asset === 'BTCUSDT' || asset === 'BTC/USDT') return 'BTC';
    if (asset === 'ETHUSDT' || asset === 'ETH/USDT') return 'ETH';
    if (asset === 'ADAUSDT' || asset === 'ADA/USDT') return 'ADA';
    return asset;
  };

  // Get agent display info (color and name)
  const getAgentInfo = (agentName?: string) => {
    if (!agentName) {
      return { displayName: 'Unknown', color: '#888888' };
    }
    const config = getAgentConfig(agentName);
    return {
      displayName: config?.displayName || agentName,
      color: config?.color || '#888888',
    };
  };

  // Get selected model display name from council metadata
  const getSelectedModel = (councilMetadata?: any): string => {
    if (!councilMetadata || !councilMetadata.selectedModel) {
      return 'N/A';
    }

    // Only show specific model for unanimous consensus
    // For majority, just show "Majority"
    if (councilMetadata.consensusType === 'MAJORITY') {
      return 'Majority';
    }

    const modelMap: Record<string, string> = {
      'openai': 'OpenAI',
      'grok': 'Grok',
      'gemini': 'Gemini',
    };
    return modelMap[councilMetadata.selectedModel] || councilMetadata.selectedModel;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3">
          <svg
            className="animate-spin h-5 w-5 text-[var(--text-muted)]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm text-[var(--text-muted)]">Loading trade history...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 text-sm">
          {error}
        </div>
        <button
          onClick={() => fetchTrades()}
          className="mt-3 text-xs text-[var(--text-muted)] hover:text-blue-600 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!trades || trades.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)] text-sm">
        No trades found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {showDebateViewers && (
              <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {/* Expand column */}
              </th>
            )}
            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Timestamp
            </th>
            {!agentFilter && (
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Agent
              </th>
            )}
            <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Action
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Asset
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Quantity
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Price
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              P&L
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {trades.map((trade) => {
            const agentInfo = getAgentInfo(trade.agent);
            const isPositivePnL = trade.pnl >= 0;
            const isExpanded = expandedRows.has(trade.id);
            const hasDebateData = trade.councilMetadata && showDebateViewers;

            return (
              <Fragment key={trade.id}>
                <tr className="hover:bg-gray-50 transition-colors">
                  {/* Expand Button */}
                  {showDebateViewers && (
                    <td className="px-4 py-4 text-center">
                      {hasDebateData ? (
                        <button
                          onClick={() => toggleRow(trade.id)}
                          className="text-blue-600 hover:text-blue-600/80 transition-colors"
                        >
                          <svg
                            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ) : (
                        <span className="text-[var(--text-muted)]/30">—</span>
                      )}
                    </td>
                  )}

                  {/* Timestamp */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-xs text-[var(--text-muted)] font-['Roboto_Mono']">
                      {formatTimestamp(trade.timestamp)}
                    </span>
                  </td>

                  {/* Agent Name with colored dot (if not filtered) */}
                  {!agentFilter && (
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: agentInfo.color }}
                        />
                        <span className="text-xs text-[var(--text)]">
                          {agentInfo.displayName}
                        </span>
                      </div>
                    </td>
                  )}

                  {/* Action */}
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <span
                      className={`
                        inline-flex items-center px-2 py-1 rounded text-xs font-medium
                        ${
                          trade.action.includes('Buy')
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : trade.action.includes('Sell')
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }
                      `}
                    >
                      {trade.action}
                    </span>
                  </td>

                  {/* Asset */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-xs font-['Roboto_Mono'] text-[var(--text)]">
                      {formatAsset(trade.asset)}
                    </span>
                  </td>

                  {/* Quantity */}
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <span className="text-xs font-['Roboto_Mono'] text-[var(--text)]">
                      {trade.quantity ? trade.quantity.toFixed(6) : '0.000000'}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <span className="text-xs font-['Roboto_Mono'] text-[var(--text)]">
                      ${trade.price ? trade.price.toFixed(2) : '0.00'}
                    </span>
                  </td>

                  {/* P&L */}
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <span
                      className={`
                        text-xs font-['Roboto_Mono'] font-semibold
                        ${isPositivePnL ? 'text-green-600' : 'text-red-600'}
                      `}
                    >
                      {isPositivePnL ? '+' : ''}${trade.pnl ? trade.pnl.toFixed(2) : '0.00'}
                    </span>
                  </td>
                </tr>

                {/* Expanded Debate Viewer Row */}
                {isExpanded && hasDebateData && (
                  <tr>
                    <td colSpan={showDebateViewers ? 8 : 7} className="px-4 py-4 bg-gray-50">
                      <DebateViewer councilMetadata={trade.councilMetadata} defaultExpanded={false} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
