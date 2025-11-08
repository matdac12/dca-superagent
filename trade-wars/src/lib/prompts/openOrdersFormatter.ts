import { OpenOrder } from '@/types/trading';

function formatOrderAge(ageMs: number): string {
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return 'unknown duration';
  }

  const seconds = Math.floor(ageMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }

  return `${seconds}s`;
}

function formatOrderLine(order: OpenOrder): string {
  const side = order.side.toUpperCase();
  const quantity = order.quantity.toFixed(4).replace(/\.0+$/, '');
  const price = order.price.toFixed(2);
  const age = formatOrderAge(order.ageMs);
  return `Order #${order.orderId}: ${side} ${quantity} BTC @ $${price} (Placed ${age} ago, Status: ${order.status})`;
}

export function formatOpenOrders(openOrders: OpenOrder[]): string {
  if (!openOrders.length) {
    return 'No open orders.';
  }

  const sorted = [...openOrders]
    .sort((a, b) => b.time - a.time)
    .slice(0, 10);

  return sorted.map(formatOrderLine).join('\n');
}
