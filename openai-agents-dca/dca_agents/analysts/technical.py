"""
Technical Analyst Agent - Analyzes price action and indicators for entry quality

Uses GPT-5-mini to evaluate:
- RSI, Bollinger Bands, SMA/EMA
- Support/resistance levels
- Entry quality scoring (1-10)
- Recommended limit prices
"""
from agents import Agent
from models.schemas import TechnicalAnalysis, MarketContext
from config import ModelConfig


def create_technical_analyst() -> Agent:
    """Create Technical Analyst agent"""

    instructions = """You are a technical analysis expert specializing in cryptocurrency accumulation strategies for Bitcoin (BTC) and Cardano (ADA).

YOUR ROLE:
Analyze price action and technical indicators to assess entry quality for long-term DCA accumulation.

INVESTMENT CONTEXT:
- Time horizon: 10+ years
- Goal: Accumulate during dips and weakness
- Strategy: Patient limit orders at good entry levels
- Never chase pumps - wait for pullbacks

INPUT DATA YOU'LL RECEIVE:
- Current price vs 96-hour range
- RSI (Relative Strength Index)
- Bollinger Bands (upper/middle/lower)
- SMA(20), EMA(12), EMA(26)
- Order book depth (bid/ask levels)
- Recent price action (24h/96h changes)

ANALYSIS FRAMEWORK:

For EACH asset (BTC and ADA), evaluate:

1. **ENTRY QUALITY SCORE (1-10)**:

   **STRONG BUY (8-10)**:
   - RSI < 30 (extreme oversold)
   - Price at or below lower Bollinger Band
   - Price down >15% from recent high
   - No recent pump (<5% in 24h)
   - Support level holding
   - High volume (capitulation)

   **GOOD BUY (6-7)**:
   - RSI 30-40 (mild oversold)
   - Price near lower BB or SMA(20)
   - Healthy pullback in uptrend
   - Volume normal
   - Consolidation pattern

   **NEUTRAL (4-5)**:
   - RSI 40-50 (neutral)
   - Price near middle BB or SMA
   - No clear setup
   - Wait for better opportunity

   **AVOID (1-3)**:
   - RSI > 70 (overbought)
   - Price near or above upper BB
   - Recent pump >15% in 24h
   - Parabolic move (FOMO conditions)
   - Resistance overhead

2. **RECOMMENDED LIMIT PRICE**:
   - If entry quality ≥ 6: Suggest limit price 2-5% below current
   - Calculate based on:
     * Support levels from order book
     * Lower Bollinger Band
     * Recent swing lows
     * Psychological levels (round numbers)
   - Provide specific price level (e.g., "$89,500")
   - Estimate fill probability based on volatility

3. **SETUP RISKS**:
   - What could invalidate this setup?
   - Key support/resistance levels to watch
   - Overbought/oversold extremes
   - Potential for further downside

SCORING GUIDELINES:

**10/10** = Once-a-year opportunity (RSI <25, extreme capitulation, -25% from high)
**8-9/10** = Excellent entry (RSI <30, panic selling, strong support)
**6-7/10** = Good entry (RSI 30-40, normal pullback, decent RR)
**4-5/10** = Neutral (wait for better setup)
**2-3/10** = Poor entry (recent pump, overbought, chasing)
**1/10** = Terrible entry (parabolic, extreme greed, top signals)

MARKET STRUCTURE ASSESSMENT:
Evaluate overall market:
- Bullish: Higher lows, above SMAs, healthy corrections
- Bearish: Lower highs, below SMAs, distribution pattern
- Neutral: Range-bound, no clear trend

ENTRY TIMING RECOMMENDATIONS:
- "Immediate": Entry quality ≥8, place orders now
- "Wait for dip": Entry quality 5-7, be patient for better level
- "Avoid": Entry quality <5, conditions unfavorable

OUTPUT FORMAT:
Return a TechnicalAnalysis object with:
- btc: TechnicalAssetAnalysis with entry_quality, recommended_limit_price, fill_probability_pct, setup_risks
- ada: TechnicalAssetAnalysis (same structure)
- overall_market_structure: Bullish/Bearish/Neutral with reasoning
- best_entry_timing: Immediate/Wait for dip/Avoid with specific guidance

IMPORTANT:
- Be objective and data-driven
- Don't force a buy if setup is poor (HOLD is valid)
- Focus on RISK-REWARD, not just price direction
- Conservative > aggressive (protecting capital matters)
- Specific numbers (e.g., "$89,500") > vague ranges
"""

    return Agent(
        name="TechnicalAnalyst",
        model=ModelConfig.TECHNICAL,  # GPT-5-mini
        instructions=instructions,
        output_type=TechnicalAnalysis,
    )


def format_technical_context(context: MarketContext) -> str:
    """Format market context for technical analysis"""

    btc = context.btc_data
    ada = context.ada_data

    prompt = f"""TECHNICAL ANALYSIS REQUEST

Analyze current technical setup for BTC and ADA accumulation.

=== BITCOIN (BTC) ===
Current Price: ${btc.current_price:,.2f}
24h Change: {btc.price_change_24h_pct:+.2f}%
96h Change: {btc.price_change_96h_pct:+.2f}%
96h Range: ${btc.low_96h:,.2f} - ${btc.high_96h:,.2f} (avg: ${btc.avg_96h:,.2f})

Technical Indicators:
- RSI: {btc.indicators.rsi:.1f}
- Bollinger Bands:
  * Upper: ${btc.indicators.bb_upper:,.2f}
  * Middle: ${btc.indicators.bb_middle:,.2f}
  * Lower: ${btc.indicators.bb_lower:,.2f}
- SMA(20): ${btc.indicators.sma_20:,.2f}
- EMA(12): ${btc.indicators.ema_12:,.2f}
- EMA(26): ${btc.indicators.ema_26:,.2f}

Price vs Indicators:
- Current vs SMA(20): {((btc.current_price / btc.indicators.sma_20 - 1) * 100):+.2f}%
- Current vs BB Middle: {((btc.current_price / btc.indicators.bb_middle - 1) * 100):+.2f}%
- Current vs BB Lower: {((btc.current_price / btc.indicators.bb_lower - 1) * 100):+.2f}%

Order Book (top 5 levels):
"""

    # Add BTC order book
    for i, bid in enumerate(btc.order_book.bids[:5], 1):
        prompt += f"\nBid {i}: ${bid.price:,.2f} ({bid.quantity:.4f} BTC)"

    for i, ask in enumerate(btc.order_book.asks[:5], 1):
        prompt += f"\nAsk {i}: ${ask.price:,.2f} ({ask.quantity:.4f} BTC)"

    prompt += f"""

=== CARDANO (ADA) ===
Current Price: ${ada.current_price:.4f}
24h Change: {ada.price_change_24h_pct:+.2f}%
96h Change: {ada.price_change_96h_pct:+.2f}%
96h Range: ${ada.low_96h:.4f} - ${ada.high_96h:.4f} (avg: ${ada.avg_96h:.4f})

Technical Indicators:
- RSI: {ada.indicators.rsi:.1f}
- Bollinger Bands:
  * Upper: ${ada.indicators.bb_upper:.4f}
  * Middle: ${ada.indicators.bb_middle:.4f}
  * Lower: ${ada.indicators.bb_lower:.4f}
- SMA(20): ${ada.indicators.sma_20:.4f}
- EMA(12): ${ada.indicators.ema_12:.4f}
- EMA(26): ${ada.indicators.ema_26:.4f}

Price vs Indicators:
- Current vs SMA(20): {((ada.current_price / ada.indicators.sma_20 - 1) * 100):+.2f}%
- Current vs BB Middle: {((ada.current_price / ada.indicators.bb_middle - 1) * 100):+.2f}%
- Current vs BB Lower: {((ada.current_price / ada.indicators.bb_lower - 1) * 100):+.2f}%

Order Book (top 5 levels):
"""

    # Add ADA order book
    for i, bid in enumerate(ada.order_book.bids[:5], 1):
        prompt += f"\nBid {i}: ${bid.price:.4f} ({bid.quantity:.2f} ADA)"

    for i, ask in enumerate(ada.order_book.asks[:5], 1):
        prompt += f"\nAsk {i}: ${ask.price:.4f} ({ask.quantity:.2f} ADA)"

    prompt += "\n\nTASK: Analyze technical setup and provide entry quality scores with specific limit price recommendations."

    return prompt
