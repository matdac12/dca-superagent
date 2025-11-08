'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface ChartDataPoint {
  timestamp: string;
  value: number;
  formattedTime: string;
  formattedDate: string;
}

export default function PortfolioChart() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChartData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchChartData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchChartData = async () => {
    try {
      setLoading(true);

      // Fetch all trade history
      const [tradeHistoryResponse, accountResponse, marketResponse] = await Promise.all([
        fetch('/api/trade-history?limit=1000'),
        fetch('/api/account'),
        fetch('/api/market')
      ]);

      if (!tradeHistoryResponse.ok || !accountResponse.ok || !marketResponse.ok) {
        throw new Error('Failed to fetch chart data');
      }

      const tradeHistoryData = await tradeHistoryResponse.json();
      const accountData = await accountResponse.json();
      const marketData = await marketResponse.json();

      // Check for errors (only trade history has success field)
      if (!tradeHistoryData.success) {
        throw new Error(`Trade History API error: ${tradeHistoryData.error || 'Unknown error'}`);
      }
      if (accountData.error) {
        throw new Error(`Account API error: ${accountData.error}`);
      }
      if (marketData.error) {
        throw new Error(`Market API error: ${marketData.error}`);
      }

      const trades = tradeHistoryData.trades;

      // Build chart data points from trade history
      const dataPoints: ChartDataPoint[] = [];

      // Add data points from trade history (reverse to get chronological order)
      // Create a copy to avoid mutating the original array
      [...trades].reverse().forEach((trade: any) => {
        const date = new Date(trade.timestamp);

        // Add portfolioValueBefore point
        dataPoints.push({
          timestamp: trade.timestamp,
          value: trade.portfolioValueBefore || 0,
          formattedTime: date.toLocaleTimeString(),
          formattedDate: date.toLocaleDateString()
        });

        // Add portfolioValueAfter point if different
        if (trade.portfolioValueAfter && trade.portfolioValueAfter !== trade.portfolioValueBefore) {
          dataPoints.push({
            timestamp: trade.timestamp,
            value: trade.portfolioValueAfter,
            formattedTime: date.toLocaleTimeString(),
            formattedDate: date.toLocaleDateString()
          });
        }
      });

      // Add current portfolio value as the latest point
      const balances = accountData.balances;

      // Find BTC price from market data array
      const btcMarketData = marketData.data.find((asset: any) => asset.symbol === 'BTCUSDT');
      const btcPrice = btcMarketData ? parseFloat(btcMarketData.price) : 0;

      let currentValue = 0;
      balances.forEach((balance: any) => {
        if (balance.asset === 'USDT') {
          currentValue += balance.total;
        } else if (balance.asset === 'BTC') {
          currentValue += balance.total * btcPrice;
        }
      });

      const now = new Date();
      dataPoints.push({
        timestamp: now.toISOString(),
        value: currentValue,
        formattedTime: now.toLocaleTimeString(),
        formattedDate: now.toLocaleDateString()
      });

      setChartData(dataPoints);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching chart data:', err);
      setError(err.message || 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Portfolio Value Over Time</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Portfolio Value Over Time</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Portfolio Value Over Time</h2>
        <div className="text-center py-8 text-gray-500">
          No chart data available yet. Execute some trades to see your portfolio performance.
        </div>
      </div>
    );
  }

  // Determine if portfolio is in profit or loss
  const firstValue = chartData[0].value;
  const lastValue = chartData[chartData.length - 1].value;
  const isProfit = lastValue >= firstValue;

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="text-xs text-gray-600 mb-1">{data.formattedDate}</p>
          <p className="text-xs text-gray-600 mb-2">{data.formattedTime}</p>
          <p className="text-sm font-bold font-mono text-gray-900">
            ${data.value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Portfolio Value Over Time</h2>
        <button
          onClick={fetchChartData}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>

      <div className="w-full" style={{ height: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={isProfit ? "#22c55e" : "#ef4444"}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={isProfit ? "#22c55e" : "#ef4444"}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis
              dataKey="formattedTime"
              tick={{ fontSize: 11, fill: '#6b6b6b' }}
              stroke="#e5e5e5"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b6b6b' }}
              stroke="#e5e5e5"
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={isProfit ? "#22c55e" : "#ef4444"}
              strokeWidth={2}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Legend */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
        <span>
          {chartData.length} data points
        </span>
        <span>
          {firstValue > 0 && (
            <>
              Change: <span className={`font-mono font-semibold ${
                isProfit ? 'text-green-600' : 'text-red-600'
              }`}>
                {isProfit ? '+' : ''}${(lastValue - firstValue).toFixed(2)}
              </span>
              <span className="ml-1">
                ({isProfit ? '+' : ''}{((lastValue - firstValue) / firstValue * 100).toFixed(2)}%)
              </span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
