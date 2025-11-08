import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Railway deployment monitoring
 * Returns service status and uptime information
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'TradeWarriors',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: {
      node: process.version,
      platform: process.platform
    }
  });
}
