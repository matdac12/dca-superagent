'use client';

/**
 * Asset Allocation Component
 *
 * Displays current portfolio allocation with horizontal orange bars.
 * Minimal design matching the original agent detail page style.
 */

import { useState, useEffect } from 'react';

interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

interface MarketData {
  ticker: {
    lastPrice: number;
  };
  balances: Balance[];
  totalPortfolioValue: number;
}

interface Allocation {
  asset: string;
  balance: number;
  usdValue: number;
  percentage: number;
}

export default function AssetAllocation() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);

      const response = await fetch('/api/market');
      if (!response.ok) {
        throw new Error('Failed to fetch market data');
      }

      const data: MarketData = await response.json();

      if (!data || !data.balances || !data.ticker) {
        setAllocations([]);
        setTotalValue(0);
        setLoading(false);
        return;
      }

      const btcPrice = data.ticker.lastPrice;
      const totalPortfolioValue = data.totalPortfolioValue;

      // Filter to only show BTC, ETH, ADA, USDT
      const allowedAssets = ['BTC', 'ETH', 'ADA', 'USDT'];

      // Calculate allocations
      const allocs: Allocation[] = data.balances
        .filter(b => b.total > 0 && allowedAssets.includes(b.asset))
        .map(b => {
          const usdValue = b.asset === 'BTC' ? b.total * btcPrice : b.total;
          return {
            asset: b.asset,
            balance: b.total,
            usdValue,
            percentage: totalPortfolioValue > 0 ? (usdValue / totalPortfolioValue) * 100 : 0
          };
        })
        .sort((a, b) => b.usdValue - a.usdValue);

      setAllocations(allocs);
      setTotalValue(totalPortfolioValue);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching asset allocation:', err);
      setError(err.message || 'Failed to load data');
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
        <div className="h-6 bg-gray-100 rounded w-48 mb-4"></div>
        <div className="h-24 bg-gray-100 rounded mb-2"></div>
        <div className="h-24 bg-gray-100 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-red-600 mb-2">Error Loading Allocation</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            fetchData();
          }}
          className="bg-black text-white px-4 py-2 rounded font-semibold hover:bg-gray-800 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Asset Allocation</h2>
        <p className="text-sm text-gray-600">
          Holdings sorted by USD value (highest to lowest)
        </p>
      </div>

      {allocations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No active allocations
        </div>
      ) : (
        <div className="space-y-4">
          {allocations.map((allocation) => (
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
      {allocations.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm font-medium text-gray-700">
              Total Portfolio Value
            </div>
            <div className="text-lg font-bold font-mono text-gray-900">
              ${totalValue.toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
