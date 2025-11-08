export interface OrderLevel {
  price: number;
  quantity: number;
}

export interface OrderBookAnalysis {
  bestBid: OrderLevel | null;
  bestAsk: OrderLevel | null;
  spread: {
    absolute: number | null;
    percent: number | null;
  };
  supportLevels: OrderLevel[];
  resistanceLevels: OrderLevel[];
  imbalance: number;
  totalBidVolume: number;
  totalAskVolume: number;
  depthBidsNear: number;
  depthAsksNear: number;
  depthRatio: number;
  formatted: {
    bids: string[];
    asks: string[];
  };
  summary: string;
}

export function analyzeOrderBook(
  bids: Array<[string, string]>,
  asks: Array<[string, string]>
): OrderBookAnalysis {
  const parsedBids = parseLevels(bids, true);
  const parsedAsks = parseLevels(asks, false);

  const bestBid = parsedBids.length ? parsedBids[0] : null;
  const bestAsk = parsedAsks.length ? parsedAsks[0] : null;

  const spreadAbs = bestBid && bestAsk ? bestAsk.price - bestBid.price : null;
  const spreadPct = spreadAbs && bestAsk ? (spreadAbs / bestAsk.price) * 100 : null;

  const supportLevels = identifyStrongLevels(parsedBids, 3);
  const resistanceLevels = identifyStrongLevels(parsedAsks, 3);

  // Calculate imbalance and total volumes
  const { imbalance, totalBidVolume, totalAskVolume } = calculateImbalance(parsedBids, parsedAsks);

  // Calculate near-depth (within ±0.5% of mid price)
  const midPrice = bestBid && bestAsk ? (bestBid.price + bestAsk.price) / 2 : 0;
  const { depthBidsNear, depthAsksNear, depthRatio } = calculateNearDepth(parsedBids, parsedAsks, midPrice);

  const formattedBids = formatLevels(parsedBids, supportLevels, 'support');
  const formattedAsks = formatLevels(parsedAsks, resistanceLevels, 'resistance');

  const summary = buildSummary(
    bestBid,
    bestAsk,
    spreadAbs,
    spreadPct,
    supportLevels,
    resistanceLevels,
    imbalance,
    depthBidsNear,
    depthAsksNear,
    depthRatio
  );

  return {
    bestBid,
    bestAsk,
    spread: {
      absolute: spreadAbs,
      percent: spreadPct,
    },
    supportLevels,
    resistanceLevels,
    imbalance,
    totalBidVolume,
    totalAskVolume,
    depthBidsNear,
    depthAsksNear,
    depthRatio,
    formatted: {
      bids: formattedBids,
      asks: formattedAsks,
    },
    summary,
  };
}

function calculateImbalance(bids: OrderLevel[], asks: OrderLevel[]): { imbalance: number; totalBidVolume: number; totalAskVolume: number } {
  // Take top 10 levels from each side
  const top10Bids = bids.slice(0, 10);
  const top10Asks = asks.slice(0, 10);

  // Sum volumes
  const totalBidVolume = top10Bids.reduce((sum, level) => sum + level.quantity, 0);
  const totalAskVolume = top10Asks.reduce((sum, level) => sum + level.quantity, 0);

  // Calculate imbalance: (bids - asks) / (bids + asks)
  const totalVolume = totalBidVolume + totalAskVolume;
  const imbalance = totalVolume > 0 ? (totalBidVolume - totalAskVolume) / totalVolume : 0;

  return { imbalance, totalBidVolume, totalAskVolume };
}

function calculateNearDepth(
  bids: OrderLevel[],
  asks: OrderLevel[],
  midPrice: number
): { depthBidsNear: number; depthAsksNear: number; depthRatio: number } {
  // Calculate ±0.5% range from mid price
  const lowerBound = midPrice * 0.995;
  const upperBound = midPrice * 1.005;

  // Sum bid volumes where price >= lowerBound (within 0.5% below mid)
  const depthBidsNear = bids
    .filter(level => level.price >= lowerBound)
    .reduce((sum, level) => sum + level.quantity, 0);

  // Sum ask volumes where price <= upperBound (within 0.5% above mid)
  const depthAsksNear = asks
    .filter(level => level.price <= upperBound)
    .reduce((sum, level) => sum + level.quantity, 0);

  // Calculate depth ratio (avoid division by zero)
  const depthRatio = depthAsksNear > 0 ? depthBidsNear / depthAsksNear : 0;

  return { depthBidsNear, depthAsksNear, depthRatio };
}

function parseLevels(levels: Array<[string, string]>, isBids: boolean): OrderLevel[] {
  return levels
    .map(([price, quantity]) => ({
      price: parseFloat(price),
      quantity: parseFloat(quantity),
    }))
    .filter(level => Number.isFinite(level.price) && Number.isFinite(level.quantity))
    .sort((a, b) => {
      if (a.price === b.price) {
        return b.quantity - a.quantity;
      }
      return isBids ? b.price - a.price : a.price - b.price;
    });
}

function identifyStrongLevels(levels: OrderLevel[], count: number): OrderLevel[] {
  return [...levels]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, count)
    .sort((a, b) => b.price - a.price);
}

function formatLevels(levels: OrderLevel[], highlights: OrderLevel[], type: 'support' | 'resistance'): string[] {
  const highlightPrices = new Set(highlights.map(level => level.price));
  // Only return top 5 levels
  return levels.slice(0, 5).map(level => {
    const label = highlightPrices.has(level.price)
      ? type === 'support'
        ? '← Strong support'
        : '→ Strong resistance'
      : '';
    return `${level.price.toFixed(2)}: ${level.quantity.toFixed(4)} BTC ${label}`.trim();
  });
}

function buildSummary(
  bestBid: OrderLevel | null,
  bestAsk: OrderLevel | null,
  spreadAbs: number | null,
  spreadPct: number | null,
  supports: OrderLevel[],
  resistances: OrderLevel[],
  imbalance: number,
  depthBidsNear: number,
  depthAsksNear: number,
  depthRatio: number
): string {
  const parts: string[] = [];

  if (bestBid && bestAsk) {
    parts.push(
      `Best Bid: $${bestBid.price.toFixed(2)} | Best Ask: $${bestAsk.price.toFixed(2)} | Spread: $${spreadAbs?.toFixed(2) ?? 'n/a'} (${spreadPct?.toFixed(2) ?? 'n/a'}%)`
    );
  } else {
    parts.push('Order book incomplete');
  }

  // Add imbalance information
  const imbalancePercent = (imbalance * 100).toFixed(1);
  const imbalanceSign = imbalance > 0 ? '+' : '';
  const imbalanceLabel = imbalance > 0.15 ? 'bid-heavy' : imbalance < -0.15 ? 'ask-heavy' : 'balanced';
  parts.push(`Imbalance: ${imbalanceSign}${imbalancePercent}% (${imbalanceLabel})`);

  // Add near-depth information
  const depthRatioLabel = depthRatio > 1.2 ? 'bids stronger' : depthRatio < 0.8 ? 'asks stronger' : 'balanced';
  parts.push(
    `Near-depth (±0.5%): ${depthBidsNear.toFixed(4)} BTC bids / ${depthAsksNear.toFixed(4)} BTC asks | Ratio: ${depthRatio.toFixed(2)} (${depthRatioLabel})`
  );

  if (supports.length) {
    const levels = supports
      .map(level => `$${level.price.toFixed(2)} (${level.quantity.toFixed(4)} BTC)`)
      .join(', ');
    parts.push(`Support: ${levels}`);
  }

  if (resistances.length) {
    const levels = resistances
      .map(level => `$${level.price.toFixed(2)} (${level.quantity.toFixed(4)} BTC)`)
      .join(', ');
    parts.push(`Resistance: ${levels}`);
  }

  return parts.join(' | ');
}
