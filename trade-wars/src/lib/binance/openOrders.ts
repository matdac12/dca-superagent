import { Spot } from '@binance/connector';
import { OpenOrder } from '@/types/trading';

const BINANCE_TESTNET_URL = 'https://testnet.binance.vision';

export function createBinanceClient(apiKey?: string, secretKey?: string) {
  const key = apiKey || process.env.BINANCE_OPENAI_API_KEY || process.env.BINANCE_API_KEY;
  const secret = secretKey || process.env.BINANCE_OPENAI_SECRET_KEY || process.env.BINANCE_SECRET_KEY;

  return new Spot(key, secret, { baseURL: BINANCE_TESTNET_URL });
}

export async function getOpenOrders(symbol: string, apiKey?: string, secretKey?: string): Promise<OpenOrder[]> {
  const client = createBinanceClient(apiKey, secretKey);

  const attemptFetch = async (): Promise<OpenOrder[]> => {
    const response = await client.openOrders({ symbol });
    const orders = Array.isArray(response.data) ? response.data : [];

    const now = Date.now();

    return orders.map((order): OpenOrder => {
      const timestamp = order.time ?? order.updateTime ?? now;

      return {
        orderId: order.orderId?.toString() ?? '',
        symbol: order.symbol,
        price: parseFloat(order.price),
        quantity: parseFloat(order.origQty),
        side: order.side,
        status: order.status,
        time: timestamp,
        ageMs: Math.max(0, now - timestamp)
      };
    });
  };

  try {
    return await attemptFetch();
  } catch (error: any) {
    const status = error.response?.status;
    const payload = error.response?.data;
    const message = payload?.msg || error.message || 'Unknown error';

    console.warn('First attempt to fetch open orders failed, retrying...', {
      symbol,
      status,
      message
    });

    try {
      return await attemptFetch();
    } catch (retryError: any) {
      const retryStatus = retryError.response?.status;
      const retryPayload = retryError.response?.data;
      const retryMessage = retryPayload?.msg || retryError.message || 'Unknown error';

      console.error('Failed to fetch open orders from Binance', {
        symbol,
        status: retryStatus,
        message: retryMessage,
        payload: retryPayload
      });

      throw new Error(`Failed to fetch open orders: ${retryMessage}`);
    }
  }
}
