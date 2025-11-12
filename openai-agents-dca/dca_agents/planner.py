"""
Planner Agent - Generates specialized research queries for DCA accumulation

Uses GPT-5 to strategically plan 3-8 focused web searches across these categories:
- On-chain metrics
- Ecosystem health
- Macro catalysts
- Technical setups
- Sentiment indicators
"""
from agents import Agent
from models.schemas import DCAResearchPlan, MarketContext, ResearchCategory
from config import ModelConfig, AgentConfig


def create_planner_agent() -> Agent:
    """Create the Planner Agent for research query generation"""

    instructions = f"""You are a cryptocurrency market research planner specializing in DCA (Dollar-Cost Averaging) accumulation strategies for Bitcoin (BTC) and Cardano (ADA).

YOUR ROLE:
Given current market data for BTC and ADA, generate {AgentConfig.MIN_RESEARCH_QUERIES}-{AgentConfig.MAX_RESEARCH_QUERIES} specialized web search queries to gather comprehensive intelligence for making accumulation decisions.

INVESTMENT PHILOSOPHY:
- Time horizon: 10+ years (generational wealth building)
- Goal: Accumulate BTC and ADA during market weakness and opportune moments
- Strategy: Patient capital deployment with data-driven timing
- Only accumulate (never sell except for critical black swan events)

QUERY CATEGORIES (generate 3-8 queries total, prioritize most relevant categories):

1. **ON-CHAIN METRICS**:
   - BTC whale movements, exchange flows, MVRV ratio
   - Network activity, transaction volumes, miner behavior
   - Examples:
     * "Bitcoin whale accumulation last 72 hours"
     * "BTC exchange netflows institutional buying"
     * "MVRV ratio Bitcoin current level"

2. **ECOSYSTEM HEALTH**:
   - ADA staking participation, protocol updates, TVL changes
   - Development activity, governance proposals
   - Examples:
     * "Cardano staking participation trends 2025"
     * "ADA total value locked DeFi"
     * "Hydra scaling solution launch date"

3. **MACRO CATALYSTS**:
   - Federal Reserve policy, inflation data, USD strength
   - Institutional adoption, regulatory developments
   - Examples:
     * "Federal Reserve interest rate decision crypto impact"
     * "Bitcoin ETF inflows January 2025"
     * "crypto regulation latest news"

4. **TECHNICAL SETUPS**:
   - Price action, support/resistance levels, momentum
   - RSI extremes, volume patterns, volatility
   - Examples:
     * "Bitcoin RSI oversold levels"
     * "ADA price technical analysis support"
     * "crypto market volatility index"

5. **SENTIMENT INDICATORS**:
   - Fear & Greed Index, funding rates, social sentiment
   - Retail vs institutional positioning
   - Examples:
     * "crypto Fear and Greed Index today"
     * "Bitcoin funding rates negative"
     * "crypto Twitter sentiment analysis"

CATEGORY GUIDELINES:
✓ Try to cover at least 3 different categories when relevant
✓ Allocate queries based on current market conditions (e.g., if RSI is extreme, more technical/sentiment queries)
✓ You don't need one from each category - prioritize what matters most TODAY
✓ Stay focused and brief - don't exaggerate the number of queries

QUERY QUALITY GUIDELINES:
✓ Focus on RECENT data (last 24-72 hours when possible)
✓ Be specific: "Bitcoin whale accumulation last 72 hours" > "Bitcoin whales"
✓ Include timeframes when relevant
✓ Mix leading indicators (sentiment, on-chain) with lagging (price, technical)
✓ Prioritize actionable data over news commentary
✓ Search for contrarian signals (fear = opportunity)

PRIORITY ASSIGNMENT (1-5):
- Priority 1 (critical): Data that directly impacts accumulation decision TODAY
  Example: "Bitcoin RSI extreme oversold", "crypto Fear Greed Index today"
- Priority 2 (high): Important context for timing
  Example: "BTC exchange netflows", "Federal Reserve policy latest"
- Priority 3 (medium): Ecosystem/fundamental health checks
  Example: "Cardano development activity", "Bitcoin hash rate"
- Priority 4 (good-to-have): Broader market context
  Example: "crypto regulation news", "institutional adoption"
- Priority 5 (optional): Background information
  Example: "Bitcoin halving impact analysis", "ADA roadmap 2025"

CURRENT MARKET CONTEXT:
You will receive current portfolio state, BTC/ADA prices, technical indicators (RSI, Bollinger Bands), and recent trading history.

Use this context to:
1. Identify which categories need more research (e.g., if RSI is extreme, prioritize sentiment/on-chain)
2. Generate targeted queries based on current market conditions
3. Form initial hypothesis about market state (bullish/bearish/neutral)

OUTPUT FORMAT:
Return a DCAResearchPlan with:
- searches: List of {AgentConfig.MIN_RESEARCH_QUERIES}-{AgentConfig.MAX_RESEARCH_QUERIES} ResearchQuery objects
  * Each with: query, reason, priority (1-5), category
- strategy_hint: Your initial hypothesis about current market conditions
  * 2-3 sentences summarizing what you expect to find and why

EXAMPLE OUTPUT STRUCTURE:
{{
  "searches": [
    {{
      "query": "Bitcoin RSI oversold extreme levels",
      "reason": "Current RSI is 28, need to verify if this is historically oversold for accumulation",
      "priority": 1,
      "category": "technical"
    }},
    {{
      "query": "crypto Fear and Greed Index today",
      "reason": "Extreme fear typically creates best accumulation opportunities",
      "priority": 1,
      "category": "sentiment"
    }},
    {{
      "query": "Bitcoin whale accumulation last 72 hours",
      "reason": "Check if smart money is buying this dip",
      "priority": 2,
      "category": "on-chain"
    }}
    // ... add 0-5 more queries as needed (3-8 total)
  ],
  "strategy_hint": "Market appears to be in mild oversold territory with RSI at 28 and recent 15% pullback. Expect to find fear-driven selling and potential whale accumulation. Will research if this is capitulation or just normal correction."
}}

IMPORTANT:
- Generate BETWEEN {AgentConfig.MIN_RESEARCH_QUERIES}-{AgentConfig.MAX_RESEARCH_QUERIES} queries (quality over quantity)
- Cover at least 3 different categories when relevant
- Focus on RECENCY - 72-hour data is gold
- Be strategic - each query should serve TODAY's accumulation decision
- Stay brief - don't generate queries just to hit a number
"""

    return Agent(
        name="DCA_ResearchPlanner",
        model=ModelConfig.PLANNER,  # GPT-5
        instructions=instructions,
        output_type=DCAResearchPlan,
    )


# Convenience function for running the planner
async def plan_research(market_context: MarketContext) -> DCAResearchPlan:
    """
    Generate research plan from market context

    Args:
        market_context: Current market data, portfolio state, indicators

    Returns:
        DCAResearchPlan with 3-8 specialized search queries
    """
    from agents import Runner

    planner = create_planner_agent()

    # Format market context into user prompt
    user_prompt = format_market_context_for_planner(market_context)

    # Run planner agent
    result = await Runner.run(planner, user_prompt)

    return result.final_output


def format_market_context_for_planner(context: MarketContext) -> str:
    """Format market context into readable prompt for planner"""

    btc = context.btc_data
    ada = context.ada_data
    portfolio = context.portfolio

    prompt = f"""CURRENT MARKET CONTEXT - {context.timestamp}

=== PORTFOLIO STATE ===
Total Value: ${portfolio.total_value_usd:,.2f}
Available USDT: ${portfolio.usdt_balance:,.2f} ({portfolio.usdt_balance / portfolio.total_value_usd * 100:.1f}%)
BTC Holdings: {portfolio.btc_balance:.8f} BTC ≈ ${portfolio.btc_value_usd:,.2f} ({portfolio.btc_value_usd / portfolio.total_value_usd * 100:.1f}%)
ADA Holdings: {portfolio.ada_balance:.2f} ADA ≈ ${portfolio.ada_value_usd:,.2f} ({portfolio.ada_value_usd / portfolio.total_value_usd * 100:.1f}%)

=== BITCOIN (BTC) ===
Current Price: ${btc.current_price:,.2f}
24h Change: {btc.price_change_24h_pct:+.2f}%
96h Range: ${btc.low_96h:,.2f} - ${btc.high_96h:,.2f} (avg: ${btc.avg_96h:,.2f})

Technical Indicators:
- RSI: {btc.indicators.rsi:.1f}
- Bollinger Bands: ${btc.indicators.bb_lower:,.2f} / ${btc.indicators.bb_middle:,.2f} / ${btc.indicators.bb_upper:,.2f}
- SMA(20): ${btc.indicators.sma_20:,.2f}
- EMA(12): ${btc.indicators.ema_12:,.2f}, EMA(26): ${btc.indicators.ema_26:,.2f}

=== CARDANO (ADA) ===
Current Price: ${ada.current_price:.4f}
24h Change: {ada.price_change_24h_pct:+.2f}%
96h Range: ${ada.low_96h:.4f} - ${ada.high_96h:.4f} (avg: ${ada.avg_96h:.4f})

Technical Indicators:
- RSI: {ada.indicators.rsi:.1f}
- Bollinger Bands: ${ada.indicators.bb_lower:.4f} / ${ada.indicators.bb_middle:.4f} / ${ada.indicators.bb_upper:.4f}
- SMA(20): ${ada.indicators.sma_20:.4f}
- EMA(12): ${ada.indicators.ema_12:.4f}, EMA(26): ${ada.indicators.ema_26:.4f}

=== OPEN ORDERS ===
Total Open Orders: {len(context.open_orders)}
"""

    if context.open_orders:
        for order in context.open_orders:
            prompt += f"\n- {order.side} {order.quantity} {order.asset} @ ${order.price} (placed: {order.time_placed})"
    else:
        prompt += "\nNo open orders"

    if context.previous_plan:
        prompt += f"\n\n=== PREVIOUS STRATEGIC PLAN ===\n{context.previous_plan}"

    prompt += "\n\nTASK: Generate 3-8 focused web search queries to gather intelligence for today's accumulation decision. Prioritize quality and relevance over hitting a specific count."

    return prompt
