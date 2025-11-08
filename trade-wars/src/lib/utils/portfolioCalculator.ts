import { Balance } from '@/types/trading';

/**
 * Calculates the total portfolio value in USDT
 * Converts all asset balances to USDT equivalent using current market prices
 */
export function calculateTotalPortfolioValue(
  balances: Balance[],
  currentPrices: Record<string, number>
): number {
  let totalValue = 0;

  // Only calculate value for assets we trade (BTC and USDT)
  // Silently ignore other testnet coins to avoid log spam
  const tradedAssets = new Set(['BTC', 'USDT']);

  for (const balance of balances) {
    if (balance.asset === 'USDT') {
      // USDT is already in USDT, just add it directly
      totalValue += balance.total;
    } else if (tradedAssets.has(balance.asset)) {
      // Only convert traded assets to USDT
      const priceKey = `${balance.asset}USDT`;
      const price = currentPrices[priceKey];

      if (price !== undefined) {
        totalValue += balance.total * price;
      } else {
        // Only warn about assets we actually trade
        console.warn(`No price found for ${priceKey}, excluding from portfolio calculation`);
      }
    }
    // Silently skip other assets (testnet coins we don't trade)
  }

  return totalValue;
}

/**
 * Normalizes asset name to base currency
 * Examples: "BTC/USDT" -> "BTC", "BTCUSDT" -> "BTC", "BTC" -> "BTC"
 */
function normalizeAsset(asset: string): string {
  const upper = asset.toUpperCase();

  // Remove "/USDT" suffix if present
  if (upper.includes('/')) {
    return upper.split('/')[0];
  }

  // Remove "USDT" suffix if present (e.g., "BTCUSDT" -> "BTC")
  if (upper.endsWith('USDT')) {
    return upper.slice(0, -4);
  }

  // Return as-is if no suffix
  return upper;
}

/**
 * Calculates the value of a specific asset in USDT
 */
export function calculateAssetValueUSD(
  asset: string,
  quantity: number,
  currentPrices: Record<string, number>
): number {
  const normalizedAsset = normalizeAsset(asset);

  if (normalizedAsset === 'USDT') {
    return quantity;
  }

  const priceKey = `${normalizedAsset}USDT`;
  const price = currentPrices[priceKey];

  if (price === undefined) {
    throw new Error(`No price found for ${priceKey}`);
  }

  return quantity * price;
}

/**
 * Calculates the maximum trade value allowed (50% of portfolio)
 */
export function calculateMaxTradeValue(
  balances: Balance[],
  currentPrices: Record<string, number>
): number {
  const portfolioValue = calculateTotalPortfolioValue(balances, currentPrices);
  return portfolioValue * 0.50; // 50% of total portfolio - AGGRESSIVE MODE
}

/**
 * Validates if a trade respects the 50% position size limit
 */
export function validateTradeSize(
  tradeValueUSD: number,
  balances: Balance[],
  currentPrices: Record<string, number>
): { valid: boolean; maxAllowed: number; portfolioValue: number } {
  const portfolioValue = calculateTotalPortfolioValue(balances, currentPrices);
  const maxAllowed = portfolioValue * 0.50;

  return {
    valid: tradeValueUSD <= maxAllowed,
    maxAllowed,
    portfolioValue
  };
}

/**
 * Adjusts trade quantity to comply with 50% position size limit if needed
 * Returns the adjusted quantity and whether adjustment was made
 */
export function adjustQuantityToLimit(
  asset: string,
  requestedQuantity: number,
  balances: Balance[],
  currentPrices: Record<string, number>
): { adjustedQuantity: number; wasAdjusted: boolean; reason?: string } {
  // Calculate requested trade value
  const requestedValueUSD = calculateAssetValueUSD(asset, requestedQuantity, currentPrices);

  // Get max allowed trade value (50% of portfolio)
  const maxTradeValue = calculateMaxTradeValue(balances, currentPrices);

  // If requested value is within limit, no adjustment needed
  if (requestedValueUSD <= maxTradeValue) {
    return {
      adjustedQuantity: requestedQuantity,
      wasAdjusted: false
    };
  }

  // Calculate adjusted quantity that respects the 50% limit
  const normalizedAsset = normalizeAsset(asset);
  const price = normalizedAsset === 'USDT' ? 1 : currentPrices[`${normalizedAsset}USDT`];

  if (price === undefined) {
    throw new Error(`No price found for ${normalizedAsset}USDT`);
  }

  const adjustedQuantity = maxTradeValue / price;

  return {
    adjustedQuantity,
    wasAdjusted: true,
    reason: `Requested ${requestedQuantity} ${asset} ($${requestedValueUSD.toFixed(2)}) exceeds 50% limit of $${maxTradeValue.toFixed(2)}. Adjusted to ${adjustedQuantity.toFixed(8)} ${asset}.`
  };
}
