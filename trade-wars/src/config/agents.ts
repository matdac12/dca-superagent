/**
 * Agent Configuration System
 * Centralized configuration for all 4 accumulation agents
 *
 * STRATEGY: Long-term accumulation of BTC and ADA
 * FREQUENCY: 3x daily (every 8 hours)
 * APPROACH: Patient capital deployment during market weakness
 */

export interface AgentConfig {
  name: 'openai' | 'grok' | 'gemini' | 'kimi' | 'deepseek' | 'council';
  displayName: string;
  color: string;
  binanceApiKey: string;
  binanceSecretKey: string;
  llmProvider: 'openai' | 'xai' | 'google' | 'openrouter' | 'council';
  llmModel: string;
}

/**
 * All agent configurations
 * Council members collaborate to make unified BTC/ADA accumulation decisions
 * Colors: OpenAI (Black), Grok (Orange), Gemini (Blue), Kimi (Green), DeepSeek (Red), Council (Gold)
 */
const AGENTS: AgentConfig[] = [
  {
    name: 'openai',
    displayName: 'OpenAI',
    color: '#0A0B10',
    binanceApiKey: process.env.BINANCE_COUNCIL_API_KEY || '',
    binanceSecretKey: process.env.BINANCE_COUNCIL_SECRET_KEY || '',
    llmProvider: 'openai',
    llmModel: 'gpt-5-nano',
  },
  {
    name: 'grok',
    displayName: 'Grok',
    color: '#FF8C42',
    binanceApiKey: process.env.BINANCE_COUNCIL_API_KEY || '',
    binanceSecretKey: process.env.BINANCE_COUNCIL_SECRET_KEY || '',
    llmProvider: 'xai',
    llmModel: 'grok-4-fast',
  },
  {
    name: 'gemini',
    displayName: 'Gemini',
    color: '#2FD1FF',
    binanceApiKey: process.env.BINANCE_COUNCIL_API_KEY || '',
    binanceSecretKey: process.env.BINANCE_COUNCIL_SECRET_KEY || '',
    llmProvider: 'openrouter',
    llmModel: 'google/gemini-2.5-flash',
  },
  {
    name: 'kimi',
    displayName: 'Kimi K2',
    color: '#3DFFB8',
    binanceApiKey: process.env.BINANCE_COUNCIL_API_KEY || '',
    binanceSecretKey: process.env.BINANCE_COUNCIL_SECRET_KEY || '',
    llmProvider: 'openrouter',
    llmModel: 'moonshotai/kimi-k2-thinking',
  },
  {
    name: 'deepseek',
    displayName: 'DeepSeek',
    color: '#FF4D6D',
    binanceApiKey: process.env.BINANCE_COUNCIL_API_KEY || '',
    binanceSecretKey: process.env.BINANCE_COUNCIL_SECRET_KEY || '',
    llmProvider: 'openrouter',
    llmModel: 'deepseek/deepseek-chat-v3-0324',
  },
  {
    name: 'council',
    displayName: 'Council',
    color: '#FFD700',
    binanceApiKey: process.env.BINANCE_COUNCIL_API_KEY || '',
    binanceSecretKey: process.env.BINANCE_COUNCIL_SECRET_KEY || '',
    llmProvider: 'council',
    llmModel: '5-model-consensus',
  },
];

/**
 * Get configuration for a specific agent by name
 * @param name - Agent name ('openai' | 'grok' | 'gemini' | 'council')
 * @returns Agent configuration or undefined if not found
 */
export function getAgentConfig(name: string): AgentConfig | undefined {
  return AGENTS.find((agent) => agent.name === name);
}

/**
 * Get all agent configurations
 * @returns Array of all 4 agent configurations
 */
export function getAllAgents(): AgentConfig[] {
  return AGENTS;
}
