'use client';

/**
 * Model Status Card Component
 *
 * Shows the current state of each LLM model during the debate
 */

type ModelStatus = 'idle' | 'thinking' | 'complete' | 'error' | 'timeout';
type ModelName = 'gpt-5-nano' | 'grok-4-fast' | 'google/gemini-2.5-flash';

interface ModelState {
  name: ModelName;
  displayName: string;
  status: ModelStatus;
  currentPhase?: string;
  decision?: any;
  lastUpdate?: number;
}

interface ModelStatusCardProps {
  model: ModelState;
}

export default function ModelStatusCard({ model }: ModelStatusCardProps) {
  const getStatusColor = () => {
    switch (model.status) {
      case 'thinking':
        return 'border-blue-500 bg-blue-50';
      case 'complete':
        return 'border-green-500 bg-green-50';
      case 'error':
        return 'border-red-500 bg-red-50';
      case 'timeout':
        return 'border-gray-400 bg-gray-100';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const getStatusIcon = () => {
    switch (model.status) {
      case 'thinking':
        return (
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        );
      case 'complete':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'timeout':
        return (
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (model.status) {
      case 'thinking':
        return 'Thinking...';
      case 'complete':
        return 'Complete';
      case 'error':
        return 'Error';
      case 'timeout':
        return 'Timeout';
      default:
        return 'Ready';
    }
  };

  return (
    <div
      className={`
        border-2 rounded-lg p-4 transition-all duration-300
        ${getStatusColor()}
        ${model.status === 'thinking' ? 'shadow-lg scale-105' : 'shadow-sm'}
      `}
    >
      {/* Model Name */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm text-gray-800">{model.displayName}</span>
        {getStatusIcon()}
      </div>

      {/* Status Text */}
      <div className="text-xs text-gray-600 mb-2">
        {getStatusText()}
      </div>

      {/* Decision Preview (if available) */}
      {model.decision && model.decision.action && (
        <div className="mt-3 pt-3 border-t border-gray-300">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
              model.decision.action === 'BUY' ? 'bg-green-200 text-green-800' :
              model.decision.action === 'SELL' ? 'bg-red-200 text-red-800' :
              'bg-gray-200 text-gray-800'
            }`}>
              {model.decision.action}
            </span>
            <span className="text-xs font-mono text-gray-600">
              {model.decision.quantity?.toFixed(4)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
