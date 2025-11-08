'use client';

/**
 * Phase Progress Bar Component
 *
 * Minimal black & white visual indicator showing debate phases
 */

type Phase = 'proposal' | 'critique' | 'revision' | 'vote';

interface PhaseProgressBarProps {
  currentPhase: Phase | null;
  completedPhases: Set<Phase>;
}

const PHASES: { id: Phase; label: string; number: string }[] = [
  { id: 'proposal', label: 'Proposal', number: '1' },
  { id: 'critique', label: 'Critique', number: '2' },
  { id: 'revision', label: 'Revision', number: '3' },
  { id: 'vote', label: 'Vote', number: '4' },
];

export default function PhaseProgressBar({ currentPhase, completedPhases }: PhaseProgressBarProps) {
  const getPhaseStatus = (phaseId: Phase): 'pending' | 'active' | 'complete' => {
    if (completedPhases.has(phaseId)) return 'complete';
    if (currentPhase === phaseId) return 'active';
    return 'pending';
  };

  return (
    <div className="flex items-center justify-between">
      {PHASES.map((phase, index) => {
        const status = getPhaseStatus(phase.id);

        return (
          <div key={phase.id} className="flex items-center flex-1">
            {/* Phase Circle */}
            <div className="flex flex-col items-center gap-2">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-mono text-sm font-medium transition-all duration-200 border-2
                  ${status === 'complete' ? 'bg-black border-black text-white' : ''}
                  ${status === 'active' ? 'bg-black border-black text-white' : ''}
                  ${status === 'pending' ? 'bg-white border-gray-300 text-gray-400' : ''}
                `}
              >
                {status === 'complete' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{phase.number}</span>
                )}
              </div>

              {/* Phase Label */}
              <span
                className={`text-xs font-medium transition-colors ${
                  status === 'pending' ? 'text-gray-400' : 'text-gray-900'
                }`}
              >
                {phase.label}
              </span>
            </div>

            {/* Connector Line */}
            {index < PHASES.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-3 transition-all duration-300 ${
                  completedPhases.has(phase.id) ? 'bg-black' : 'bg-gray-300'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
