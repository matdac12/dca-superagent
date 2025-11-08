'use client';

/**
 * Agent Card Component
 * Displays individual agent stats and provides manual trigger button
 */

import { useState } from 'react';

interface AgentStats {
  currentValue: number;
  roiPercent: number;
  absolutePnL: number;
  totalTrades: number;
}

interface AgentCardProps {
  agentName: string;
  displayName: string;
  stats: AgentStats;
  color: string;
}

// Map agent names to their API endpoints
const AGENT_ENDPOINTS: Record<string, string> = {
  openai: '/api/trading-agent',
  grok: '/api/trading-agent-grok',
  gemini: '/api/trading-agent-gemini',
  council: '/api/trading-agent-council',
};

export default function AgentCard({ agentName, displayName, stats, color }: AgentCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleTrigger = async () => {
    const endpoint = AGENT_ENDPOINTS[agentName];
    if (!endpoint) {
      setMessage({ type: 'error', text: 'Unknown agent' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // Check if execution was successful
      if (data.success) {
        // Extract action from new multi-action format
        const action = data.decision?.actions?.[0]?.type || data.decision?.action || 'UNKNOWN';

        // For council agent, show participant count
        let actionText = action;
        if (agentName === 'council' && data.meta) {
          const modelCount = data.meta.individualProposals?.length || 0;
          const consensusType = data.meta.consensusType || 'none';
          actionText = `${action} (${modelCount}/3 models, ${consensusType})`;
        }

        setMessage({
          type: 'success',
          text: `${displayName} executed: ${actionText}`,
        });
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Execution failed',
        });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to execute agent',
      });
    } finally {
      setIsLoading(false);

      // Auto-clear message after 5 seconds
      setTimeout(() => {
        setMessage(null);
      }, 5000);
    }
  };

  const isPositive = stats.roiPercent >= 0;

  return (
    <div className="border border-[var(--border)] bg-white p-5 hover:shadow-sm transition-all">
      {/* Header with agent name and color accent */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-1 h-8 rounded-full"
          style={{ backgroundColor: color }}
        />
        <h3 className="text-lg font-semibold">
          {displayName}
        </h3>
      </div>

      {/* Stats Grid */}
      <div className="space-y-3 mb-4">
        {/* Current Portfolio Value */}
        <div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">
            Portfolio Value
          </div>
          <div className="text-xl font-bold font-mono">
            ${stats.currentValue.toFixed(2)}
          </div>
        </div>

        {/* ROI % */}
        <div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">
            ROI
          </div>
          <div
            className={`text-xl font-bold font-mono ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isPositive ? '+' : ''}
            {stats.roiPercent.toFixed(2)}%
          </div>
        </div>

        {/* P&L and Trades Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Absolute P&L */}
          <div>
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">
              P&L
            </div>
            <div
              className={`text-sm font-mono ${
                isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {isPositive ? '+' : ''}${stats.absolutePnL.toFixed(2)}
            </div>
          </div>

          {/* Total Trades */}
          <div>
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">
              Trades
            </div>
            <div className="text-sm font-mono">
              {stats.totalTrades}
            </div>
          </div>
        </div>
      </div>

      {/* Trigger Button */}
      <button
        onClick={handleTrigger}
        disabled={isLoading}
        className={`
          w-full py-2.5 px-4 font-medium text-sm
          transition-all duration-200
          ${
            isLoading
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-black text-white hover:bg-black/90'
          }
        `}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
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
            Executing...
          </span>
        ) : (
          `Trigger ${displayName}`
        )}
      </button>

      {/* Message Toast */}
      {message && (
        <div
          className={`
            mt-3 p-3 text-sm border
            ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }
          `}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
