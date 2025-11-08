'use client';

/**
 * Council Debate Sheet Component
 *
 * Displays a live view of the LLM council debate as it happens.
 * Slide-in sheet from the right side with real-time event updates.
 */

import { useState, useEffect, useRef } from 'react';
import PhaseProgressBar from './PhaseProgressBar';
import ModelStatusCard from './ModelStatusCard';
import DebateFeedItem from './DebateFeedItem';

// Types
type Phase = 'proposal' | 'critique' | 'revision' | 'vote';
type ModelName = 'gpt-5-nano' | 'grok-4-fast' | 'google/gemini-2.5-flash';
type ModelStatus = 'idle' | 'thinking' | 'complete' | 'error' | 'timeout';

interface CouncilEvent {
  type: string;
  phase?: Phase;
  model?: ModelName;
  data?: any;
  timestamp: number;
  [key: string]: any;
}

interface ModelState {
  name: ModelName;
  displayName: string;
  status: ModelStatus;
  currentPhase?: Phase;
  decision?: any;
  lastUpdate?: number;
}

interface CouncilDebateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
}

export default function CouncilDebateSheet({ isOpen, onClose, onStart }: CouncilDebateSheetProps) {
  const [currentPhase, setCurrentPhase] = useState<Phase | null>(null);
  const [completedPhases, setCompletedPhases] = useState<Set<Phase>>(new Set());
  const [models, setModels] = useState<ModelState[]>([
    { name: 'gpt-5-nano', displayName: 'OpenAI', status: 'idle' },
    { name: 'grok-4-fast', displayName: 'Grok', status: 'idle' },
    { name: 'google/gemini-2.5-flash', displayName: 'Gemini', status: 'idle' },
  ]);
  const [events, setEvents] = useState<CouncilEvent[]>([]);
  const [finalDecision, setFinalDecision] = useState<any | null>(null);
  const [isDebating, setIsDebating] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

  const feedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll feed to bottom
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events]);

  // Start debate when sheet opens
  useEffect(() => {
    if (isOpen && !isDebating) {
      startDebate();
    }
  }, [isOpen]);

  const startDebate = async () => {
    setIsDebating(true);
    setStartTime(Date.now());
    setEvents([]);
    setFinalDecision(null);
    setCurrentPhase(null);
    setCompletedPhases(new Set());

    // Reset models
    setModels(prev => prev.map(m => ({ ...m, status: 'idle', currentPhase: undefined, decision: undefined })));

    // Notify parent
    onStart();

    // Use fetch with POST for SSE
    try {
      const response = await fetch('/api/council-decision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to start council debate');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      // Read SSE stream
      const readStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              setIsDebating(false);
              break;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const event: CouncilEvent = JSON.parse(line.slice(6));
                  handleEvent(event);
                } catch (e) {
                  console.error('Failed to parse event:', e);
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream read error:', error);
          setIsDebating(false);
          setEvents(prev => [...prev, {
            type: 'error',
            timestamp: Date.now(),
            error: 'Connection lost',
          }]);
        }
      };

      readStream();
    } catch (error: any) {
      console.error('Failed to start council debate:', error);
      setIsDebating(false);
      setEvents(prev => [...prev, {
        type: 'error',
        timestamp: Date.now(),
        error: error.message || 'Failed to start debate',
      }]);
    }
  };

  const handleEvent = (event: CouncilEvent) => {
    // Add to events feed
    setEvents(prev => [...prev, event]);

    switch (event.type) {
      case 'phase_start':
        setCurrentPhase(event.phase!);
        break;

      case 'model_start':
        setModels(prev => prev.map(m =>
          m.name === event.model
            ? { ...m, status: 'thinking', currentPhase: event.phase, lastUpdate: event.timestamp }
            : m
        ));
        break;

      case 'model_complete':
        setModels(prev => prev.map(m =>
          m.name === event.model
            ? { ...m, status: 'complete', decision: event.data, lastUpdate: event.timestamp }
            : m
        ));
        break;

      case 'model_error':
        setModels(prev => prev.map(m =>
          m.name === event.model
            ? { ...m, status: 'error', lastUpdate: event.timestamp }
            : m
        ));
        break;

      case 'model_timeout':
        setModels(prev => prev.map(m =>
          m.name === event.model
            ? { ...m, status: 'timeout', lastUpdate: event.timestamp }
            : m
        ));
        break;

      case 'consensus_check':
        // Phase complete when consensus is checked
        if (currentPhase) {
          setCompletedPhases(prev => new Set([...prev, currentPhase]));
        }
        break;

      case 'early_exit':
        if (currentPhase) {
          setCompletedPhases(prev => new Set([...prev, currentPhase]));
        }
        break;

      case 'vote_results':
        if (currentPhase) {
          setCompletedPhases(prev => new Set([...prev, currentPhase]));
        }
        break;

      case 'final_decision':
        setFinalDecision(event.decision);
        setIsDebating(false);
        // Reset models to complete
        setModels(prev => prev.map(m => ({ ...m, status: 'complete' })));
        break;

      case 'error':
        setIsDebating(false);
        break;
    }
  };

  const getElapsedTime = () => {
    if (!startTime) return '0.0s';
    const elapsed = (Date.now() - startTime) / 1000;
    return `${elapsed.toFixed(1)}s`;
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sheet */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="border-b border-gray-200 p-6 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              🏛️ Council Debate
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {isDebating ? `Debating... (${getElapsedTime()})` : finalDecision ? 'Decision reached' : 'Ready to start'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
            disabled={isDebating}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Phase Progress Bar */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <PhaseProgressBar
            currentPhase={currentPhase}
            completedPhases={completedPhases}
          />
        </div>

        {/* Model Status Cards */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            {models.map(model => (
              <ModelStatusCard
                key={model.name}
                model={model}
              />
            ))}
          </div>
        </div>

        {/* Debate Feed */}
        <div className="flex-1 overflow-y-auto p-6" ref={feedRef}>
          <div className="space-y-2">
            {events.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <p className="text-sm">Waiting for debate to start...</p>
              </div>
            )}
            {events.map((event, idx) => (
              <DebateFeedItem
                key={idx}
                event={event}
                startTime={startTime}
              />
            ))}
          </div>
        </div>

        {/* Final Decision Card */}
        {finalDecision && (
          <div className="p-6 border-t border-gray-200 bg-gradient-to-r from-green-50 to-white">
            <div className="bg-white border-2 border-green-500 rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                🏆 Final Decision
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-md text-sm font-semibold ${
                    finalDecision.action === 'BUY' ? 'bg-green-100 text-green-800' :
                    finalDecision.action === 'SELL' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {finalDecision.action}
                  </span>
                  <span className="text-sm font-mono text-gray-700">
                    {finalDecision.quantity.toFixed(8)} {finalDecision.asset}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-semibold">Selected:</span>{' '}
                  <span className="font-mono">{finalDecision._meta.selectedModel}</span>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-semibold">Consensus:</span>{' '}
                  <span className="capitalize">{finalDecision._meta.consensusType}</span>
                </div>
                {finalDecision._meta.voteScores && (
                  <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                    Vote scores: {JSON.stringify(finalDecision._meta.voteScores)}
                  </div>
                )}
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-xs text-gray-600 font-mono whitespace-pre-wrap">
                    {finalDecision.reasoning}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
