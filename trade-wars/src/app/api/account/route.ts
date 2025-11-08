import { NextResponse } from 'next/server';
import { Spot } from '@binance/connector';

export async function GET() {
  try {
    // Initialize Binance client with testnet
    const client = new Spot(
      process.env.BINANCE_API_KEY,
      process.env.BINANCE_SECRET_KEY,
      {
        baseURL: 'https://testnet.binance.vision'
      }
    );

    // Fetch account information
    const accountResponse = await client.account();

    // Extract only the assets we care about
    const assets = ['USDT', 'BTC', 'ADA'];
    const balances = accountResponse.data.balances
      .filter((balance: any) => assets.includes(balance.asset))
      .map((balance: any) => ({
        asset: balance.asset,
        free: parseFloat(balance.free),
        locked: parseFloat(balance.locked),
        total: parseFloat(balance.free) + parseFloat(balance.locked)
      }))
      .filter((balance: any) => balance.total > 0); // Only show assets with balance

    return NextResponse.json({
      balances,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Binance account API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account balances' },
      { status: 500 }
    );
  }
}
