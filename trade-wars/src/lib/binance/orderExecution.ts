import { Spot } from '@binance/connector';
import { Balance, TradingDecision } from '@/types/trading';

// Initialize Binance client
function getBinanceClient(apiKey?: string, secretKey?: string) {
  // Use provided keys if available, otherwise fall back to default OpenAI keys for backward compatibility
  const key = apiKey || process.env.BINANCE_OPENAI_API_KEY || process.env.BINANCE_API_KEY;
  const secret = secretKey || process.env.BINANCE_OPENAI_SECRET_KEY || process.env.BINANCE_SECRET_KEY;

  return new Spot(
    key,
    secret,
    {
      baseURL: 'https://testnet.binance.vision'
    }
  );
}

interface OrderResult {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: number;
  quantity: number;
  status: string;
  executedQty: number;
  cummulativeQuoteQty: number;
  transactTime: number;
}

interface BalanceCheckResult {
  sufficient: boolean;
  required: number;
  available: number;
  asset: string;
  message?: string;
}

interface CancelResult {
  orderId: string;
  symbol: string;
  status: string;
}

// Removed legacy balance verification functions (verifyBuyBalance, verifySellBalance, verifyBalance)
// These used the old single-action schema and are replaced by the multi-action executor
// See: src/lib/execution/multiActionExecutor.ts and src/lib/execution/orderValidator.ts

interface SymbolInfo {
  precision: number;
  pricePrecision: number;
  minNotional: number;
}

/**
 * Fetches symbol info from Binance and extracts LOT_SIZE stepSize and MIN_NOTIONAL
 * Returns the precision (number of decimal places) for quantity and minimum order value
 */
async function getSymbolInfo(symbol: string, apiKey?: string, secretKey?: string): Promise<SymbolInfo> {
  const client = getBinanceClient(apiKey, secretKey);

  const fetchInfo = async () => {
    console.log(`Fetching symbol info for ${symbol}...`);
    const exchangeInfo = await client.exchangeInfo({ symbol });

    console.log(`Exchange info response:`, JSON.stringify(exchangeInfo.data, null, 2));

    const symbolInfo = exchangeInfo.data.symbols?.[0];

    if (!symbolInfo) {
      console.error(`Symbol ${symbol} not found in exchange info`);
      return { precision: 5, minNotional: 10 }; // Fallback defaults
    }

    // Find LOT_SIZE filter
    const lotSizeFilter = symbolInfo.filters?.find(
      (f: any) => f.filterType === 'LOT_SIZE'
    );

    let precision = 5; // Default fallback
    let pricePrecision = 2; // Default price precision fallback
    if (lotSizeFilter) {
      const stepSize = parseFloat(lotSizeFilter.stepSize);
      // Calculate precision: precision = int(round(-log10(stepSize), 0))
      // Example: stepSize = 0.00001 -> precision = 5
      precision = Math.round(-Math.log10(stepSize));
      console.log(`✓ Symbol ${symbol} LOT_SIZE stepSize: ${stepSize}, precision: ${precision}`);
    } else {
      console.error(`LOT_SIZE filter not found for ${symbol}`);
    }

    const priceFilter = symbolInfo.filters?.find(
      (f: any) => f.filterType === 'PRICE_FILTER'
    );

    if (priceFilter) {
      const tickSize = parseFloat(priceFilter.tickSize);
      pricePrecision = Math.round(-Math.log10(tickSize));
      console.log(`✓ Symbol ${symbol} PRICE_FILTER tickSize: ${tickSize}, precision: ${pricePrecision}`);
    } else {
      console.warn(`PRICE_FILTER not found for ${symbol}, using fallback price precision: ${pricePrecision}`);
    }

    // Find MIN_NOTIONAL filter
    const minNotionalFilter = symbolInfo.filters?.find(
      (f: any) => f.filterType === 'MIN_NOTIONAL' || f.filterType === 'NOTIONAL'
    );

    let minNotional = 10; // Default fallback ($10 USD minimum)
    if (minNotionalFilter) {
      minNotional = parseFloat(minNotionalFilter.minNotional || minNotionalFilter.notional || '10');
      console.log(`✓ Symbol ${symbol} MIN_NOTIONAL: $${minNotional}`);
    } else {
      console.warn(`MIN_NOTIONAL filter not found for ${symbol}, using fallback: $${minNotional}`);
    }

    return { precision, pricePrecision, minNotional };
  };

  try {
    return await fetchInfo();
  } catch (error: any) {
    console.warn(`Symbol info fetch failed for ${symbol}, retrying once...`, error.message);

    try {
      return await fetchInfo();
    } catch (retryError: any) {
      console.error(`Error fetching symbol info for ${symbol}:`, retryError.message);
      return { precision: 5, pricePrecision: 2, minNotional: 10 };
    }
  }
}

/**
 * Executes a MARKET order on Binance testnet
 * Returns order result or throws error
 */
export async function executeMarketOrder(
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  currentPrice?: number,
  apiKey?: string,
  secretKey?: string
): Promise<OrderResult> {
  try {
    const client = getBinanceClient(apiKey, secretKey);
    // Get symbol info (precision and minimum notional) from Binance
    const { precision, minNotional } = await getSymbolInfo(symbol, apiKey, secretKey);

    // Format quantity to appropriate precision based on symbol's LOT_SIZE
    const formattedQuantity = parseFloat(quantity.toFixed(precision));

    // Validate minimum order value (MIN_NOTIONAL)
    // For market orders, we need to estimate the order value
    if (currentPrice) {
      const estimatedOrderValue = formattedQuantity * currentPrice;

      if (estimatedOrderValue < minNotional) {
        throw new Error(
          `Order value too small. Minimum: $${minNotional.toFixed(2)}, ` +
          `Attempted: $${estimatedOrderValue.toFixed(2)} (${formattedQuantity} ${symbol} @ $${currentPrice.toFixed(2)}). ` +
          `Please ensure you have at least $${minNotional.toFixed(2)} USDT to trade.`
        );
      }
    }

    console.log(`Executing ${side} MARKET order: ${formattedQuantity} ${symbol} (precision: ${precision}, min notional: $${minNotional})`);

    const placeOrder = async () => {
      const response = await client.newOrder(symbol, side, 'MARKET', {
        quantity: formattedQuantity
      });

      return response.data;
    };

    let order;

    try {
      order = await placeOrder();
    } catch (error: any) {
      console.warn('Market order execution failed, retrying once...', error.response?.data?.msg || error.message);
      order = await placeOrder();
    }

    // Parse order response
    const result: OrderResult = {
      orderId: order.orderId.toString(),
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      price: parseFloat(order.fills?.[0]?.price || order.price || '0'),
      quantity: parseFloat(order.origQty),
      status: order.status,
      executedQty: parseFloat(order.executedQty),
      cummulativeQuoteQty: parseFloat(order.cummulativeQuoteQty),
      transactTime: order.transactTime
    };

    console.log(`Order executed successfully: ${result.orderId}`);

    return result;
  } catch (error: any) {
    console.error('Binance order execution error:', error);

    // Extract error message from Binance API response
    let errorMessage = 'Failed to execute order';

    if (error.response?.data?.msg) {
      errorMessage = error.response.data.msg;
    } else if (error.message) {
      errorMessage = error.message;
    }

    throw new Error(`Order execution failed: ${errorMessage}`);
  }
}

export async function executeLimitOrder(
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  price: number,
  currentPrice: number,
  apiKey?: string,
  secretKey?: string
): Promise<OrderResult> {
  try {
    const client = getBinanceClient(apiKey, secretKey);
    const { precision, pricePrecision, minNotional } = await getSymbolInfo(symbol, apiKey, secretKey);

    const lowerBound = currentPrice * 0.95;
    const upperBound = currentPrice * 1.05;

    if (price < lowerBound || price > upperBound) {
      throw new Error(
        `Limit price out of bounds. Must be within ±5% of current price (${currentPrice.toFixed(pricePrecision)}). ` +
        `Provided: ${price.toFixed(pricePrecision)} (allowed range: ${lowerBound.toFixed(pricePrecision)} - ${upperBound.toFixed(pricePrecision)}).`
      );
    }

    const formattedQuantity = parseFloat(quantity.toFixed(precision));
    const formattedPrice = parseFloat(price.toFixed(pricePrecision));
    const orderValue = formattedQuantity * formattedPrice;

    if (orderValue < minNotional) {
      throw new Error(
        `Order value too small. Minimum: $${minNotional.toFixed(2)}, ` +
        `Attempted: $${orderValue.toFixed(2)} (${formattedQuantity} ${symbol} @ $${formattedPrice.toFixed(pricePrecision)}).`
      );
    }

    console.log(
      `Executing ${side} LIMIT order: ${formattedQuantity} ${symbol} @ ${formattedPrice} (qty precision: ${precision}, price precision: ${pricePrecision}, min notional: $${minNotional})`
    );

    const placeOrder = async () => {
      const response = await client.newOrder(symbol, side, 'LIMIT', {
        quantity: formattedQuantity,
        price: formattedPrice.toFixed(pricePrecision),
        timeInForce: 'GTC'
      });

      return response.data;
    };

    let order;

    try {
      order = await placeOrder();
    } catch (error: any) {
      console.warn('Limit order placement failed, retrying once...', error.response?.data?.msg || error.message);
      order = await placeOrder();
    }

    const result: OrderResult = {
      orderId: order.orderId.toString(),
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      price: parseFloat(order.price || formattedPrice.toString()),
      quantity: parseFloat(order.origQty),
      status: order.status,
      executedQty: parseFloat(order.executedQty),
      cummulativeQuoteQty: parseFloat(order.cummulativeQuoteQty),
      transactTime: order.transactTime
    };

    console.log(`Limit order placed successfully: ${result.orderId}`);

    return result;
  } catch (error: any) {
    console.error('Binance limit order execution error:', error);

    let errorMessage = 'Failed to execute limit order';

    if (error.response?.data?.msg) {
      errorMessage = error.response.data.msg;
    } else if (error.message) {
      errorMessage = error.message;
    }

    throw new Error(`Limit order execution failed: ${errorMessage}`);
  }
}

export async function cancelOrder(
  symbol: string,
  orderId: string,
  apiKey?: string,
  secretKey?: string
): Promise<CancelResult> {
  try {
    const client = getBinanceClient(apiKey, secretKey);

    const attemptCancel = async () => {
      const response = await client.cancelOrder(symbol, { orderId });
      return response.data;
    };

    let data;

    try {
      data = await attemptCancel();
    } catch (error: any) {
      console.warn(`Cancel order failed for ${orderId}, retrying once...`, error.response?.data?.msg || error.message);
      data = await attemptCancel();
    }

    return {
      orderId: data.orderId?.toString() ?? orderId,
      symbol: data.symbol ?? symbol,
      status: data.status ?? data.origClientOrderId ?? 'UNKNOWN'
    };
  } catch (error: any) {
    const payload = error.response?.data;
    const message = payload?.msg || error.message || 'Unknown error';

    const normalizedMessage = message.toLowerCase();

    if (
      normalizedMessage.includes('unknown order') ||
      normalizedMessage.includes('cancel rejected') ||
      normalizedMessage.includes('order is filled') ||
      normalizedMessage.includes('order does not exist')
    ) {
      return {
        orderId,
        symbol,
        status: 'FILLED_OR_UNKNOWN'
      };
    }

    throw new Error(`Failed to cancel order ${orderId}: ${message}`);
  }
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

// Removed legacy validateAndExecuteOrder function
// This used the old single-action schema (decision.action, decision.quantity, decision.asset)
// Replaced by: src/lib/execution/multiActionExecutor.ts -> executeActions()
