'use client';

/**
 * Multi-Agent Portfolio Chart Component
 * Displays 4-line chart showing portfolio values over time for all agents
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface PortfolioDataPoint {
  timestamp: string;
  openai: number;
  grok: number;
  gemini: number;
  council: number;
}

interface MultiAgentChartProps {
  data: PortfolioDataPoint[];
  singleAgentMode?: boolean; // If true, only show council line
}

// Agent colors matching the PRD specifications
const AGENT_COLORS = {
  openai: '#0A0B10',   // Black
  grok: '#FF8C42',     // Orange
  gemini: '#2FD1FF',   // Blue
  council: '#FFD700',  // Gold
};

// Agent display names
const AGENT_NAMES = {
  openai: 'OpenAI',
  grok: 'Grok',
  gemini: 'Gemini',
  council: 'Council',
};

export default function MultiAgentChart({ data, singleAgentMode = false }: MultiAgentChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        No chart data available
      </div>
    );
  }

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
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
          <p className="text-xs text-gray-400 mb-2">
            {formatTimestamp(label)}
          </p>
          <div className="space-y-1">
            {payload.map((entry: any) => (
              <div key={entry.dataKey} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs text-gray-300">
                    {AGENT_NAMES[entry.dataKey as keyof typeof AGENT_NAMES]}
                  </span>
                </div>
                <span className="text-xs font-mono font-semibold text-[var(--text)]">
                  ${entry.value.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate Y-axis domain (min-10%, max+10%) for better visualization
  const portfolioValues = data.map(d => d.council).filter(v => v > 0);
  const minValue = portfolioValues.length > 0 ? Math.min(...portfolioValues) : 0;
  const maxValue = portfolioValues.length > 0 ? Math.max(...portfolioValues) : 100000;
  const yMin = minValue * 0.9;  // 10% below minimum
  const yMax = maxValue * 1.1;  // 10% above maximum

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />

          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTimestamp}
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#9CA3AF' }}
          />

          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={formatDollar}
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#9CA3AF' }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{
              paddingTop: '20px',
            }}
            iconType="line"
            formatter={(value) => (
              <span className="text-sm text-gray-300">
                {AGENT_NAMES[value as keyof typeof AGENT_NAMES]}
              </span>
            )}
          />

          {/* Conditional rendering based on mode */}
          {!singleAgentMode && (
            <>
              {/* OpenAI Agent Line */}
              <Line
                type="monotone"
                dataKey="openai"
                stroke={AGENT_COLORS.openai}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />

              {/* Grok Agent Line */}
              <Line
                type="monotone"
                dataKey="grok"
                stroke={AGENT_COLORS.grok}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />

              {/* Gemini Agent Line */}
              <Line
                type="monotone"
                dataKey="gemini"
                stroke={AGENT_COLORS.gemini}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </>
          )}

          {/* Council Agent Line - always shown */}
          <Line
            type="monotone"
            dataKey="council"
            stroke={AGENT_COLORS.council}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
