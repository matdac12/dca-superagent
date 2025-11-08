import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

/**
 * Market News and Sentiment Analysis from Exa AI
 */

export interface MarketNewsData {
  answer: string;
  sentiment: 'positive' | 'negative' | 'steady';
  significantEvent: boolean;
  significantEvent_description?: string;
  thesis: string;
  keyDrivers: string;
  timestamp: number;
  formatted: string;
}

const STORAGE_PATH = path.join(process.cwd(), 'data', 'market-news.json');

/**
 * Fetch fresh market news and sentiment from Exa AI
 */
export async function fetchMarketNews(): Promise<MarketNewsData> {
  const client = new OpenAI({
    baseURL: "https://api.exa.ai",
    apiKey: process.env.EXA_API_KEY,
  });

  const completion = await client.chat.completions.create({
    model: "exa-pro",
    messages: [
      {
        role: "system",
        content: "You are a forward-looking Bitcoin market analyst. Focus on actionable, current information that could impact trading decisions in the next 72 hours (3 days). Ignore past events that the market has already digested."
      },
      {
        role: "user",
        content: `Analyze Bitcoin's outlook for the NEXT 72 HOURS (3 days). Focus on ACTIONABLE information:

CRITICAL: Only report events/information that could impact a trading decision made RIGHT NOW. Ignore past events from 24+ hours ago unless they are STILL actively developing.

1. UPCOMING CATALYSTS (Next 72 hours):
   - Scheduled events: Fed announcements, economic data releases, earnings reports
   - Pending decisions: Regulatory votes, exchange listings, protocol upgrades
   - Active developments: Ongoing institutional flows, live whale movements
   - Technical setups: Price approaching key levels RIGHT NOW

2. CURRENT MARKET THESIS:
   - Is the outlook for the next 72 hours bullish, bearish, or neutral?
   - Base this on FORWARD-LOOKING factors, not what already happened
   - Distinguish: "market is recovering from X" vs "X happened and is priced in"

3. KEY DRIVERS (Next 72 hours):
   Identify 3-5 factors that will ACTIVELY influence Bitcoin in the near term:
   - Real-time flows: Current ETF activity, whale wallet movements happening NOW
   - Imminent catalysts: Announcements, deadlines, or events in next 3 days
   - Technical price action: Are we testing support/resistance RIGHT NOW?
   - Macro schedule: What economic events are coming in next 72 hours?
   - Developing situations: Ongoing regulatory discussions, protocol issues

4. SIGNIFICANT EVENTS CHECK:
   - Is there a CURRENT or UPCOMING event (next 72h) that could cause volatility?
   - Examples: Fed meeting in 2 days, major exchange maintenance tomorrow, whale alert just now
   - Do NOT flag events from 2+ days ago unless still actively impacting price NOW

5. CURRENT SENTIMENT:
   - What is the live market sentiment RIGHT NOW (not yesterday)?
   - Fear & Greed Index current reading
   - Funding rates, open interest changes in last 4 hours

REMEMBER: Trading decisions are made NOW. Focus on what's happening NOW or what's ABOUT TO HAPPEN in the next 3 days, not what already happened and was digested.`
      }
    ],
    // @ts-ignore - extra_body is specific to Exa API
    extra_body: {
      userLocation: "US",
      outputSchema: {
        description: "Forward-looking Bitcoin market analysis focused on actionable information for the next 72 hours (3 days)",
        type: "object",
        properties: {
          answer: {
            type: "string",
            description: "Comprehensive forward-looking analysis covering UPCOMING catalysts, current developments, and 3-day outlook. Do NOT rehash old news."
          },
          sentiment: {
            type: "string",
            description: "Current market sentiment based on live data and near-term outlook (not historical events)",
            enum: ["positive", "negative", "steady"]
          },
          significantEvent: {
            type: "boolean",
            description: "Is there a CURRENT or UPCOMING event (next 72h) that could impact trading? Do NOT flag events from 2+ days ago unless STILL actively developing."
          },
          significantEvent_description: {
            type: "string",
            description: "Description of UPCOMING or CURRENT significant event. Must be something happening NOW or in next 72 hours. Include timing if known (e.g., 'Fed meeting in 2 days at 2PM EST')."
          },
          thesis: {
            type: "string",
            description: "Forward-looking market thesis for next 72 hours based on UPCOMING catalysts and current positioning, not past events that are already priced in"
          },
          keyDrivers: {
            type: "string",
            description: "3-5 ACTIONABLE drivers for next 72h as numbered list with timing and impact. Focus on: scheduled events, live flows, imminent catalysts, technical levels being tested NOW."
          }
        },
        required: ["answer", "sentiment", "significantEvent", "thesis", "keyDrivers"],
        additionalProperties: false
      }
    }
  }) as any;

  // The Exa API returns data in standard OpenAI chat completion format
  // The structured JSON is in choices[0].message.content as a string
  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error('Empty content from Exa API');
  }

  console.log('✓ Exa API response received');

  // Parse the JSON string
  const parsed = JSON.parse(content);
  const timestamp = Date.now();

  // Format for LLM consumption
  const formatted = formatForLLM(parsed, timestamp);

  const newsData: MarketNewsData = {
    answer: parsed.answer,
    sentiment: parsed.sentiment,
    significantEvent: parsed.significantEvent,
    significantEvent_description: parsed.significantEvent_description,
    thesis: parsed.thesis,
    keyDrivers: parsed.keyDrivers,
    timestamp,
    formatted
  };

  return newsData;
}

/**
 * Format market news data for LLM consumption (hybrid format)
 */
function formatForLLM(data: any, timestamp: number): string {
  const updatedTime = new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const sentimentEmoji = {
    positive: '📈',
    negative: '📉',
    steady: '➡️'
  }[data.sentiment] || '❓';

  let formatted = `=== MARKET NEWS & SENTIMENT (Updated: ${updatedTime}) ===\n`;
  formatted += `Sentiment: ${sentimentEmoji} ${data.sentiment.toUpperCase()}\n`;
  formatted += `Significant Event: ${data.significantEvent ? '⚠️ YES' : '✓ No major events'}\n`;

  if (data.significantEvent && data.significantEvent_description) {
    formatted += `Event Details: ${data.significantEvent_description}\n`;
  }

  formatted += `\nMarket Thesis:\n${data.thesis}\n`;
  formatted += `\nKey Drivers:\n${data.keyDrivers}\n`;
  formatted += `\nMarket Analysis:\n${data.answer}`;

  return formatted;
}

/**
 * Save market news data to disk
 */
export async function saveMarketNews(data: MarketNewsData): Promise<void> {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(STORAGE_PATH);
    await fs.mkdir(dataDir, { recursive: true });

    // Write to file
    await fs.writeFile(STORAGE_PATH, JSON.stringify(data, null, 2), 'utf-8');

    console.log('✓ Market news saved successfully');
  } catch (error) {
    console.error('Failed to save market news:', error);
    throw error;
  }
}

/**
 * Read stored market news from disk
 * Returns null if file doesn't exist or is invalid
 */
export async function getStoredMarketNews(): Promise<MarketNewsData | null> {
  try {
    const fileContent = await fs.readFile(STORAGE_PATH, 'utf-8');
    const data = JSON.parse(fileContent) as MarketNewsData;

    // Validate required fields
    if (!data.answer || !data.sentiment || data.significantEvent === undefined || !data.thesis || !data.keyDrivers || !data.timestamp) {
      console.warn('Invalid market news data structure - missing required fields');
      return null;
    }

    return data;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist yet - this is expected on first run
      return null;
    }
    console.warn('Failed to read stored market news:', error.message);
    return null;
  }
}

/**
 * Get market news age in human-readable format
 */
export function getNewsAge(timestamp: number): string {
  const ageMs = Date.now() - timestamp;
  const ageMinutes = Math.floor(ageMs / 60000);
  const ageHours = Math.floor(ageMinutes / 60);
  const ageDays = Math.floor(ageHours / 24);

  if (ageDays > 0) return `${ageDays}d ago`;
  if (ageHours > 0) return `${ageHours}h ago`;
  if (ageMinutes > 0) return `${ageMinutes}m ago`;
  return 'just now';
}
