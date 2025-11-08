'use client';

import { useMemo } from 'react';

interface OpenOrderRow {
  orderId: string;
  agent: string;
  displayName: string;
  color: string;
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  status: string;
  ageMs: number;
}

interface OpenOrdersTableProps {
  orders: OpenOrderRow[];
  onCancel?: (orderId: string, agent: string) => Promise<void> | void;
  canceling?: boolean;
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatAge(ageMs: number) {
  const seconds = Math.floor(ageMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function OpenOrdersTable({ orders, onCancel, canceling }: OpenOrdersTableProps) {
  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => a.ageMs - b.ageMs),
    [orders]
  );

  if (!sortedOrders.length) {
    return (
      <div className="border border-[#B7C0CE] rounded-lg p-6 text-sm text-gray-600">
        No open orders. Agents will display pending orders here when limit orders are active.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-[#B7C0CE] rounded-lg">
      <table className="min-w-full divide-y divide-[#B7C0CE]">
        <thead className="bg-gray-50">
          <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
            <th className="px-4 py-3">Agent</th>
            <th className="px-4 py-3">Side</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Quantity</th>
            <th className="px-4 py-3">Age</th>
            <th className="px-4 py-3">Status</th>
            {onCancel && <th className="px-4 py-3">Actions</th>}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-[#B7C0CE]/60 text-sm">
          {sortedOrders.map(order => (
            <tr key={`${order.agent}-${order.orderId}`} className="hover:bg-gray-50 transition">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-8 rounded"
                    style={{ backgroundColor: order.color }}
                  />
                  <div>
                    <div className="font-semibold text-gray-900">{order.displayName}</div>
                    <div className="text-xs text-gray-500">Order #{order.orderId}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`font-semibold ${
                    order.side === 'BUY' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {order.side}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-sm text-gray-900">
                {formatCurrency(order.price)}
              </td>
              <td className="px-4 py-3 font-mono text-sm text-gray-900">
                {order.quantity.toFixed(6)} BTC
              </td>
              <td className="px-4 py-3 text-xs text-gray-600">{formatAge(order.ageMs)}</td>
              <td className="px-4 py-3 text-xs uppercase tracking-wide text-gray-500">
                {order.status}
              </td>
              {onCancel && (
                <td className="px-4 py-3">
                  <button
                    disabled={canceling}
                    onClick={() => onCancel(order.orderId, order.agent)}
                    className="text-xs text-red-600 hover:text-red-500 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default OpenOrdersTable;
