'use client';

import { useEffect, useState } from 'react';

interface AssetData {
  symbol: string;
  price: string;
  stats: {
    priceChange: string;
    priceChangePercent: string;
    highPrice: string;
    lowPrice: string;
    volume: string;
  };
}

interface MarketResponse {
  data: AssetData[];
  timestamp: number;
}

export default function MarketData() {
  const [marketData, setMarketData] = useState<MarketResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketData = async () => {
    try {
      const response = await fetch('/api/market');
      if (!response.ok) throw new Error('Failed to fetch');
      const json = await response.json();
      setMarketData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchMarketData();

    // Poll every 5 seconds
    const interval = setInterval(fetchMarketData, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: string, decimals: number = 2) => {
    return parseFloat(price).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const formatPercent = (percent: string) => {
    const num = parseFloat(percent);
    return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const getSymbolDisplay = (symbol: string) => {
    return symbol.replace('USDT', '');
  };

  return (
    <section className="max-w-7xl mx-auto px-6 py-24">
      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-4">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-4">
            Live Market Data
          </p>
          <h2 className="text-2xl font-medium mb-4">Real-time price feeds</h2>
          <p className="text-[var(--text-muted)] leading-relaxed">
            Connected to Binance testnet. Monitoring live cryptocurrency prices with 5-second updates.
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
            <div className="p-6 font-[family-name:var(--font-mono)] text-sm space-y-6">
              {loading && (
                <div className="py-3 text-[var(--text-muted)]">
                  Loading market data...
                </div>
              )}

              {error && (
                <div className="py-3 text-[var(--negative)]">
                  Error: {error}
                </div>
              )}

              {marketData && marketData.data.map((asset, index) => {
                const isPositive = parseFloat(asset.stats.priceChangePercent) > 0;
                const isLastItem = index === marketData.data.length - 1;
                // Use more decimals for ADA since it's a lower-priced asset
                const priceDecimals = asset.symbol === 'ADAUSDT' ? 4 : 2;

                return (
                  <div key={asset.symbol} className={!isLastItem ? 'pb-6 border-b border-[var(--border)]' : ''}>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-[var(--text-muted)] font-medium">
                        {getSymbolDisplay(asset.symbol)}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-lg">
                          ${formatPrice(asset.price, priceDecimals)}
                        </span>
                        <span
                          className={`text-sm ${
                            isPositive ? 'text-[var(--positive)]' : 'text-[var(--negative)]'
                          }`}
                        >
                          {formatPercent(asset.stats.priceChangePercent)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div>
                        <span className="text-[var(--text-muted)] text-xs">24h High</span>
                        <p className="font-medium mt-1">${formatPrice(asset.stats.highPrice, priceDecimals)}</p>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)] text-xs">24h Low</span>
                        <p className="font-medium mt-1">${formatPrice(asset.stats.lowPrice, priceDecimals)}</p>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)] text-xs">24h Change</span>
                        <p className="font-medium mt-1">${formatPrice(asset.stats.priceChange, priceDecimals)}</p>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)] text-xs">24h Volume</span>
                        <p className="font-medium mt-1">{parseFloat(asset.stats.volume).toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {marketData && (
                <div className="pt-4 text-xs text-[var(--text-muted)] flex justify-between items-center">
                  <span>// Connected to Binance testnet</span>
                  <span>Updated: {new Date(marketData.timestamp).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
