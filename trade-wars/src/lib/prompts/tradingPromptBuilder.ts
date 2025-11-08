// Unified Trading Prompt Builder
// Generates consistent prompts for all trading agents (OpenAI, Gemini, Grok)

import { Balance, OpenOrder } from '@/types/trading';
import { FormattedTradeHistory } from '@/lib/utils/tradeHistoryFormatter';
import { IndicatorFormat } from '@/lib/utils/technicalIndicators';
import { OrderBookAnalysis } from '@/lib/utils/orderBookAnalyzer';
import { MarketNewsData } from '@/lib/exa/marketNews';
import { formatOpenOrders } from '@/lib/prompts/openOrdersFormatter';
import { loadPlan } from '@/lib/storage/agentPlans';
import { getOpenOrders } from '@/lib/binance/openOrders';

// Asset-specific market data
interface AssetData {
  symbol: string;
  ticker: {
    lastPrice: number;
    priceChange: number;
    priceChangePercent: number;
    highPrice: number;
    lowPrice: number;
    volume: number;
    quoteVolume: number;
  } | null;
  klines: Array<{
    openTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    closeTime: number;
  }>;
  indicators: IndicatorFormat | null;
  orderBook: OrderBookAnalysis | null;
}

// Updated market intelligence for dual-asset strategy
export interface MarketIntelligence {
  symbols?: string[];
  btc?: AssetData;
  ada?: AssetData;
  balances: Balance[];
  tradeHistory: FormattedTradeHistory;
  marketNews: MarketNewsData | null;
  plan?: {
    text: string;
    lastUpdated: string;
  } | null;
  openOrders?: OpenOrder[];
  // Legacy single-asset support (backwards compatibility)
  symbol?: string;
  ticker?: AssetData['ticker'];
  klines?: AssetData['klines'];
  indicators?: IndicatorFormat;
  orderBook?: OrderBookAnalysis | null;
}

export interface PromptConfig {
  tone: 'cautious' | 'balanced' | 'aggressive';
  maxPositionPct: number;      // 0.20 = 20%
  minOrderUSD: number;          // 10
  decisionInterval: string;     // "4 hours"
  dailyOrderCap: number;        // 2
}

/**
 * Builds the system prompt with agent personality, risk parameters, and decision guidelines
 */
export function buildSystemPrompt(config: PromptConfig): string {
  // Long-term accumulation mindset (tone doesn't matter for this strategy)
  const agentRole = "You are a long-term cryptocurrency accumulation strategist managing a multi-year portfolio of Bitcoin (BTC) and Cardano (ADA). Your goal is to intelligently deploy available USDT capital during favorable market conditions and hold positions indefinitely through market cycles. You check markets every 8 hours to identify optimal entry opportunities, but patience is your greatest strength - it's better to wait days or weeks for the right price than to buy impulsively into pumps.";

  return `${agentRole}

You are an autonomous cryptocurrency accumulation agent operating on Binance testnet.
Your task is to synthesize comprehensive market intelligence and make patient, strategic accumulation decisions for BTC and ADA while honoring all safeguards.

INCOMING DATA SECTIONS:
- === PORTFOLIO & LIMITS === (USDT balance, BTC/ADA holdings, portfolio composition)
- === BTC MARKET DATA === (96-hour window, 4h candles, technical indicators, order book)
- === ADA MARKET DATA === (96-hour window, 4h candles, technical indicators, order book)
- === TRADE HISTORY === (Recent accumulation decisions)
- === MARKET NEWS & SENTIMENT === (if available)

INVESTMENT PHILOSOPHY:
- Time horizon: 10+ years (generational wealth building)
- Goal: Accumulate BTC and ADA during market weakness and dips
- Strategy: Patient capital deployment with smart timing (not mindless DCA)
- NEVER sell for profit-taking - only accumulate and hold
- Only sell for critical risk events (protocol failure, regulatory ban, black swan)

TRADING RULES:
- Assets: BTC/USDT and ADA/USDT spot only (no futures/leverage)
- You decide allocation: How much USDT to deploy, whether to buy BTC, ADA, or both
- Minimum order value: $${config.minOrderUSD} USD (Binance requirement)
- Decision interval: ${config.decisionInterval}
- Prefer LIMIT orders (2-5% below market) for better entries - >80% of buys should be limits
- Use MARKET orders ONLY for exceptional opportunities (extreme oversold, flash crashes)
- Max 3 open limit orders per asset (6 total across BTC + ADA)
- All limit prices must stay within ±5% of current market price
- If limit orders don't fill after 48 hours, reassess and adjust or cancel

ACCUMULATION ENTRY SIGNALS (When to BUY):
1. **Strong Buy Opportunity** (deploy 30-50% of available USDT):
   - RSI < 30 (oversold) for multiple 4h candles
   - Price down >20% from recent high
   - Panic selling / capitulation volume spike
   - Market news shows extreme fear

2. **Good Buy Opportunity** (deploy 15-30% of available USDT):
   - RSI 30-40 (mild oversold)
   - Price touching lower Bollinger Band
   - Pullback in uptrend (healthy correction)
   - Order book showing support building

3. **Normal Accumulation** (deploy 10-20% of available USDT):
   - RSI 40-50 (neutral)
   - No recent pump (price change <10% in 24h)
   - Steady accumulation conditions

SKIP BUYING (When to HOLD):
- ❌ Asset pumped >15% in last 24 hours → Wait for retrace/cooldown
- ❌ RSI > 70 (overbought) → Likely overheated, expect pullback
- ❌ Price >20% above recent average → Too extended, wait
- ❌ FOMO conditions (parabolic move, everyone bullish) → Trap, be patient
- ❌ No USDT available → Wait for next capital injection

SELLING GUIDELINES (RARELY USED):
- ✓ ONLY sell for critical risk management:
  - Extreme bubble (RSI > 90 for 10+ days, price >3x normal levels)
  - Protocol/security failure with BTC or ADA
  - Regulatory black swan event
- ❌ NEVER sell for profit-taking
- ❌ NEVER sell because "it went up a lot"
- Remember: You're building for 10+ years, not trading swings

CAPITAL DEPLOYMENT STRATEGY:
- You have full discretion over how much USDT to deploy
- Can deploy 10% for small opportunities
- Can deploy 50-100% for exceptional dips/crashes
- Can deploy 0% if market overheated (patience is key)
- Decide allocation between BTC and ADA based on:
  * Which asset is more oversold
  * Which asset has better entry price relative to recent history
  * Which asset shows more accumulation opportunity
  * Can do 100% BTC, 100% ADA, or split 50/50 - your choice

MULTI-ACTION PLAYBOOK:
1. Cancel stale limit orders if market conditions changed
2. Ladder limit orders at 2%, 3%, 4%, 5% below market for scale-in
3. Mix BTC and ADA orders in same cycle (e.g., buy BTC now, place ADA limits)

CRITICAL RULES:
- If BUY funds < $${config.minOrderUSD}, you MUST return action: "HOLD" (not BUY with 0 quantity)
- If SELL proceeds < $${config.minOrderUSD}, you MUST return action: "HOLD" (not SELL with 0 quantity)
- Never place an order below the minimum size
- Default to HOLD when in doubt - patience beats impulsive buying
- You MUST update the plan field every cycle with your strategic outlook and next intentions
- If you return multiple actions, each MUST include reasoning for the allocation decision
- Explicitly state which asset (BTC or ADA) you're prioritizing and why

Your reasoning must reference specific data points: RSI levels, price changes, market conditions for BOTH BTC and ADA.`;
}

/**
 * Helper function to format asset-specific market data section
 */
function formatAssetSection(asset: AssetData, assetName: string): string {
  if (!asset || !asset.ticker) {
    return `=== ${assetName} MARKET DATA ===\nData unavailable\n`;
  }

  const ticker = asset.ticker;
  const klines = asset.klines || [];

  // Calculate price range from klines
  let priceRangeText = 'N/A';
  if (klines.length > 0) {
    const high = Math.max(...klines.map(k => k.high));
    const low = Math.min(...klines.map(k => k.low));
    const avg = klines.reduce((sum, k) => sum + k.close, 0) / klines.length;
    priceRangeText = `$${low.toFixed(4)} - $${high.toFixed(4)} (avg: $${avg.toFixed(4)})`;
  }

  // Format indicators
  const indicatorsText = asset.indicators?.formatted || 'Indicators unavailable';

  // Format order book
  const orderBook = asset.orderBook;
  const orderBookSummary = orderBook?.summary ?? 'Order book unavailable';
  const orderBookBids = orderBook
    ? orderBook.formatted.bids.slice(0, 3).map((line, i) => `  ${i + 1}. ${line}`).join('\n')
    : '  No data';
  const orderBookAsks = orderBook
    ? orderBook.formatted.asks.slice(0, 3).map((line, i) => `  ${i + 1}. ${line}`).join('\n')
    : '  No data';

  return `=== ${assetName} MARKET DATA (96-hour window, 4h candles) ===
- Pair: ${asset.symbol}
- Current Price: $${ticker.lastPrice.toFixed(4)}
- 24h Change: ${ticker.priceChangePercent.toFixed(2)}% ($${ticker.priceChange.toFixed(4)})
- 24h High / Low: $${ticker.highPrice.toFixed(4)} / $${ticker.lowPrice.toFixed(4)}
- 96h Range: ${priceRangeText}
- 24h Volume: ${ticker.volume.toFixed(2)} ${assetName} | Quote: $${ticker.quoteVolume.toFixed(2)}

Technical Indicators:
${indicatorsText}

Order Book Summary:
${orderBookSummary}
Top 3 Bids:
${orderBookBids}
Top 3 Asks:
${orderBookAsks}
`;
}

/**
 * Builds the user prompt with all market intelligence data
 */
export function buildUserPrompt(
  marketData: MarketIntelligence,
  config: PromptConfig,
  dailyOrdersToday: number
): string {
  const openOrders = marketData.openOrders ?? [];

  // Calculate portfolio metrics
  const usdtBalance = marketData.balances.find(b => b.asset === 'USDT')?.total || 0;
  const btcBalance = marketData.balances.find(b => b.asset === 'BTC')?.total || 0;
  const adaBalance = marketData.balances.find(b => b.asset === 'ADA')?.total || 0;

  const btcPrice = marketData.btc?.ticker?.lastPrice || 0;
  const adaPrice = marketData.ada?.ticker?.lastPrice || 0;

  const btcValueUSD = btcBalance * btcPrice;
  const adaValueUSD = adaBalance * adaPrice;
  const portfolioValueUSD = usdtBalance + btcValueUSD + adaValueUSD;

  const openOrderExposure = openOrders.reduce((total, order) => total + order.price * order.quantity, 0);
  const exposurePercent = portfolioValueUSD > 0 ? (openOrderExposure / portfolioValueUSD) * 100 : 0;

  // Portfolio composition percentages
  const btcPercent = portfolioValueUSD > 0 ? (btcValueUSD / portfolioValueUSD) * 100 : 0;
  const adaPercent = portfolioValueUSD > 0 ? (adaValueUSD / portfolioValueUSD) * 100 : 0;
  const usdtPercent = portfolioValueUSD > 0 ? (usdtBalance / portfolioValueUSD) * 100 : 0;

  // Format trade history
  const tradeHistoryEntries = marketData.tradeHistory?.entries
    ?.map((entry, index) => `${index + 1}. ${entry}`)
    ?.join('\n') || 'No trade history available';

  // Format market news
  const marketNews = marketData.marketNews;
  const newsSection = marketNews?.formatted
    ? `\n=== MARKET NEWS & SENTIMENT ===\n${marketNews.formatted}\n`
    : '\n=== MARKET NEWS & SENTIMENT ===\nNo recent market research available\n';

  // Format asset sections
  const btcSection = marketData.btc ? formatAssetSection(marketData.btc, 'BITCOIN (BTC)') : '=== BITCOIN (BTC) DATA ===\nData unavailable\n';
  const adaSection = marketData.ada ? formatAssetSection(marketData.ada, 'CARDANO (ADA)') : '=== CARDANO (ADA) DATA ===\nData unavailable\n';

  return `MARKET INTELLIGENCE SUMMARY - ACCUMULATION STRATEGY

=== YOUR PREVIOUS PLAN ===
${formatPlanSection(marketData.plan, marketData.tradeHistory)}

=== PORTFOLIO & CAPITAL ===
Portfolio Composition:
- Total Value: $${portfolioValueUSD.toFixed(2)}
- USDT (Cash): $${usdtBalance.toFixed(2)} (${usdtPercent.toFixed(1)}%)
- BTC Holdings: ${btcBalance.toFixed(8)} BTC ≈ $${btcValueUSD.toFixed(2)} (${btcPercent.toFixed(1)}%)
- ADA Holdings: ${adaBalance.toFixed(2)} ADA ≈ $${adaValueUSD.toFixed(2)} (${adaPercent.toFixed(1)}%)

Capital Deployment:
- Available USDT: $${usdtBalance.toFixed(2)}
- You decide: How much to deploy (10-100% of USDT)
- You decide: Allocation between BTC and ADA
- Minimum Order Size: $${config.minOrderUSD} per trade
- Open Orders Exposure: $${openOrderExposure.toFixed(2)} (${exposurePercent.toFixed(1)}% of portfolio)
- Max Open Orders: 3 per asset (6 total)

${btcSection}

${adaSection}

=== RECENT ACCUMULATION HISTORY ===
${tradeHistoryEntries}
Summary: ${marketData.tradeHistory?.summary || 'No summary available'}
${formatOpenOrdersSection(openOrders)}
${newsSection}
DECISION REQUEST:
- Analyze BOTH BTC and ADA market conditions
- Decide capital deployment: How much USDT to use (0-100%)
- Decide allocation: BTC only, ADA only, or split between both
- Choose order type: LIMIT orders (2-5% below market) preferred, MARKET only for exceptional opportunities
- Justify with specific data: RSI levels, price changes, accumulation signals
- Remember: Default to HOLD if no good entry opportunity - patience beats impulsive buying
- Update your strategic plan for next cycle`;
}

/**
 * Main export function: builds both system and user prompts for trading agents
 *
 * @param marketData - Current market intelligence data
 * @param config - Prompt configuration (tone, risk parameters, etc.)
 * @param dailyOrdersToday - Number of orders placed today (for daily cap check)
 * @returns Object containing systemPrompt and userPrompt
 */
export function buildTradingPrompt(
  marketData: MarketIntelligence,
  config: PromptConfig,
  dailyOrdersToday: number
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = buildSystemPrompt(config);
  const userPrompt = buildUserPrompt(marketData, config, dailyOrdersToday);

  return {
    systemPrompt,
    userPrompt,
  };
}

export async function buildTradingPromptWithPlan(
  agentName: string,
  marketData: MarketIntelligence,
  config: PromptConfig,
  dailyOrdersToday: number,
  options?: {
    binanceApiKey?: string;
    binanceSecretKey?: string;
    symbol?: string;
    planOverride?: {
      text: string;
      lastUpdated: string;
    } | null;
    openOrdersOverride?: OpenOrder[];
  }
): Promise<{ systemPrompt: string; userPrompt: string }> {
  const symbol = options?.symbol ?? marketData.symbol;

  const fetchPlan = async () => {
    if (options?.planOverride !== undefined) {
      return options.planOverride;
    }

    return loadPlan(agentName).catch(error => {
      console.warn(`Failed to load plan for ${agentName}:`, error);
      return null;
    });
  };

  const fetchOpenOrders = async () => {
    if (options?.openOrdersOverride !== undefined) {
      return options.openOrdersOverride;
    }

    try {
      return await getOpenOrders(symbol, options?.binanceApiKey, options?.binanceSecretKey);
    } catch (error) {
      console.warn(`Failed to fetch open orders for ${symbol}:`, error);
      return marketData.openOrders ?? [];
    }
  };

  const [storedPlan, fetchedOpenOrders] = await Promise.all([fetchPlan(), fetchOpenOrders()]);

  const enrichedMarketData: MarketIntelligence = {
    ...marketData,
  plan: storedPlan
      ? {
          text: storedPlan.plan,
          lastUpdated: storedPlan.lastUpdated
        }
      : marketData.plan ?? null,
    openOrders: fetchedOpenOrders
  };

  return buildTradingPrompt(enrichedMarketData, config, dailyOrdersToday);
}

function formatPlanSection(
  plan: MarketIntelligence['plan'],
  history: FormattedTradeHistory
): string {
  const planText = plan?.text?.trim() || history.plan?.trim();

  if (!planText) {
    return 'No prior plan recorded.';
  }

  const timestamp = plan?.lastUpdated || history.planLastUpdated;
  const timestampText = timestamp ? ` (Last updated ${formatTimestampRelative(timestamp)})` : '';

  return `${planText}${timestampText}`;
}

function formatOpenOrdersSection(openOrders: OpenOrder[]): string {
  if (!openOrders.length) {
    return '\n=== OPEN ORDERS ===\nNo open orders.\n';
  }

  const lines = formatOpenOrders(openOrders);
  return `\n=== OPEN ORDERS ===\n${lines}\n`;
}

function formatTimestampRelative(timestamp: string): string {
  const parsed = new Date(timestamp).getTime();
  if (Number.isNaN(parsed)) {
    return 'at an unknown time';
  }

  const diffMs = Date.now() - parsed;
  if (diffMs < 0) {
    return 'just now';
  }

  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) {
    return 'moments ago';
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 1) {
    return `${diffMinutes}m ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 1) {
    return `${diffHours}h ago`;
  }

  return `${diffDays}d ago`;
}
