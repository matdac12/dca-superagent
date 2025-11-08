'use client';

/**
 * Single Agent Portfolio Chart Component
 * Displays portfolio value over time for a single agent
 */

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PortfolioDataPoint {
  timestamp: string;
  value: number;
}

interface SingleAgentChartProps {
  agentName: string;
  agentColor: string;
  agentDisplayName: string;
}

export default function SingleAgentChart({ agentName, agentColor, agentDisplayName }: SingleAgentChartProps) {
  const [data, setData] = useState<PortfolioDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPortfolioHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/portfolio-history');

        if (!response.ok) {
          throw new Error('Failed to fetch portfolio history');
        }

        const historyData = await response.json();

        // Transform data to extract only this agent's values
        const transformedData: PortfolioDataPoint[] = historyData.map((point: any) => ({
          timestamp: point.timestamp,
          value: point[agentName] || 0,
        }));

        setData(transformedData);
        setError(null);
      } catch (err) {
        console.error('Error fetching portfolio history:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chart data');
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioHistory();

    // Auto-refresh every 30 seconds
    const intervalId = setInterval(fetchPortfolioHistory, 30000);
    return () => clearInterval(intervalId);
  }, [agentName]);

  // Format timestamp for display (e.g., "Oct 15, 3:42 PM")
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Format dollar values for Y-axis
  const formatDollar = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="text-xs text-gray-600 mb-1">
            {formatTimestamp(label)}
          </p>
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: agentColor }}
            />
            <span className="text-xs text-gray-700">
              {agentDisplayName}
            </span>
            <span className="text-xs font-mono font-semibold text-gray-900 ml-2">
              ${payload[0].value.toFixed(2)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="animate-spin h-6 w-6 border-4 border-gray-300 border-t-blue-600 rounded-full" />
          <span className="text-sm text-gray-600">Loading chart...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 text-sm mb-2">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-gray-600 hover:text-gray-900 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No chart data available
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />

          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTimestamp}
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#6B7280' }}
          />

          <YAxis
            tickFormatter={formatDollar}
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#6B7280' }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Line
            type="monotone"
            dataKey="value"
            stroke={agentColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: agentColor }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
