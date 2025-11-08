import { NextResponse } from 'next/server';
import { Spot } from '@binance/connector';
import { getLastNTrades } from '@/lib/storage/tradeHistory';
import { formatTradeHistory } from '@/lib/utils/tradeHistoryFormatter';
import { formatIndicators } from '@/lib/utils/technicalIndicators';
import { analyzeOrderBook } from '@/lib/utils/orderBookAnalyzer';
import { getStoredMarketNews } from '@/lib/exa/marketNews';

const ORDER_BOOK_TTL_MS = 10_000;
let cachedOrderBook: { timestamp: number; data: any } | null = null;

// Cache entire market intelligence response for 30 seconds
const MARKET_INTEL_TTL_MS = 30_000;
let cachedMarketIntel: { timestamp: number; data: any } | null = null;

export async function GET() {
  try {
    // Check cache first
    const now = Date.now();
    if (cachedMarketIntel && now - cachedMarketIntel.timestamp < MARKET_INTEL_TTL_MS) {
      console.log('📦 Returning cached market intelligence');
      return NextResponse.json(cachedMarketIntel.data);
    }

    console.log('🔄 Fetching fresh market intelligence...');

    // Initialize Binance client with testnet and timeout
    const client = new Spot(
      process.env.BINANCE_API_KEY,
      process.env.BINANCE_SECRET_KEY,
      {
        baseURL: 'https://testnet.binance.vision',
        timeout: 10000 // 10 second timeout per request
      }
    );

    const symbols = ['BTCUSDT', 'ADAUSDT'];

    // Fetch all data in parallel using Promise.allSettled for resilience
    const results = await Promise.allSettled([
      // BTC data
      client.klines('BTCUSDT', '4h', { limit: 24 }),
      client.ticker24hr('BTCUSDT'),
      getOrderBook(client, 'BTCUSDT'),
      // ADA data
      client.klines('ADAUSDT', '4h', { limit: 24 }),
      client.ticker24hr('ADAUSDT'),
      getOrderBook(client, 'ADAUSDT'),
      // Shared data
      client.account(),
      getLastNTrades(10),
      getStoredMarketNews()
    ]);

    // Extract results from Promise.allSettled
    const [
      btcKlinesResult, btcTickerResult, btcOrderBookResult,
      adaKlinesResult, adaTickerResult, adaOrderBookResult,
      accountResult, recentTradesResult, marketNewsResult
    ] = results;

    // Check if critical data (account) succeeded
    if (accountResult.status === 'rejected') {
      console.error('Critical API calls failed:', {
        account: accountResult.reason
      });
      throw new Error('Failed to fetch account data');
    }

    const accountResponse = accountResult.value;

    // Helper function to process ticker data
    const processTicker = (tickerResult: any) => {
      if (tickerResult.status === 'rejected') return null;
      const data = tickerResult.value.data;
      return {
        symbol: data.symbol,
        lastPrice: parseFloat(data.lastPrice),
        priceChange: parseFloat(data.priceChange),
        priceChangePercent: parseFloat(data.priceChangePercent),
        highPrice: parseFloat(data.highPrice),
        lowPrice: parseFloat(data.lowPrice),
        volume: parseFloat(data.volume),
        quoteVolume: parseFloat(data.quoteVolume)
      };
    };

    // Helper function to process klines data
    const processKlines = (klinesResult: any) => {
      if (klinesResult.status === 'rejected') {
        console.warn('Klines fetch failed:', klinesResult.reason);
        return [];
      }
      return klinesResult.value.data.map((candle: any) => ({
        openTime: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
        closeTime: candle[6]
      }));
    };

    // Helper function to process order book
    const processOrderBook = (orderBookResult: any) => {
      if (orderBookResult.status === 'rejected') return null;
      const data = orderBookResult.value;
      return data ? analyzeOrderBook(data.bids ?? [], data.asks ?? []) : null;
    };

    // Process BTC data
    const btcTicker = processTicker(btcTickerResult);
    const btcKlines = processKlines(btcKlinesResult);
    const btcOrderBookAnalysis = processOrderBook(btcOrderBookResult);
    const btcIndicators = btcKlines.length > 0 ? formatIndicators(btcKlines) : null;

    // Process ADA data
    const adaTicker = processTicker(adaTickerResult);
    const adaKlines = processKlines(adaKlinesResult);
    const adaOrderBookAnalysis = processOrderBook(adaOrderBookResult);
    const adaIndicators = adaKlines.length > 0 ? formatIndicators(adaKlines) : null;

    // Process recent trades - use fallback if failed
    const recentTrades = recentTradesResult.status === 'fulfilled' ? recentTradesResult.value : [];

    // Process market news - use fallback if failed
    const marketNews = marketNewsResult.status === 'fulfilled' ? marketNewsResult.value : [];

    // Process account balances (only BTC, ADA, USDT)
    const assets = ['USDT', 'BTC', 'ADA'];
    const balances = accountResponse.data.balances
      .filter((balance: any) => assets.includes(balance.asset))
      .map((balance: any) => ({
        asset: balance.asset,
        free: parseFloat(balance.free),
        locked: parseFloat(balance.locked),
        total: parseFloat(balance.free) + parseFloat(balance.locked)
      }));

    // Format trade history (using BTC price for now, will update to show both assets)
    const tradeHistory = formatTradeHistory(recentTrades, btcTicker?.lastPrice || 0);

    // Aggregate all market intelligence for both assets
    const marketIntelligence = {
      symbols: ['BTCUSDT', 'ADAUSDT'],
      btc: {
        symbol: 'BTCUSDT',
        ticker: btcTicker,
        klines: btcKlines,
        indicators: btcIndicators,
        orderBook: btcOrderBookAnalysis
      },
      ada: {
        symbol: 'ADAUSDT',
        ticker: adaTicker,
        klines: adaKlines,
        indicators: adaIndicators,
        orderBook: adaOrderBookAnalysis
      },
      balances,
      tradeHistory,
      marketNews,
      timestamp: Date.now()
    };

    // Cache the result
    cachedMarketIntel = {
      timestamp: Date.now(),
      data: marketIntelligence
    };

    console.log('✅ Market intelligence fetched and cached successfully');
    return NextResponse.json(marketIntelligence);
  } catch (error) {
    console.error('❌ Market intelligence API error:', error);
    // Clear cache on error to force fresh fetch next time
    cachedMarketIntel = null;
    return NextResponse.json(
      { error: 'Failed to fetch market intelligence data' },
      { status: 500 }
    );
  }
}

async function getOrderBook(client: Spot, symbol: string) {
  const now = Date.now();
  if (cachedOrderBook && now - cachedOrderBook.timestamp < ORDER_BOOK_TTL_MS) {
    return cachedOrderBook.data;
  }

  try {
    const response = await client.depth(symbol, { limit: 10 });
    cachedOrderBook = {
      timestamp: Date.now(),
      data: response.data,
    };
    return response.data;
  } catch (error) {
    console.warn('Order book fetch failed:', error);
    cachedOrderBook = null;
    return null;
  }
}
