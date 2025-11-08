'use client';

import { useMemo, useState } from 'react';

interface AgentPlanCardProps {
  agentName: string;
  displayName: string;
  plan?: string;
  lastUpdated?: string;
  color: string;
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

export function AgentPlanCard({ agentName, displayName, plan, lastUpdated, color }: AgentPlanCardProps) {
  const [expanded, setExpanded] = useState(false);

  const planText = plan ?? '';

  const planPreview = useMemo(() => {
    if (planText.length <= 220 || expanded) return planText;
    return `${planText.slice(0, 220)}...`;
  }, [planText, expanded]);

  return (
    <article
      className="rounded-xl shadow-md text-white p-5 flex flex-col gap-4"
      style={{ backgroundColor: '#8A5CFF' }}
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold uppercase tracking-wide" style={{ color }}>
              {agentName}
            </span>
            <span className="text-xs text-white/70">{displayName}</span>
          </div>
          <h2 className="text-lg font-semibold mt-1">Strategic Plan</h2>
        </div>
        {lastUpdated ? (
          <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-md">
            Updated {formatRelativeTime(lastUpdated)}
          </span>
        ) : (
          <span className="text-xs bg-white/10 text-white/70 px-2 py-1 rounded-md">
            Not updated yet
          </span>
        )}
      </header>

      <p className="text-sm leading-relaxed whitespace-pre-line text-white/90">
        {planPreview || 'No plan available.'}
      </p>

      {planText.length > 220 && (
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="self-start text-xs font-semibold text-white hover:text-white/80 transition"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </article>
  );
}

export default AgentPlanCard;
