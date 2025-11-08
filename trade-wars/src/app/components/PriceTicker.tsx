'use client';

import { useEffect, useState } from 'react';

interface Ticker {
  symbol: string;
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
}

interface MarketResponse {
  ticker: Ticker;
  balances: any[];
  totalPortfolioValue: number;
  timestamp: string;
}

export default function PriceTicker() {
  const [marketData, setMarketData] = useState<MarketResponse | null>(null);

  const fetchMarketData = async () => {
    try {
      const response = await fetch('/api/market');
      if (!response.ok) throw new Error('Failed to fetch');
      const json = await response.json();
      setMarketData(json);
    } catch (err) {
      console.error('Failed to fetch market data:', err);
    }
  };

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatPercent = (percent: number) => {
    return `${percent > 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  if (!marketData || !marketData.ticker) {
    return (
      <div className="border-b border-[var(--border)] bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-center gap-8">
            <span className="text-sm text-[var(--text-muted)] animate-pulse">
              Loading market data...
            </span>
          </div>
        </div>
      </div>
    );
  }

  const ticker = marketData.ticker;
  const isPositive = ticker.priceChangePercent > 0;

  return (
    <div className="border-b border-[var(--border)] bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-center gap-8 md:gap-12">
          {/* BTC Price */}
          <div className="flex items-center gap-3 font-[family-name:var(--font-mono)] text-sm">
            <span className="font-semibold text-[var(--text)]">
              BTC
            </span>
            <span className="text-[var(--text)]">
              ${formatPrice(ticker.lastPrice)}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                isPositive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {formatPercent(ticker.priceChangePercent)}
            </span>
          </div>

          {/* 24h High */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)]">24h High:</span>
            <span className="text-[var(--text)] font-[family-name:var(--font-mono)]">
              ${formatPrice(ticker.highPrice)}
            </span>
          </div>

          {/* 24h Low */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)]">24h Low:</span>
            <span className="text-[var(--text)] font-[family-name:var(--font-mono)]">
              ${formatPrice(ticker.lowPrice)}
            </span>
          </div>

          {/* 24h Volume */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)]">24h Vol:</span>
            <span className="text-[var(--text)] font-[family-name:var(--font-mono)]">
              {ticker.volume.toFixed(2)} BTC
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
