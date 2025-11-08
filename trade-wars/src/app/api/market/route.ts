import { NextResponse } from 'next/server';
import { Spot } from '@binance/connector';
import { calculateTotalPortfolioValue } from '@/lib/utils/portfolioCalculator';

export async function GET() {
  try {
    // Initialize Binance client with testnet and timeout
    const client = new Spot(
      process.env.BINANCE_API_KEY_COUNCIL || process.env.BINANCE_API_KEY,
      process.env.BINANCE_SECRET_KEY_COUNCIL || process.env.BINANCE_SECRET_KEY,
      {
        baseURL: process.env.BINANCE_BASE_URL || 'https://testnet.binance.vision',
        timeout: 5000 // 5 second timeout
      }
    );

    // Fetch market data and account info in parallel
    const [tickerResponse, accountResponse] = await Promise.all([
      client.ticker24hr('BTCUSDT'),
      client.account()
    ]);

    const ticker = tickerResponse.data;
    const balances = accountResponse.data.balances
      .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map((b: any) => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
        total: parseFloat(b.free) + parseFloat(b.locked)
      }));

    // Calculate total portfolio value
    const currentPrices = {
      BTCUSDT: parseFloat(ticker.lastPrice)
    };
    const totalPortfolioValue = calculateTotalPortfolioValue(balances, currentPrices);

    return NextResponse.json({
      ticker: {
        symbol: ticker.symbol,
        lastPrice: parseFloat(ticker.lastPrice),
        priceChange: parseFloat(ticker.priceChange),
        priceChangePercent: parseFloat(ticker.priceChangePercent),
        highPrice: parseFloat(ticker.highPrice),
        lowPrice: parseFloat(ticker.lowPrice),
        volume: parseFloat(ticker.volume),
        quoteVolume: parseFloat(ticker.quoteVolume)
      },
      balances,
      totalPortfolioValue,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Market API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
