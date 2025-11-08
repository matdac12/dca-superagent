import { promises as fs } from 'fs';
import path from 'path';

export interface AgentPlan {
  agentName: string;
  plan: string;
  lastUpdated: string;
}

const PLANS_DIR = path.join(process.cwd(), 'data', 'agent-plans');

export const SUPPORTED_AGENT_PLAN_NAMES = [
  'openai',
  'grok',
  'gemini',
  'council',
  'council-openai',
  'council-grok',
  'council-gemini'
] as const;

const SUPPORTED_AGENT_PLAN_NAME_SET = new Set<string>(SUPPORTED_AGENT_PLAN_NAMES);

function normalizeAgentName(agentName: string): string {
  const normalized = agentName.toLowerCase();

  if (SUPPORTED_AGENT_PLAN_NAME_SET.has(normalized)) {
    return normalized;
  }

  return normalized.replace(/[^a-z0-9-]/g, '-');
}

function getPlanFilePath(agentName: string): string {
  const normalized = normalizeAgentName(agentName);
  return path.join(PLANS_DIR, `${normalized}-plan.json`);
}

function formatTimestamp(date = new Date()): string {
  return date.toISOString();
}

export async function savePlan(agentName: string, plan: string): Promise<void> {
  if (!plan.trim()) {
    throw new Error('Plan cannot be empty');
  }

  // Removed plan length limit to allow detailed plans
  const filePath = getPlanFilePath(agentName);

  try {
    await fs.mkdir(PLANS_DIR, { recursive: true });

    const agentPlan: AgentPlan = {
      agentName: normalizeAgentName(agentName),
      plan,
      lastUpdated: formatTimestamp()
    };

    await fs.writeFile(filePath, JSON.stringify(agentPlan, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Failed to save plan for ${agentName}:`, error);
    throw error;
  }
}

export async function loadPlan(agentName: string): Promise<AgentPlan | null> {
  const filePath = getPlanFilePath(agentName);

  try {
    await fs.mkdir(PLANS_DIR, { recursive: true });

    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw);

    if (!data || typeof data !== 'object') {
      return null;
    }

    const plan = typeof data.plan === 'string' ? data.plan.trim() : '';
    const lastUpdated = typeof data.lastUpdated === 'string' ? data.lastUpdated.trim() : '';

    if (!plan || !lastUpdated) {
      return null;
    }

    return {
      agentName: typeof data.agentName === 'string' ? data.agentName : normalizeAgentName(agentName),
      plan,
      lastUpdated
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }

    console.error(`Failed to load plan for ${agentName}:`, error);
    throw error;
  }
}
