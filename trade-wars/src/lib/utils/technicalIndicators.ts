import { RSI, MACD, BollingerBands, EMA, ATR, ADX, SMA } from 'technicalindicators';

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

export interface RSIResult {
  value: number | null;
  series: number[];
}

export interface MACDResult {
  value: {
    MACD: number;
    signal: number;
    histogram: number;
  } | null;
  series: Array<{
    MACD: number;
    signal: number;
    histogram: number;
  }>;
}

export interface BollingerBandsResult {
  value: {
    upper: number;
    middle: number;
    lower: number;
  } | null;
  series: Array<{
    upper: number;
    middle: number;
    lower: number;
  }>;
}

export interface EMAResult {
  values: Record<number, number | null>;
  series: Record<number, number[]>;
}

export interface ATRResult {
  value: number | null;
  series: number[];
  atrPercent: number | null;
  interpretation: string;
}

export interface ADXResult {
  value: number | null;
  series: number[];
  interpretation: string;
}

export interface RVOLResult {
  value: number | null;
  interpretation: string;
}

export interface VWAPResult {
  value: number | null;
  distance: number | null;
  farFromFairValue: boolean;
}

export interface IndicatorInterpretations {
  rsi: string;
  macd: string;
  bollinger: string;
  ema: string;
  summary: string;
}

export interface IndicatorFormat {
  formatted: string;
  interpretations: IndicatorInterpretations;
  rsi: RSIResult;
  macd: MACDResult;
  bollinger: BollingerBandsResult;
  ema: EMAResult;
  atr: ATRResult;
  adx: ADXResult;
  rvol: RVOLResult;
  vwap: VWAPResult;
  derivedSignals: string;
}

export function calculateRSI(candles: Candle[], period = 14): RSIResult {
  if (!Array.isArray(candles) || candles.length < period) {
    return { value: null, series: [] };
  }

  const closes = candles.map(c => c.close);
  const series = RSI.calculate({ period, values: closes });
  const value = series.length ? series[series.length - 1] : null;

  return { value, series };
}

export function calculateEMAs(
  candles: Candle[],
  periods: number[] = [20, 50, 200]
): EMAResult {
  if (!Array.isArray(candles) || periods.length === 0) {
    return { values: {}, series: {} };
  }

  const closes = candles.map(c => c.close);

  const values: Record<number, number | null> = {};
  const series: Record<number, number[]> = {};

  periods.forEach(period => {
    if (period <= 0 || closes.length < period) {
      values[period] = null;
      series[period] = [];
      return;
    }

    const emaSeries = EMA.calculate({ period, values: closes });
    series[period] = emaSeries;
    values[period] = emaSeries.length ? emaSeries[emaSeries.length - 1] : null;
  });

  return { values, series };
}

export function calculateATR(candles: Candle[], period = 14): ATRResult {
  if (!Array.isArray(candles) || candles.length < period) {
    return { value: null, series: [], atrPercent: null, interpretation: 'Insufficient data' };
  }

  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const closes = candles.map(c => c.close);

  const series = ATR.calculate({ high: highs, low: lows, close: closes, period });
  const value = series.length ? series[series.length - 1] : null;

  // Calculate ATR% using the latest close price
  const currentPrice = candles[candles.length - 1]?.close;
  const atrPercent = value !== null && currentPrice ? (value / currentPrice) * 100 : null;

  // Interpret ATR%
  let interpretation = 'Insufficient data';
  if (atrPercent !== null) {
    if (atrPercent < 1) {
      interpretation = 'Low';
    } else if (atrPercent >= 1 && atrPercent < 2) {
      interpretation = 'Normal';
    } else if (atrPercent >= 2 && atrPercent <= 2.5) {
      interpretation = 'High';
    } else {
      interpretation = 'Extreme';
    }
  }

  return { value, series, atrPercent, interpretation };
}

export function calculateADX(candles: Candle[], period = 14): ADXResult {
  if (!Array.isArray(candles) || candles.length < period) {
    return { value: null, series: [], interpretation: 'Insufficient data' };
  }

  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const closes = candles.map(c => c.close);

  const rawSeries = ADX.calculate({ high: highs, low: lows, close: closes, period });

  // ADX.calculate returns objects like { adx, pdi, mdi }, extract adx values
  const series = rawSeries.map((item: any) => typeof item === 'number' ? item : item.adx);
  const value = series.length ? series[series.length - 1] : null;

  // Interpret ADX value
  let interpretation = 'Insufficient data';
  if (value !== null) {
    if (value < 20) {
      interpretation = 'Ranging';
    } else if (value >= 20 && value < 25) {
      interpretation = 'Building';
    } else if (value >= 25 && value <= 40) {
      interpretation = 'Trending';
    } else {
      interpretation = 'Strong Trend';
    }
  }

  return { value, series, interpretation };
}

export function calculateRVOL(candles: Candle[], period = 20): RVOLResult {
  if (!Array.isArray(candles) || candles.length < period) {
    return { value: null, interpretation: 'Insufficient data' };
  }

  // Get last candle's volume
  const currentVolume = candles[candles.length - 1]?.volume;

  if (!currentVolume || currentVolume === 0) {
    return { value: null, interpretation: 'Insufficient data' };
  }

  // Calculate SMA of volume over last period candles
  const volumes = candles.map(c => c.volume);
  const volumeSMA = SMA.calculate({ period, values: volumes });
  const avgVolume = volumeSMA.length ? volumeSMA[volumeSMA.length - 1] : null;

  if (!avgVolume || avgVolume === 0) {
    return { value: null, interpretation: 'Insufficient data' };
  }

  // Calculate RVOL
  const value = currentVolume / avgVolume;

  // Interpret RVOL
  let interpretation = 'Normal ≈';
  if (value < 0.8) {
    interpretation = 'Low ↓';
  } else if (value >= 1.3 && value < 2.0) {
    interpretation = 'High ↑';
  } else if (value >= 2.0) {
    interpretation = 'Extreme ↑↑';
  }

  return { value, interpretation };
}

export function calculateVWAP(candles: Candle[], atr: number | null): VWAPResult {
  if (!Array.isArray(candles) || candles.length === 0) {
    return { value: null, distance: null, farFromFairValue: false };
  }

  // Calculate VWAP using typical price (high + low + close) / 3
  let sumPriceVolume = 0;
  let sumVolume = 0;

  for (const candle of candles) {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    sumPriceVolume += typicalPrice * candle.volume;
    sumVolume += candle.volume;
  }

  if (sumVolume === 0) {
    return { value: null, distance: null, farFromFairValue: false };
  }

  const vwap = sumPriceVolume / sumVolume;

  // Get current price (last candle's close)
  const currentPrice = candles[candles.length - 1]?.close;

  if (!currentPrice) {
    return { value: vwap, distance: null, farFromFairValue: false };
  }

  // Calculate distance from VWAP
  const distance = Math.abs(currentPrice - vwap);

  // Determine if far from fair value (distance >= ATR)
  const farFromFairValue = atr !== null ? distance >= atr : false;

  return { value: vwap, distance, farFromFairValue };
}

function formatNumber(value: number | null, decimals = 2): string {
  if (value === null || Number.isNaN(value)) {
    return 'n/a';
  }
  return value.toFixed(decimals);
}

function buildDerivedSignals(
  atr: ATRResult,
  adx: ADXResult,
  rvol: RVOLResult,
  vwap: VWAPResult
): string {
  // Format ATR component
  const atrPctStr = atr.atrPercent !== null ? `${atr.atrPercent.toFixed(1)}%` : 'n/a';
  const volPart = `Vol=${atr.interpretation}(${atrPctStr})`;

  // Format ADX component
  const adxValueStr = adx.value !== null ? adx.value.toFixed(0) : 'n/a';
  const trendPart = `Trend=${adx.interpretation}(ADX ${adxValueStr})`;

  // Format RVOL component
  const rvolValueStr = rvol.value !== null ? `${rvol.value.toFixed(1)}x` : 'n/a';
  const flowPart = `Flow=${rvol.interpretation}(${rvolValueStr})`;

  // Format VWAP fair value component
  const fairPart = `Fair=${vwap.farFromFairValue ? 'Far' : 'Near'}`;

  return `${volPart} | ${trendPart} | ${flowPart} | ${fairPart}`;
}

export function formatIndicators(candles: Candle[]): IndicatorFormat {
  const rsi = calculateRSI(candles);
  const macd = calculateMACD(candles);
  const bollinger = calculateBollingerBands(candles);
  const ema = calculateEMAs(candles);
  const atr = calculateATR(candles);
  const adx = calculateADX(candles);
  const rvol = calculateRVOL(candles);
  const vwap = calculateVWAP(candles, atr.value);
  const latestClose = candles[candles.length - 1]?.close ?? null;

  const baseInterpretations: Omit<IndicatorInterpretations, 'summary'> = {
    rsi: interpretRSI(rsi.value),
    macd: interpretMACD(macd.value),
    bollinger: interpretBollinger(bollinger.value, latestClose),
    ema: interpretEMA(ema.values, latestClose),
  };

  const summary = buildSummary(latestClose, baseInterpretations, {
    emaValues: ema.values,
    bollinger: bollinger.value,
    macd: macd.value,
    rsi: rsi.value,
  });

  const interpretations: IndicatorInterpretations = {
    ...baseInterpretations,
    summary,
  };

  const derivedSignals = buildDerivedSignals(atr, adx, rvol, vwap);

  const lines: string[] = [];

  lines.push(
    `RSI (14): ${formatNumber(rsi.value)} (${interpretations.rsi})`
  );

  if (macd.value) {
    lines.push(
      `MACD: ${formatNumber(macd.value.MACD)} (Signal: ${formatNumber(macd.value.signal)}, Hist: ${formatNumber(macd.value.histogram)}) → ${interpretations.macd}`
    );
  } else {
    lines.push('MACD: n/a');
  }

  if (bollinger.value) {
    lines.push(
      `Bollinger Bands: Upper ${formatNumber(bollinger.value.upper)}, Middle ${formatNumber(bollinger.value.middle)}, Lower ${formatNumber(bollinger.value.lower)} → ${interpretations.bollinger}`
    );
  } else {
    lines.push('Bollinger Bands: n/a');
  }

  const emaLine = `EMAs: ${Object.entries(ema.values)
    .map(([period, value]) => `EMA-${period}: ${formatNumber(value)}`)
    .join(' | ')} → ${interpretations.ema}`;
  lines.push(emaLine);

  // Add new indicator lines
  const atrLine = `ATR (14): ${formatNumber(atr.value)} (${formatNumber(atr.atrPercent)}%) → ${atr.interpretation}`;
  lines.push(atrLine);

  const adxLine = `ADX (14): ${formatNumber(adx.value)} → ${adx.interpretation}`;
  lines.push(adxLine);

  const rvolLine = `RVOL (20): ${formatNumber(rvol.value, 2)}x → ${rvol.interpretation}`;
  lines.push(rvolLine);

  const vwapLine = `VWAP: ${formatNumber(vwap.value)} (Distance: ${formatNumber(vwap.distance)}, Fair Value: ${vwap.farFromFairValue ? 'Far' : 'Near'})`;
  lines.push(vwapLine);

  // Add derived signals summary line
  lines.push(`Derived Signals: ${derivedSignals}`);

  const summaryLine = `Summary: ${interpretations.summary}`;
  lines.push(summaryLine);

  return {
    formatted: lines.join('\n'),
    interpretations,
    rsi,
    macd,
    bollinger,
    ema,
    atr,
    adx,
    rvol,
    vwap,
    derivedSignals,
  };
}

function interpretRSI(value: number | null): string {
  if (value === null) return 'Insufficient data';
  if (value >= 70) return 'Overbought';
  if (value <= 30) return 'Oversold';
  return 'Neutral';
}

function interpretMACD(value: MACDResult['value']): string {
  if (!value) return 'Insufficient data';

  const { MACD: macd, signal, histogram } = value;

  if (macd > signal && histogram > 0) {
    return 'Bullish momentum increasing';
  }
  if (macd < signal && histogram < 0) {
    return 'Bearish momentum increasing';
  }
  if (histogram === 0) {
    return 'Potential crossover forming';
  }
  return 'Momentum weakening';
}

function interpretBollinger(
  value: BollingerBandsResult['value'],
  currentPrice: number | null
): string {
  if (!value || currentPrice === null) return 'Insufficient data';

  if (currentPrice >= value.upper) {
    return 'Price testing upper band (potential resistance)';
  }
  if (currentPrice <= value.lower) {
    return 'Price testing lower band (potential support)';
  }
  if (currentPrice > value.middle) {
    return 'Price above middle band (bullish bias)';
  }
  if (currentPrice < value.middle) {
    return 'Price below middle band (bearish bias)';
  }
  return 'Price at middle band';
}

function interpretEMA(values: Record<number, number | null>, currentPrice: number | null): string {
  if (currentPrice === null) return 'Insufficient data';

  const periods = Object.keys(values)
    .map(Number)
    .sort((a, b) => a - b);

  if (!periods.length) return 'Insufficient data';

  let aboveCount = 0;
  let belowCount = 0;

  periods.forEach(period => {
    const emaValue = values[period];
    if (emaValue === null) return;
    if (currentPrice > emaValue) aboveCount += 1;
    if (currentPrice < emaValue) belowCount += 1;
  });

  if (aboveCount === periods.length) {
    return 'Price above all EMAs (strong uptrend)';
  }
  if (belowCount === periods.length) {
    return 'Price below all EMAs (strong downtrend)';
  }
  if (aboveCount > belowCount) {
    return 'Price above most EMAs (bullish bias)';
  }
  if (belowCount > aboveCount) {
    return 'Price below most EMAs (bearish bias)';
  }
  return 'Price mixed around EMAs (range bound)';
}

function buildSummary(
  currentPrice: number | null,
  interpretations: Omit<IndicatorInterpretations, 'summary'>,
  data: {
    emaValues: Record<number, number | null>;
    bollinger: BollingerBandsResult['value'];
    macd: MACDResult['value'];
    rsi: number | null;
  }
): string {
  if (currentPrice === null) return 'Insufficient data for summary';

  if (interpretations.ema.includes('strong uptrend')) {
    return 'Price above all EMAs: Strong uptrend';
  }
  if (interpretations.ema.includes('strong downtrend')) {
    return 'Price below all EMAs: Strong downtrend';
  }

  if (interpretations.macd.includes('Bullish momentum') && (interpretations.rsi === 'Neutral' || interpretations.rsi === 'Oversold')) {
    return 'Momentum turning bullish with supportive RSI';
  }
  if (interpretations.macd.includes('Bearish momentum') && (interpretations.rsi === 'Neutral' || interpretations.rsi === 'Overbought')) {
    return 'Momentum turning bearish with caution from RSI';
  }

  if (data.bollinger) {
    if (currentPrice >= data.bollinger.upper) {
      return 'Price at upper band: watch for pullback or breakout';
    }
    if (currentPrice <= data.bollinger.lower) {
      return 'Price at lower band: potential rebound area';
    }
  }

  return 'Mixed signals: monitor for confirmation';
}

export function calculateBollingerBands(
  candles: Candle[],
  period = 20,
  stdDev = 2
): BollingerBandsResult {
  if (!Array.isArray(candles) || candles.length < period) {
    return { value: null, series: [] };
  }

  const closes = candles.map(c => c.close);
  const series = BollingerBands.calculate({ period, stdDev, values: closes });
  const value = series.length ? series[series.length - 1] : null;

  return { value, series };
}

export function calculateMACD(
  candles: Candle[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDResult {
  if (!Array.isArray(candles) || candles.length < slowPeriod) {
    return { value: null, series: [] };
  }

  const closes = candles.map(c => c.close);
  const series = MACD.calculate({
    fastPeriod,
    slowPeriod,
    signalPeriod,
    values: closes,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  const value = series.length ? series[series.length - 1] : null;

  return { value, series };
}
