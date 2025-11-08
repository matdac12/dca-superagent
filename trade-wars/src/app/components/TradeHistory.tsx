'use client';

import { useState, useEffect } from 'react';

interface TradeRecord {
  id: string;
  timestamp: string;
  aiModel?: 'openai' | 'grok' | 'gemini' | 'consensus';
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
  executedOrder?: {
    orderId: string;
    orderType: 'MARKET' | 'LIMIT';
    limitPrice?: number;
    executedPrice: number;
    priceImprovement?: number;
    quantity: number;
    status: string;
  };
  portfolioValueBefore: number;
  portfolioValueAfter: number;
  success: boolean;
  error?: string;
}

export default function TradeHistory() {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    fetchTradeHistory();
    // Refresh every 30 seconds to show new trades
    const interval = setInterval(fetchTradeHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTradeHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/trade-history?limit=20');
      const data = await response.json();

      if (data.success) {
        setTrades(data.trades);
        setError(null);
      } else {
        setError(data.error || 'Failed to load trade history');
      }
    } catch (err: any) {
      console.error('Error fetching trade history:', err);
      setError(err.message || 'Failed to connect to API');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (type: string) => {
    if (type.includes('BUY')) return 'text-green-600 bg-green-50';
    if (type.includes('SELL')) return 'text-red-600 bg-red-50';
    if (type === 'CANCEL_ORDER') return 'text-amber-700 bg-amber-50';
    return 'text-gray-600 bg-gray-50';
  };

  const calculatePnLImpact = (trade: TradeRecord): { value: number; percentage: number } => {
    const pnl = trade.portfolioValueAfter - trade.portfolioValueBefore;
    const percentage = trade.portfolioValueBefore > 0
      ? (pnl / trade.portfolioValueBefore) * 100
      : 0;
    return { value: pnl, percentage };
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    };
  };

  const formatAsset = (asset: string) => {
    if (asset === 'BTCUSDT' || asset === 'BTC/USDT') return 'BTC';
    if (asset === 'ETHUSDT' || asset === 'ETH/USDT') return 'ETH';
    if (asset === 'ADAUSDT' || asset === 'ADA/USDT') return 'ADA';
    return asset;
  };

  const getModelDisplayName = (model?: string) => {
    switch (model) {
      case 'openai':
        return 'OpenAI';
      case 'grok':
        return 'Grok';
      case 'gemini':
        return 'Gemini';
      case 'consensus':
        return 'Consensus';
      default:
        return '-';
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Decision History</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Decision History</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Decision History</h2>
        <button
          onClick={fetchTradeHistory}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No trades yet. Run an AI analysis to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-700">Time</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">Action</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">Asset</th>
                <th className="text-right py-3 px-2 font-medium text-gray-700">Request Qty</th>
                <th className="text-right py-3 px-2 font-medium text-gray-700">Limit Price</th>
                <th className="text-right py-3 px-2 font-medium text-gray-700">Exec Price</th>
                <th className="text-right py-3 px-2 font-medium text-gray-700">Improvement</th>
                <th className="text-right py-3 px-2 font-medium text-gray-700">P&L Impact</th>
                <th className="text-center py-3 px-2 font-medium text-gray-700">Model</th>
                <th className="text-center py-3 px-2 font-medium text-gray-700">Status</th>
                <th className="text-center py-3 px-2 font-medium text-gray-700"></th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => {
                const { date, time } = formatDate(trade.timestamp);
                const pnl = calculatePnLImpact(trade);
                const primaryAction = trade.decision.actions[0];
                const isLimit = primaryAction?.type?.startsWith('PLACE_LIMIT');
                const isExpanded = expandedRow === trade.id;

                return (
                  <tr key={trade.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <div className="text-gray-900">{time}</div>
                      <div className="text-xs text-gray-500">{date}</div>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-2 ${getActionColor(primaryAction?.type || '')}`}>
                        <span>{primaryAction?.type?.replaceAll('_', ' ') || 'UNKNOWN'}</span>
                        {isLimit && primaryAction?.price && (
                          <span className="text-[10px] font-mono text-gray-600">
                            @ ${primaryAction.price.toFixed(2)}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-2 font-mono text-gray-900">
                      {primaryAction?.asset ? formatAsset(primaryAction.asset) : '-'}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-gray-900">
                      {primaryAction?.quantity ? primaryAction.quantity.toFixed(6) : '-'}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-gray-900">
                      {trade.executedOrder?.orderType === 'LIMIT' && trade.executedOrder.limitPrice
                        ? `$${trade.executedOrder.limitPrice.toFixed(2)}`
                        : isLimit && primaryAction?.price
                        ? `$${primaryAction.price.toFixed(2)}`
                        : '—'}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-gray-900">
                      {trade.executedOrder
                        ? `$${trade.executedOrder.executedPrice.toFixed(2)}`
                        : '—'}
                    </td>
                    <td
                      className={`py-3 px-2 text-right font-mono text-sm ${
                        trade.executedOrder?.priceImprovement && trade.executedOrder.priceImprovement !== 0
                          ? trade.executedOrder.priceImprovement > 0
                            ? 'text-green-600'
                            : 'text-red-600'
                          : 'text-gray-400'
                      }`}
                    >
                      {trade.executedOrder?.priceImprovement
                        ? `${trade.executedOrder.priceImprovement > 0 ? '+' : ''}$${trade.executedOrder.priceImprovement.toFixed(2)}`
                        : '—'}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className={`font-mono ${pnl.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pnl.value >= 0 ? '+' : ''}${pnl.value.toFixed(2)}
                      </div>
                      <div className={`text-xs ${pnl.value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {pnl.percentage >= 0 ? '+' : ''}{pnl.percentage.toFixed(2)}%
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="text-xs text-gray-900 font-medium">
                        {getModelDisplayName(trade.aiModel)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      {trade.success ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-red-600">✗</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button
                        onClick={() => setExpandedRow(isExpanded ? null : trade.id)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        {isExpanded ? 'Hide' : 'Details'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Expanded Row Details */}
          {trades.map((trade) => {
            if (expandedRow !== trade.id) return null;

            return (
              <div key={`expanded-${trade.id}`} className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Plan Snapshot</h3>
                  <p className="text-sm text-gray-700 font-mono whitespace-pre-wrap">
                    {trade.decision.plan}
                  </p>
                </div>

                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">AI Reasoning</h3>
                  <p className="text-sm text-gray-700 font-mono whitespace-pre-wrap">
                    {trade.decision.reasoning}
                  </p>
                </div>

                {trade.executedOrder && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Order Details</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Order ID:</span>
                        <span className="ml-2 font-mono">{trade.executedOrder.orderId}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Type:</span>
                        <span className="ml-2 font-mono uppercase text-gray-800">
                          {trade.executedOrder.orderType}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <span className="ml-2 font-mono">{trade.executedOrder.status}</span>
                      </div>
                      {trade.executedOrder.limitPrice && (
                        <div>
                          <span className="text-gray-600">Limit Price:</span>
                          <span className="ml-2 font-mono">
                            ${trade.executedOrder.limitPrice.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600">Executed Price:</span>
                        <span className="ml-2 font-mono">
                          ${trade.executedOrder.executedPrice.toFixed(2)}
                        </span>
                      </div>
                      {typeof trade.executedOrder.priceImprovement === 'number' && (
                        <div>
                          <span className="text-gray-600">Price Improvement:</span>
                          <span
                            className={`ml-2 font-mono ${
                              trade.executedOrder.priceImprovement > 0
                                ? 'text-green-600'
                                : trade.executedOrder.priceImprovement < 0
                                ? 'text-red-600'
                                : 'text-gray-600'
                            }`}
                          >
                            {trade.executedOrder.priceImprovement > 0 ? '+' : ''}
                            ${trade.executedOrder.priceImprovement.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {trade.error && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <h3 className="text-sm font-semibold text-red-800 mb-1">Error</h3>
                    <p className="text-sm text-red-700">{trade.error}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
