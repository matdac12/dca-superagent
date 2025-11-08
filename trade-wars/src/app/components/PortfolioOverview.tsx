'use client';

import { useState, useEffect } from 'react';

interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

interface PortfolioData {
  totalValue: number;
  assets: Array<{
    asset: string;
    amount: number;
    valueUSD: number;
    percentage: number;
  }>;
  initialValue: number;
  totalPnL: number;
  totalPnLPercentage: number;
}

export default function PortfolioOverview() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPortfolioData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPortfolioData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);

      // Fetch account balances and market data in parallel
      const [accountResponse, marketResponse, tradeHistoryResponse] = await Promise.all([
        fetch('/api/account'),
        fetch('/api/market'),
        fetch('/api/trade-history?limit=1000') // Get all trades to find the first one
      ]);

      if (!accountResponse.ok || !marketResponse.ok || !tradeHistoryResponse.ok) {
        throw new Error('Failed to fetch portfolio data');
      }

      const accountData = await accountResponse.json();
      const marketData = await marketResponse.json();
      const tradeHistoryData = await tradeHistoryResponse.json();

      // Check for errors (only trade history has success field)
      if (accountData.error) {
        throw new Error(`Account API error: ${accountData.error}`);
      }
      if (marketData.error) {
        throw new Error(`Market API error: ${marketData.error}`);
      }
      if (!tradeHistoryData.success) {
        throw new Error(`Trade History API error: ${tradeHistoryData.error || 'Unknown error'}`);
      }

      const balances: Balance[] = accountData.balances;

      // Find prices from market data array
      const btcMarketData = marketData.data.find((asset: any) => asset.symbol === 'BTCUSDT');
      const btcPrice = btcMarketData ? parseFloat(btcMarketData.price) : 0;

      const adaMarketData = marketData.data.find((asset: any) => asset.symbol === 'ADAUSDT');
      const adaPrice = adaMarketData ? parseFloat(adaMarketData.price) : 0;

      // Calculate portfolio value and asset breakdown
      let totalValue = 0;
      const assets = balances.map(balance => {
        let valueUSD = 0;

        if (balance.asset === 'USDT') {
          valueUSD = balance.total;
        } else if (balance.asset === 'BTC') {
          valueUSD = balance.total * btcPrice;
        } else if (balance.asset === 'ADA') {
          valueUSD = balance.total * adaPrice;
        }

        totalValue += valueUSD;

        return {
          asset: balance.asset,
          amount: balance.total,
          valueUSD,
          percentage: 0 // Will calculate after we know totalValue
        };
      });

      // Calculate percentages
      assets.forEach(asset => {
        asset.percentage = totalValue > 0 ? (asset.valueUSD / totalValue) * 100 : 0;
      });

      // Get initial portfolio value from first trade
      const trades = tradeHistoryData.trades;
      const initialValue = trades.length > 0
        ? trades[trades.length - 1].portfolioValueBefore
        : totalValue;

      const totalPnL = totalValue - initialValue;
      const totalPnLPercentage = initialValue > 0 ? (totalPnL / initialValue) * 100 : 0;

      // Always show BTC, USDT, and ADA regardless of value
      const priorityAssets = ['BTC', 'USDT', 'ADA'];
      const filteredAssets = assets.filter(a => priorityAssets.includes(a.asset));

      // Sort by USD value descending (largest to smallest)
      filteredAssets.sort((a, b) => b.valueUSD - a.valueUSD);

      setPortfolio({
        totalValue,
        assets: filteredAssets,
        initialValue,
        totalPnL,
        totalPnLPercentage
      });

      setError(null);
    } catch (err: any) {
      console.error('Error fetching portfolio data:', err);
      setError(err.message || 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Portfolio Overview</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Portfolio Overview</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Portfolio Overview</h2>
        <button
          onClick={fetchPortfolioData}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>

      {/* Total Portfolio Value */}
      <div className="mb-8">
        <div className="text-sm text-gray-600 mb-2">Total Portfolio Value</div>
        <div className="flex items-baseline gap-4">
          <div className="text-4xl font-bold font-mono text-gray-900">
            ${portfolio.totalValue.toFixed(2)}
          </div>
          <div className={`text-lg font-mono ${
            portfolio.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {portfolio.totalPnL >= 0 ? '+' : ''}${portfolio.totalPnL.toFixed(2)}
            <span className="text-sm ml-1">
              ({portfolio.totalPnLPercentage >= 0 ? '+' : ''}{portfolio.totalPnLPercentage.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Initial: ${portfolio.initialValue.toFixed(2)}
        </div>
      </div>

      {/* Asset Breakdown */}
      <div>
        <div className="text-sm font-medium text-gray-700 mb-4">Asset Allocation</div>
        <div className="space-y-4">
          {portfolio.assets.map((asset) => (
            <div key={asset.asset} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold text-gray-900">{asset.asset}</span>
                  <span className="text-gray-600 font-mono">
                    {asset.amount.toFixed(asset.asset === 'BTC' ? 8 : 2)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-gray-900">
                    ${asset.valueUSD.toFixed(2)}
                  </span>
                  <span className="text-gray-600 min-w-[4rem] text-right">
                    {asset.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${asset.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
