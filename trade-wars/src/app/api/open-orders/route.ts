import { NextResponse } from 'next/server';
import { getAllAgents } from '@/config/agents';
import { getOpenOrders } from '@/lib/binance/openOrders';

export async function GET() {
  try {
    const agents = getAllAgents().filter(agent => agent.name !== 'council');

    const results = await Promise.all(
      agents.map(async agent => {
        try {
          const orders = await getOpenOrders('BTCUSDT', agent.binanceApiKey, agent.binanceSecretKey);

          return orders.map(order => ({
            agent: agent.name,
            displayName: agent.displayName,
            color: agent.color,
            orderId: order.orderId,
            side: order.side,
            price: order.price,
            quantity: order.quantity,
            status: order.status,
            ageMs: order.ageMs,
            symbol: order.symbol,
          }));
        } catch (error: any) {
          console.warn(`Failed to fetch open orders for ${agent.name}:`, error?.message ?? error);
          return [];
        }
      })
    );

    // Deduplicate orders by orderId (agents may share API credentials)
    // Keep the first occurrence of each order
    const allOrders = results.flat();
    const uniqueOrders = Array.from(
      new Map(allOrders.map(order => [order.orderId, order])).values()
    );

    return NextResponse.json({ success: true, orders: uniqueOrders });
  } catch (error: any) {
    console.error('Failed to retrieve open orders:', error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? 'Unable to load open orders',
      },
      { status: 500 }
    );
  }
}
