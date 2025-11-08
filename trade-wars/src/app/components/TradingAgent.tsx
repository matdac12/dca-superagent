'use client';

import { useState } from 'react';
import CouncilDebateSheet from './CouncilDebateSheet';

interface TradingDecision {
  action: 'BUY' | 'SELL' | 'HOLD';
  asset: string;
  quantity: number;
  reasoning: string;
}

interface OrderResult {
  orderId: string;
  symbol: string;
  side: string;
  price: number;
  quantity: number;
  status: string;
  totalValue: number;
}

interface AgentResponse {
  success: boolean;
  timestamp: string;
  decision: TradingDecision;
  order?: OrderResult;
  executionError?: string;
  marketSnapshot: {
    price: number;
    priceChange24h: number;
  };
}

export default function TradingAgent() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastDecision, setLastDecision] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandReasoning, setExpandReasoning] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<number>(0);
  const [currentAI, setCurrentAI] = useState<'openai' | 'grok' | 'gemini' | null>(null);
  const [councilSheetOpen, setCouncilSheetOpen] = useState(false);

  const runAnalysis = async (aiModel: 'openai' | 'grok' | 'gemini') => {
    // Debouncing: Prevent spam clicks (3-second minimum between requests)
    const now = Date.now();
    if (now - lastRunTime < 3000) {
      setError('Please wait 3 seconds between analyses');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setLastRunTime(now);
    setCurrentAI(aiModel);

    try {
      // Choose endpoint based on AI model
      const endpoint =
        aiModel === 'grok' ? '/api/trading-agent-grok' :
        aiModel === 'gemini' ? '/api/trading-agent-gemini' :
        '/api/trading-agent';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setLastDecision(data);
        setError(null);
      } else {
        setError(data.error || 'Analysis failed');
        setLastDecision(null);
      }
    } catch (err: any) {
      console.error('Trading agent error:', err);
      setError(err.message || 'Failed to connect to trading agent');
      setLastDecision(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openCouncilDebate = () => {
    setCouncilSheetOpen(true);
  };

  const handleCouncilStart = () => {
    setIsAnalyzing(true);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'BUY':
        return 'text-green-600 bg-green-50';
      case 'SELL':
        return 'text-red-600 bg-red-50';
      case 'HOLD':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">AI Trading Agent</h2>
        <div className="flex items-center gap-2">
          {isAnalyzing && (
            <span className="text-sm text-gray-600">Analyzing...</span>
          )}
          <div className={`h-2 w-2 rounded-full ${isAnalyzing ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'}`} />
        </div>
      </div>

      {/* Four AI Analysis Buttons */}
      <div className="grid grid-cols-4 gap-3">
        <button
          onClick={() => runAnalysis('openai')}
          disabled={isAnalyzing}
          className={`py-3 px-4 text-sm font-medium transition-colors ${
            isAnalyzing && currentAI === 'openai'
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-black text-white hover:bg-black/90'
          }`}
        >
          {isAnalyzing && currentAI === 'openai' ? (
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
              Analyzing...
            </span>
          ) : (
            'OpenAI'
          )}
        </button>

        <button
          onClick={() => runAnalysis('grok')}
          disabled={isAnalyzing}
          className={`py-3 px-4 text-sm font-medium transition-colors ${
            isAnalyzing && currentAI === 'grok'
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-black text-white hover:bg-black/90'
          }`}
        >
          {isAnalyzing && currentAI === 'grok' ? (
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
              Analyzing...
            </span>
          ) : (
            'Grok'
          )}
        </button>

        <button
          onClick={() => runAnalysis('gemini')}
          disabled={isAnalyzing}
          className={`py-3 px-4 text-sm font-medium transition-colors ${
            isAnalyzing && currentAI === 'gemini'
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-black text-white hover:bg-black/90'
          }`}
        >
          {isAnalyzing && currentAI === 'gemini' ? (
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
              Analyzing...
            </span>
          ) : (
            'Gemini'
          )}
        </button>

        <button
          onClick={openCouncilDebate}
          disabled={isAnalyzing}
          className={`py-3 px-4 text-sm font-medium transition-colors border-2 ${
            isAnalyzing
              ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-white border-black text-black hover:bg-gray-50'
          }`}
        >
          Council
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Last Decision Display */}
      {lastDecision && (
        <div className="mt-6 space-y-4">
          {/* Decision Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-md text-sm font-semibold ${getActionColor(lastDecision.decision.action)}`}>
                {lastDecision.decision.action}
              </span>
              <span className="text-sm text-gray-600">
                {lastDecision.decision.quantity.toFixed(8)} {lastDecision.decision.asset}
              </span>
              {/* AI Model Badge */}
              <span className="text-xs text-gray-500 font-mono">
                via {currentAI === 'openai' ? 'OpenAI' : currentAI === 'grok' ? 'Grok' : 'Gemini'}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {new Date(lastDecision.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* Market Snapshot */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">
              Price: <span className="font-mono">${lastDecision.marketSnapshot.price.toFixed(2)}</span>
            </span>
            <span className={lastDecision.marketSnapshot.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'}>
              24h: {lastDecision.marketSnapshot.priceChange24h >= 0 ? '+' : ''}
              {lastDecision.marketSnapshot.priceChange24h.toFixed(2)}%
            </span>
          </div>

          {/* LLM Reasoning */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">AI Reasoning</h3>
              <button
                onClick={() => setExpandReasoning(!expandReasoning)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {expandReasoning ? 'Collapse' : 'Expand'}
              </button>
            </div>
            <p className={`text-sm text-gray-700 font-mono whitespace-pre-wrap ${
              expandReasoning ? '' : 'line-clamp-3'
            }`}>
              {lastDecision.decision.reasoning}
            </p>
          </div>

          {/* Order Result or Error */}
          {lastDecision.order && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h3 className="text-sm font-semibold text-green-800 mb-2">Order Executed</h3>
              <div className="space-y-1 text-sm text-green-700 font-mono">
                <div>Order ID: {lastDecision.order.orderId}</div>
                <div>Price: ${lastDecision.order.price.toFixed(2)}</div>
                <div>Quantity: {lastDecision.order.quantity.toFixed(8)} {lastDecision.decision.asset}</div>
                <div>Total: ${lastDecision.order.totalValue.toFixed(2)}</div>
                <div>Status: {lastDecision.order.status}</div>
              </div>
            </div>
          )}

          {lastDecision.executionError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h3 className="text-sm font-semibold text-yellow-800 mb-2">Execution Error</h3>
              <p className="text-sm text-yellow-700">{lastDecision.executionError}</p>
            </div>
          )}
        </div>
      )}

      {/* Council Debate Sheet */}
      <CouncilDebateSheet
        isOpen={councilSheetOpen}
        onClose={() => {
          setCouncilSheetOpen(false);
          setIsAnalyzing(false);
        }}
        onStart={handleCouncilStart}
      />
    </div>
  );
}
