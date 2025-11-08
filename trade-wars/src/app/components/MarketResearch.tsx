'use client';

import { useState, useEffect } from 'react';

interface MarketNewsData {
  answer: string;
  sentiment: 'positive' | 'negative' | 'steady';
  significantEvent: boolean;
  significantEvent_description?: string;
  timestamp: number;
  formatted: string;
}

export default function MarketResearch() {
  const [isResearching, setIsResearching] = useState(false);
  const [lastResearch, setLastResearch] = useState<MarketNewsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch existing research on mount
  useEffect(() => {
    fetchExistingResearch();
  }, []);

  const fetchExistingResearch = async () => {
    try {
      const response = await fetch('/api/market-news');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setLastResearch(data.data);
        }
      }
    } catch (err) {
      // Silently fail - no research available yet
      console.log('No existing research found');
    }
  };

  const runResearch = async () => {
    setIsResearching(true);
    setError(null);

    try {
      const response = await fetch('/api/market-news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setLastResearch(data.data);
        setError(null);
      } else {
        setError(data.error || 'Research failed');
      }
    } catch (err: any) {
      console.error('Market research error:', err);
      setError(err.message || 'Failed to connect to research service');
    } finally {
      setIsResearching(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-50';
      case 'negative':
        return 'text-red-600 bg-red-50';
      case 'steady':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '📈';
      case 'negative':
        return '📉';
      case 'steady':
        return '➡️';
      default:
        return '❓';
    }
  };

  const getTimeAgo = (timestamp: number) => {
    const ageMs = Date.now() - timestamp;
    const ageMinutes = Math.floor(ageMs / 60000);
    const ageHours = Math.floor(ageMinutes / 60);
    const ageDays = Math.floor(ageHours / 24);

    if (ageDays > 0) return `${ageDays}d ago`;
    if (ageHours > 0) return `${ageHours}h ago`;
    if (ageMinutes > 0) return `${ageMinutes}m ago`;
    return 'just now';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Market Research</h2>
        <div className="flex items-center gap-2">
          {lastResearch && (
            <span className="text-xs text-gray-500">
              Updated {getTimeAgo(lastResearch.timestamp)}
            </span>
          )}
          <div className={`h-2 w-2 rounded-full ${isResearching ? 'bg-blue-500 animate-pulse' : lastResearch ? 'bg-green-500' : 'bg-gray-300'}`} />
        </div>
      </div>

      {/* Research Button */}
      <button
        onClick={runResearch}
        disabled={isResearching}
        className={`w-full py-3 px-4 text-sm font-medium transition-colors ${
          isResearching
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-black text-white hover:bg-black/90'
        }`}
      >
        {isResearching ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Researching...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            🔍 {lastResearch ? 'Refresh Research' : 'Research Market'}
          </span>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Research Results */}
      {lastResearch && (
        <div className="mt-6 space-y-4">
          {/* Quick Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-md text-sm font-semibold ${getSentimentColor(lastResearch.sentiment)}`}>
                {getSentimentEmoji(lastResearch.sentiment)} {lastResearch.sentiment.toUpperCase()}
              </span>
              {lastResearch.significantEvent && (
                <span className="px-3 py-1 rounded-md text-sm font-semibold text-orange-600 bg-orange-50">
                  ⚠️ SIGNIFICANT EVENT
                </span>
              )}
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          {/* Significant Event Description */}
          {lastResearch.significantEvent && lastResearch.significantEvent_description && (
            <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
              <h3 className="text-sm font-semibold text-orange-800 mb-2">Event Alert</h3>
              <p className="text-sm text-orange-700">{lastResearch.significantEvent_description}</p>
            </div>
          )}

          {/* Detailed Analysis */}
          {showDetails && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Market Analysis</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {lastResearch.answer}
              </p>
            </div>
          )}
        </div>
      )}

      {!lastResearch && !error && !isResearching && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Click "Research Market" to fetch latest news and sentiment
        </div>
      )}
    </div>
  );
}
