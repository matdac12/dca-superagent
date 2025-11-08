'use client';

/**
 * Model Contribution Chart - Simplified
 * Single row showing selection counts for each model
 */

interface ModelStats {
  timesSelected: number;
  winRate: number;
  avgPnL: number;
}

interface ModelContribution {
  openai: ModelStats;
  grok: ModelStats;
  gemini: ModelStats;
}

interface ModelContributionChartProps {
  data: ModelContribution;
}

export default function ModelContributionChart({ data }: ModelContributionChartProps) {
  const models = [
    { key: 'openai', name: 'OpenAI', count: data.openai.timesSelected },
    { key: 'grok', name: 'Grok', count: data.grok.timesSelected },
    { key: 'gemini', name: 'Gemini', count: data.gemini.timesSelected },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {models.map((model) => (
        <div key={model.key} className="bg-gray-50 rounded-lg p-4">
          <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">{model.name}</div>
          <div className="text-xl font-bold font-mono text-gray-900">
            {model.count}
          </div>
        </div>
      ))}
    </div>
  );
}
