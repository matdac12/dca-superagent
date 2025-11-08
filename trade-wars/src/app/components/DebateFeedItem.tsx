'use client';

/**
 * Debate Feed Item Component
 *
 * Displays a single event in the debate feed with timestamp and content
 */

interface CouncilEvent {
  type: string;
  phase?: string;
  model?: string;
  data?: any;
  timestamp: number;
  result?: any;
  scores?: any[];
  decision?: any;
  error?: string;
  [key: string]: any;
}

interface DebateFeedItemProps {
  event: CouncilEvent;
  startTime: number | null;
}

export default function DebateFeedItem({ event, startTime }: DebateFeedItemProps) {
  const getElapsedTime = () => {
    if (!startTime) return '+0.0s';
    const elapsed = (event.timestamp - startTime) / 1000;
    return `+${elapsed.toFixed(1)}s`;
  };

  const getEventContent = () => {
    switch (event.type) {
      case 'phase_start':
        return {
          icon: '📋',
          text: `Phase started: ${event.phase?.toUpperCase()}`,
          bg: 'bg-blue-50',
          border: 'border-blue-200',
        };

      case 'model_start':
        return {
          icon: '🤖',
          text: `${event.model} generating ${event.phase}...`,
          bg: 'bg-gray-50',
          border: 'border-gray-200',
        };

      case 'model_complete':
        const decision = event.data;
        return {
          icon: '✅',
          text: `${event.model} completed: ${decision?.action || 'N/A'} ${decision?.quantity?.toFixed(4) || ''} ${decision?.asset || ''}`,
          bg: 'bg-green-50',
          border: 'border-green-200',
          detail: decision?.reasoning ? decision.reasoning.substring(0, 100) + '...' : null,
        };

      case 'model_error':
        return {
          icon: '❌',
          text: `${event.model} error: ${event.error}`,
          bg: 'bg-red-50',
          border: 'border-red-200',
        };

      case 'model_timeout':
        return {
          icon: '⏱️',
          text: `${event.model} timed out`,
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
        };

      case 'consensus_check':
        const result = event.result;
        if (result?.hasConsensus) {
          return {
            icon: '🎯',
            text: `${result.consensusType.toUpperCase()} consensus on ${result.agreedAction?.toUpperCase()}`,
            bg: 'bg-green-50',
            border: 'border-green-300',
            detail: `Median quantity: ${result.medianQuantity?.toFixed(8)} | Within tolerance: ${result.quantitiesWithinTolerance ? '✓' : '✗'}`,
          };
        } else {
          return {
            icon: '❌',
            text: 'No consensus reached',
            bg: 'bg-gray-50',
            border: 'border-gray-300',
          };
        }

      case 'early_exit':
        return {
          icon: '⚡',
          text: `Early exit: ${event.consensusType} agreement`,
          bg: 'bg-purple-50',
          border: 'border-purple-300',
        };

      case 'vote_results':
        const scores = event.scores || [];
        return {
          icon: '🗳️',
          text: 'Vote results:',
          bg: 'bg-indigo-50',
          border: 'border-indigo-200',
          detail: scores.map((s: any, idx: number) =>
            `${idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} ${s.model}: ${s.score} pts (${s.firstPlaceVotes} 1st)`
          ).join(' | '),
        };

      case 'final_decision':
        return {
          icon: '🏆',
          text: `Final decision: ${event.decision?.action} by ${event.decision?._meta?.selectedModel}`,
          bg: 'bg-green-100',
          border: 'border-green-400',
        };

      case 'error':
        return {
          icon: '🚨',
          text: `Error: ${event.error}`,
          bg: 'bg-red-100',
          border: 'border-red-400',
        };

      default:
        return {
          icon: '📝',
          text: `Unknown event: ${event.type}`,
          bg: 'bg-gray-50',
          border: 'border-gray-200',
        };
    }
  };

  const content = getEventContent();

  return (
    <div
      className={`
        p-3 rounded-md border animate-fade-in
        ${content.bg} ${content.border}
      `}
      style={{
        animation: 'fadeIn 0.3s ease-in',
      }}
    >
      <div className="flex items-start gap-2">
        {/* Icon */}
        <span className="text-lg flex-shrink-0">{content.icon}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Main Text */}
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-mono text-gray-500 flex-shrink-0">
              {getElapsedTime()}
            </span>
            <span className="text-sm text-gray-800 break-words">
              {content.text}
            </span>
          </div>

          {/* Detail Text */}
          {content.detail && (
            <div className="mt-1 text-xs text-gray-600 font-mono break-words">
              {content.detail}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Add fadeIn animation to global CSS if not already there
