'use client';

import { useState, useEffect } from 'react';

interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

interface Statistics {
  totalTrades: number;
  cumulativePnL: number;
}

export default function HeroStats() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatistics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatistics = async () => {
    try {
      // Fetch account balances, market data, and trade history in parallel
      const [accountResponse, marketResponse, tradeHistoryResponse] = await Promise.all([
        fetch('/api/account'),
        fetch('/api/market'),
        fetch('/api/trade-history?limit=1000')
      ]);

      if (!accountResponse.ok || !marketResponse.ok || !tradeHistoryResponse.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const accountData = await accountResponse.json();
      const marketData = await marketResponse.json();
      const tradeHistoryData = await tradeHistoryResponse.json();

      if (!tradeHistoryData.success) {
        throw new Error('Trade history API error');
      }

      const balances: Balance[] = accountData.balances;

      // Find prices from market data array
      const btcMarketData = marketData.data.find((asset: any) => asset.symbol === 'BTCUSDT');
      const btcPrice = btcMarketData ? parseFloat(btcMarketData.price) : 0;

      const adaMarketData = marketData.data.find((asset: any) => asset.symbol === 'ADAUSDT');
      const adaPrice = adaMarketData ? parseFloat(adaMarketData.price) : 0;

      // Calculate current portfolio value with live prices
      let currentValue = 0;
      balances.forEach(balance => {
        if (balance.asset === 'USDT') {
          currentValue += balance.total;
        } else if (balance.asset === 'BTC') {
          currentValue += balance.total * btcPrice;
        } else if (balance.asset === 'ADA') {
          currentValue += balance.total * adaPrice;
        }
      });

      // Get initial portfolio value from first trade
      const trades = tradeHistoryData.trades;
      const initialValue = trades.length > 0
        ? trades[trades.length - 1].portfolioValueBefore
        : currentValue;

      const cumulativePnL = currentValue - initialValue;

      setStats({
        totalTrades: tradeHistoryData.statistics.totalTrades,
        cumulativePnL
      });
    } catch (err) {
      console.error('Error fetching statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 min-w-[200px]">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    );
  }

  if (!stats || stats.totalTrades === 0) {
    return (
      <div className="flex flex-col gap-6 min-w-[200px] text-right">
        <div>
          <div className="text-sm text-[var(--text-muted)] mb-1">Total P&L</div>
          <div className="text-2xl font-medium font-mono text-gray-400">
            $0.00
          </div>
        </div>
        <div>
          <div className="text-sm text-[var(--text-muted)] mb-1">Total Trades</div>
          <div className="text-2xl font-medium text-gray-400">
            0
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 min-w-[200px] text-right">
      {/* Total P&L */}
      <div>
        <div className="text-sm text-[var(--text-muted)] mb-1">Total P&L</div>
        <div className={`text-3xl font-medium font-mono ${
          stats.cumulativePnL >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {stats.cumulativePnL >= 0 ? '+' : ''}${stats.cumulativePnL.toFixed(2)}
        </div>
      </div>

      {/* Total Trades */}
      <div>
        <div className="text-sm text-[var(--text-muted)] mb-1">Total Trades</div>
        <div className="text-3xl font-medium text-[var(--text)]">
          {stats.totalTrades}
        </div>
      </div>
    </div>
  );
}
