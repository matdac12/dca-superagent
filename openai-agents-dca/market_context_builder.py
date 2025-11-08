"""
Market Context Builder

Converts raw Binance market intelligence into human-readable context
for agent consumption.
"""
from typing import Dict
from datetime import datetime


class MarketContextBuilder:
    """Format market data into agent-readable text"""

    @staticmethod
    def build_context(intelligence: Dict) -> str:
        """
        Convert raw market intelligence into structured text for agents

        Args:
            intelligence: Dictionary from BinanceMarketData.get_complete_market_intelligence()

        Returns:
            Formatted text context optimized for LLM understanding
        """
        portfolio = intelligence['portfolio']
        btc = intelligence['btc']
        ada = intelligence['ada']
        open_orders = intelligence['open_orders']

        # Build portfolio section
        portfolio_text = f"""PORTFOLIO STATUS (as of {intelligence['timestamp']})
{'='*80}

Total Portfolio Value: ${portfolio['total_value_usd']:,.2f}

Available USDT: ${portfolio['usdt']['free']:,.2f}
  (Locked: ${portfolio['usdt']['locked']:,.2f})

BTC Holdings: {portfolio['btc']['total']:.8f} BTC
  Market Value: ${portfolio['btc']['value_usd']:,.2f}
  Free: {portfolio['btc']['free']:.8f} BTC
  Locked: {portfolio['btc']['locked']:.8f} BTC

ADA Holdings: {portfolio['ada']['total']:,.2f} ADA
  Market Value: ${portfolio['ada']['value_usd']:,.2f}
  Free: {portfolio['ada']['free']:.2f} ADA
  Locked: {portfolio['ada']['locked']:.2f} ADA

Portfolio Allocation:
  USDT: {(portfolio['usdt']['total'] / portfolio['total_value_usd'] * 100):.1f}%
  BTC: {(portfolio['btc']['value_usd'] / portfolio['total_value_usd'] * 100):.1f}%
  ADA: {(portfolio['ada']['value_usd'] / portfolio['total_value_usd'] * 100):.1f}%
"""

        # Build BTC market section
        btc_ind = btc['indicators']
        btc_text = f"""
BTC MARKET DATA (BTCUSDT)
{'='*80}

Current Price: ${btc['price']:,.2f}
24h Change: {btc['change_24h']:+.2f}%
24h High: ${btc['high_24h']:,.2f}
24h Low: ${btc['low_24h']:,.2f}
24h Volume: {btc['volume_24h']:,.2f} BTC

TECHNICAL INDICATORS:
  RSI (14): {btc_ind['rsi']:.2f} → {btc_ind['rsi_signal'].upper()}
    • <30 = Oversold (strong buy signal)
    • 30-70 = Neutral
    • >70 = Overbought (caution)

  Bollinger Bands (20, 2σ):
    Upper: ${btc_ind['bb_upper']:,.2f}
    Middle: ${btc_ind['bb_middle']:,.2f}
    Lower: ${btc_ind['bb_lower']:,.2f}
    Position: {btc_ind['bb_position']:.1f}% between bands
    • <20% = Near lower band (potential buy)
    • >80% = Near upper band (potential sell)

  MACD (12, 26, 9):
    MACD: {btc_ind['macd']:.2f}
    Signal: {btc_ind['macd_signal']:.2f}
    Histogram: {btc_ind['macd_histogram']:.2f}
    • Histogram > 0 = Bullish momentum
    • Histogram < 0 = Bearish momentum

  Moving Averages:
    EMA 20: ${btc_ind['ema_20']:,.2f}
    EMA 50: ${btc_ind['ema_50']:,.2f}
    Price vs EMA20: {((btc['price'] - btc_ind['ema_20']) / btc_ind['ema_20'] * 100):+.2f}%
    Price vs EMA50: {((btc['price'] - btc_ind['ema_50']) / btc_ind['ema_50'] * 100):+.2f}%

  Volatility & Trend:
    ATR (14): ${btc_ind['atr']:,.2f} → Volatility measure
    ADX (14): {btc_ind['adx']:.2f}
    • ADX <20 = Weak trend
    • ADX 20-40 = Moderate trend
    • ADX >40 = Strong trend

ORDER BOOK:
  Bid/Ask Spread: {btc['order_book']['spread_pct']:.3f}%
  Bid Liquidity: ${btc['order_book']['bid_liquidity']:,.0f}
  Ask Liquidity: ${btc['order_book']['ask_liquidity']:,.0f}
  Best Bid: ${btc['order_book']['bids'][0][0]:,.2f}
  Best Ask: ${btc['order_book']['asks'][0][0]:,.2f}
"""

        # Build ADA market section
        ada_ind = ada['indicators']
        ada_text = f"""
ADA MARKET DATA (ADAUSDT)
{'='*80}

Current Price: ${ada['price']:.4f}
24h Change: {ada['change_24h']:+.2f}%
24h High: ${ada['high_24h']:.4f}
24h Low: ${ada['low_24h']:.4f}
24h Volume: {ada['volume_24h']:,.0f} ADA

TECHNICAL INDICATORS:
  RSI (14): {ada_ind['rsi']:.2f} → {ada_ind['rsi_signal'].upper()}
    • <30 = Oversold (strong buy signal)
    • 30-70 = Neutral
    • >70 = Overbought (caution)

  Bollinger Bands (20, 2σ):
    Upper: ${ada_ind['bb_upper']:.4f}
    Middle: ${ada_ind['bb_middle']:.4f}
    Lower: ${ada_ind['bb_lower']:.4f}
    Position: {ada_ind['bb_position']:.1f}% between bands
    • <20% = Near lower band (potential buy)
    • >80% = Near upper band (potential sell)

  MACD (12, 26, 9):
    MACD: {ada_ind['macd']:.4f}
    Signal: {ada_ind['macd_signal']:.4f}
    Histogram: {ada_ind['macd_histogram']:.4f}
    • Histogram > 0 = Bullish momentum
    • Histogram < 0 = Bearish momentum

  Moving Averages:
    EMA 20: ${ada_ind['ema_20']:.4f}
    EMA 50: ${ada_ind['ema_50']:.4f}
    Price vs EMA20: {((ada['price'] - ada_ind['ema_20']) / ada_ind['ema_20'] * 100):+.2f}%
    Price vs EMA50: {((ada['price'] - ada_ind['ema_50']) / ada_ind['ema_50'] * 100):+.2f}%

  Volatility & Trend:
    ATR (14): ${ada_ind['atr']:.4f} → Volatility measure
    ADX (14): {ada_ind['adx']:.2f}
    • ADX <20 = Weak trend
    • ADX 20-40 = Moderate trend
    • ADX >40 = Strong trend

ORDER BOOK:
  Bid/Ask Spread: {ada['order_book']['spread_pct']:.3f}%
  Bid Liquidity: ${ada['order_book']['bid_liquidity']:,.0f}
  Ask Liquidity: ${ada['order_book']['ask_liquidity']:,.0f}
  Best Bid: ${ada['order_book']['bids'][0][0]:.4f}
  Best Ask: ${ada['order_book']['asks'][0][0]:.4f}
"""

        # Build open orders section
        if open_orders:
            orders_text = f"""
OPEN ORDERS ({len(open_orders)} active)
{'='*80}
"""
            for i, order in enumerate(open_orders, 1):
                orders_text += f"""
Order {i}:
  Symbol: {order['symbol']}
  Side: {order['side']} {order['type']}
  Price: ${order['price']:,.4f}
  Quantity: {order['quantity']:.8f}
  Filled: {order['filled']:.8f} ({(order['filled']/order['quantity']*100):.1f}%)
  Status: {order['status']}
  Created: {order['time']}
"""
        else:
            orders_text = f"""
OPEN ORDERS (0 active)
{'='*80}
No open orders currently.
"""

        # Combine all sections
        full_context = f"""{portfolio_text}
{btc_text}
{ada_text}
{orders_text}

ANALYSIS HINTS
{'='*80}

Strong Buy Signals:
  • RSI < 30 (extreme oversold)
  • Price near or below BB lower band (BB position < 20%)
  • MACD histogram turning positive after being negative
  • Price < EMA20 and EMA50 (potential mean reversion)
  • ADX < 20 after strong trend (consolidation/accumulation phase)

Strong Sell/Hold Signals:
  • RSI > 70 (overbought)
  • Price near or above BB upper band (BB position > 80%)
  • MACD histogram turning negative
  • Price significantly above EMAs (possible overextension)

DCA Strategy Considerations:
  • Focus on 10-year accumulation horizon
  • Prioritize entries during extreme fear/oversold conditions
  • Scale position sizes based on conviction (1-10 scale)
  • Consider both BTC (higher conviction) and ADA (diversification)
  • Respect portfolio risk limits (max 50% USDT deployment per decision)

"""

        return full_context

    @staticmethod
    def build_research_context(intelligence: Dict) -> str:
        """
        Build a concise context specifically for research planning

        Args:
            intelligence: Market intelligence dictionary

        Returns:
            Short context for planner agent (focuses on key metrics only)
        """
        portfolio = intelligence['portfolio']
        btc = intelligence['btc']
        ada = intelligence['ada']

        context = f"""CURRENT MARKET SNAPSHOT
Portfolio: ${portfolio['total_value_usd']:,.2f} | USDT: ${portfolio['usdt']['free']:,.2f} available

BTC: ${btc['price']:,.2f} | 24h: {btc['change_24h']:+.1f}% | RSI: {btc['indicators']['rsi']:.1f} ({btc['indicators']['rsi_signal']})
  BB Position: {btc['indicators']['bb_position']:.0f}% | MACD: {btc['indicators']['macd_histogram']:+.2f}

ADA: ${ada['price']:.4f} | 24h: {ada['change_24h']:+.1f}% | RSI: {ada['indicators']['rsi']:.1f} ({ada['indicators']['rsi_signal']})
  BB Position: {ada['indicators']['bb_position']:.0f}% | MACD: {ada['indicators']['macd_histogram']:+.4f}

Open Orders: {intelligence['open_orders_count']}

DCA Goal: 10-year accumulation of BTC and ADA during favorable entry conditions.
"""

        return context


if __name__ == '__main__':
    """Test context builder with mock data"""
    from binance_integration import BinanceMarketData
    from dotenv import load_dotenv

    load_dotenv()

    # Fetch real market data
    market = BinanceMarketData(testnet=True)
    intelligence = market.get_complete_market_intelligence()

    # Build full context
    builder = MarketContextBuilder()
    full_context = builder.build_context(intelligence)
    research_context = builder.build_research_context(intelligence)

    print("\n" + "="*80)
    print("FULL CONTEXT FOR AGENTS")
    print("="*80)
    print(full_context)

    print("\n" + "="*80)
    print("RESEARCH PLANNING CONTEXT")
    print("="*80)
    print(research_context)

    print("\n✅ Context builder working correctly!\n")
