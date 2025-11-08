'use client';

/**
 * Debate Viewer Component
 *
 * Displays council debate details with expand/collapse functionality.
 * Shows consensus badge, selected model, vote summary (collapsed state).
 * Shows full reasoning from each model with checkmarks for winner (expanded state).
 */

import { useState } from 'react';
import { CouncilMetadata } from '@/lib/council/types';

interface DebateViewerProps {
  councilMetadata?: CouncilMetadata;
  defaultExpanded?: boolean;
}

export default function DebateViewer({ councilMetadata, defaultExpanded = false }: DebateViewerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Handle missing metadata
  if (!councilMetadata) {
    return (
      <div className="bg-white border border-[var(--border)] rounded-lg p-4">
        <div className="text-[var(--text-muted)] text-sm">
          Debate data not available
        </div>
      </div>
    );
  }

  const { consensusType, selectedModel, individualProposals, voteScores, voteBreakdown } = councilMetadata;

  // Convert proposals to array format (backward compatibility)
  // Old format: array, New format: object with openai/grok/gemini keys
  let proposalsArray: any[] = [];
  if (Array.isArray(individualProposals)) {
    // Old format: already an array
    proposalsArray = individualProposals;
  } else if (individualProposals && typeof individualProposals === 'object') {
    // New format: convert object to array
    Object.entries(individualProposals).forEach(([modelKey, proposal]: [string, any]) => {
      if (proposal) {
        const modelName = modelKey === 'openai' ? 'gpt-5-nano'
          : modelKey === 'grok' ? 'grok-4-fast'
          : modelKey === 'gemini' ? 'google/gemini-2.5-flash'
          : modelKey;

        proposalsArray.push({
          model: modelName,
          actions: [{ type: proposal.action }],
          reasoning: proposal.reasoning,
          plan: proposal.plan,
        });
      }
    });
  }

  // Map model names for display
  const modelDisplayNames: Record<string, string> = {
    'openai': 'OpenAI',
    'grok': 'Grok',
    'gemini': 'Gemini',
  };

  // Model brand colors - using light theme
  const modelColors: Record<string, { bg: string; text: string; border: string }> = {
    'openai': { bg: 'bg-gray-100', text: 'text-gray-900', border: 'border-gray-300' },
    'grok': { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-300' },
    'gemini': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-300' },
  };

  // Consensus badge styling - using light theme
  const consensusBadge = consensusType === 'UNANIMOUS'
    ? { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', label: 'UNANIMOUS' }
    : { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300', label: 'MAJORITY' };

  // Get vote summary from voteBreakdown
  const voteSummary = voteBreakdown && (voteBreakdown.BUY || voteBreakdown.SELL || voteBreakdown.HOLD)
    ? `${voteBreakdown.BUY}B / ${voteBreakdown.SELL}S / ${voteBreakdown.HOLD}H`
    : null;

  return (
    <div className="bg-white border border-[var(--border)] rounded-lg overflow-hidden">
      {/* Collapsed Header - Always Visible */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Consensus Badge */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${consensusBadge.bg} ${consensusBadge.text} ${consensusBadge.border}`}
            >
              {consensusBadge.label}
            </span>

            {/* Selected Model */}
            <div className="text-sm text-[var(--text-muted)]">
              Selected: <span className="text-[var(--text)] font-bold">{modelDisplayNames[selectedModel]}</span>
            </div>

            {/* Vote Summary (only show if available) */}
            {voteSummary && (
              <div className="text-xs text-[var(--text-muted)]">
                Votes: <span className="font-[family-name:var(--font-mono)]">{voteSummary}</span>
              </div>
            )}
          </div>

          {/* Expand/Collapse Button */}
          <button
            className="text-blue-600 hover:text-blue-700 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            <svg
              className={`w-6 h-6 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Content - Model Proposals */}
      {isExpanded && (
        <div className="border-t border-[var(--border)] p-4 space-y-4 animate-fade-in">
          <div className="text-sm font-bold mb-3">
            Individual Model Proposals
          </div>

          {proposalsArray && proposalsArray.length > 0 ? (
            <div className="space-y-3">
              {proposalsArray.map((proposal, index) => {
                const modelKey = proposal.model.includes('gpt') ? 'openai'
                  : proposal.model.includes('grok') ? 'grok'
                  : proposal.model.includes('gemini') ? 'gemini'
                  : 'openai';

                const displayName = modelDisplayNames[modelKey];
                const colors = modelColors[modelKey];
                const isWinner = selectedModel === modelKey;
                const action = proposal.actions?.[0]?.type || 'UNKNOWN';
                const reasoning = proposal.reasoning || 'No reasoning provided';

                return (
                  <div
                    key={index}
                    className={`rounded-lg border p-4 ${colors.bg} ${colors.border}`}
                  >
                    {/* Model Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {/* Model Indicator */}
                        <div className={`w-3 h-3 rounded-full ${colors.border} border-2`}></div>

                        {/* Model Name */}
                        <span className={`font-bold ${colors.text}`}>{displayName}</span>

                        {/* Action Badge */}
                        <span className="px-2 py-0.5 bg-gray-800 rounded text-xs font-[family-name:var(--font-mono)] text-white">
                          {action}
                        </span>

                        {/* Winner Checkmark */}
                        {isWinner && (
                          <span className="ml-2 text-green-600" title="Selected by council">
                            ✓ Selected
                          </span>
                        )}
                      </div>

                      {/* Vote Score (if available) */}
                      {voteScores && voteScores[proposal.model] !== undefined && (
                        <div className="text-xs text-[var(--text-muted)]">
                          Score: <span className="font-bold">{voteScores[proposal.model]}</span>
                        </div>
                      )}
                    </div>

                    {/* Model Reasoning */}
                    <div className="text-sm text-[var(--text-muted)] leading-relaxed">
                      {reasoning}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-[var(--text-muted)] text-sm">
              No individual proposals available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
