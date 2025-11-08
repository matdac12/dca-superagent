'use client';

import { useEffect, useState } from 'react';

interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

interface AccountResponse {
  balances: Balance[];
  timestamp: number;
}

export default function AccountBalance() {
  const [accountData, setAccountData] = useState<AccountResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccountData = async () => {
    try {
      const response = await fetch('/api/account');
      if (!response.ok) throw new Error('Failed to fetch');
      const json = await response.json();
      setAccountData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch account data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchAccountData();

    // Poll every 10 seconds (less frequent than market data)
    const interval = setInterval(fetchAccountData, 10000);

    return () => clearInterval(interval);
  }, []);

  const formatBalance = (amount: number, asset: string) => {
    // More decimals for lower-value assets
    const decimals = asset === 'ADA' ? 2 : asset === 'BTC' ? 8 : 2;
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  return (
    <section className="max-w-7xl mx-auto px-6 py-12">
      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-4">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-4">
            Account Balance
          </p>
          <h2 className="text-2xl font-medium mb-4">Your holdings</h2>
          <p className="text-[var(--text-muted)] leading-relaxed">
            Current asset balances in your Binance testnet account.
          </p>
        </div>
        <div className="col-span-8">
          <div className="border border-[var(--border)] bg-white">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
            </div>
            <div className="p-6">
              {loading && (
                <div className="py-3 text-[var(--text-muted)] font-[family-name:var(--font-mono)] text-sm">
                  Loading account data...
                </div>
              )}

              {error && (
                <div className="py-3 text-[var(--negative)] font-[family-name:var(--font-mono)] text-sm">
                  Error: {error}
                </div>
              )}

              {accountData && accountData.balances.length === 0 && (
                <div className="py-3 text-[var(--text-muted)] font-[family-name:var(--font-mono)] text-sm">
                  No balances found
                </div>
              )}

              {accountData && accountData.balances.length > 0 && (
                <div className="space-y-4">
                  {accountData.balances.map((balance, index) => (
                    <div
                      key={balance.asset}
                      className={`py-4 ${
                        index !== accountData.balances.length - 1
                          ? 'border-b border-[var(--border)]'
                          : ''
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium text-lg mb-1">{balance.asset}</h3>
                          <p className="text-[var(--text-muted)] text-xs">
                            {balance.asset === 'BTC' && 'Bitcoin'}
                            {balance.asset === 'ADA' && 'Cardano'}
                            {balance.asset === 'USDT' && 'Tether USD'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-[family-name:var(--font-mono)] text-xl font-medium">
                            {formatBalance(balance.total, balance.asset)}
                          </p>
                          <p className="text-[var(--text-muted)] text-xs mt-1">
                            {balance.asset}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 font-[family-name:var(--font-mono)] text-sm">
                        <div>
                          <span className="text-[var(--text-muted)] text-xs">Available</span>
                          <p className="mt-1">{formatBalance(balance.free, balance.asset)}</p>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)] text-xs">In Orders</span>
                          <p className="mt-1">{formatBalance(balance.locked, balance.asset)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 text-xs text-[var(--text-muted)] font-[family-name:var(--font-mono)] flex justify-between items-center">
                    <span>// Testnet balances</span>
                    <span>Updated: {new Date(accountData.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
