"""
Strategist Agent - Synthesizes research and analysis into strategic options

Uses GPT-5 to:
1. Review all research summaries
2. Call specialist analyst tools as needed
3. Generate 3-5 strategic options with detailed rationale
4. Recommend top option
"""
from agents import Agent, Runner
from models.schemas import StrategyOptions, MarketContext
from config import ModelConfig, AgentConfig
from typing import List


def create_strategist_agent(
    technical_tool,
    fundamental_tool,
    risk_tool,
    sentiment_tool
) -> Agent:
    """
    Create Strategist Agent with specialist tools

    Args:
        technical_tool: Technical analyst exposed as tool
        fundamental_tool: Fundamental analyst exposed as tool
        risk_tool: Risk analyst exposed as tool
        sentiment_tool: Sentiment analyst exposed as tool

    Returns:
        Strategist Agent configured with all specialist tools
    """

    instructions = f"""You are a senior DCA portfolio strategist specializing in Bitcoin (BTC) and Cardano (ADA) accumulation.

YOUR ROLE:
Synthesize research findings and specialist analyses to generate 3-5 strategic options for accumulation.

CONTEXT:
- Investment horizon: 10+ years (generational wealth building)
- Goal: Accumulate BTC and ADA during market weakness
- Strategy: Patient capital deployment with smart timing
- Available capital: USDT balance (provided in context)
- Current holdings: BTC and ADA positions (provided in context)

PROCESS:

1. **REVIEW RESEARCH FINDINGS**:
   - You will receive 10-15 research summaries covering:
     * On-chain metrics
     * Ecosystem health
     * Macro catalysts
     * Technical setups
     * Sentiment indicators
   - Identify key themes and insights

2. **CALL SPECIALIST ANALYST TOOLS** (as needed):
   - technical_analysis: Get entry quality scores and recommended limit prices
   - fundamental_analysis: Get conviction scores and value assessment
   - risk_analysis: Get risk level and specific threats
   - sentiment_analysis: Get sentiment score and contrarian signals

   You have access to these 4 specialist agents as tools. Call them to get deeper insights.
   You don't have to call ALL of them - only the ones needed for decision-making.

3. **GENERATE {AgentConfig.MIN_STRATEGY_OPTIONS}-{AgentConfig.MAX_STRATEGY_OPTIONS} STRATEGIC OPTIONS**:

   Each option should represent a DIFFERENT approach:

   **Example Options**:

   A. **"Aggressive BTC Accumulation"**:
      - btc_allocation_pct: 40% of USDT
      - ada_allocation_pct: 10% of USDT
      - Actions: 2-3 limit orders for BTC at key levels, 1 limit for ADA
      - Conviction: 9/10
      - Rationale: "Extreme technical oversold + fundamental undervaluation + sentiment capitulation = rare opportunity"
      - Risks: "Could drop further if macro worsens, but we have 10-year horizon"
      - Expected outcome: "70% chance of fills within 48h given volatility"

   B. **"Balanced Accumulation"**:
      - btc_allocation_pct: 25% of USDT
      - ada_allocation_pct: 25% of USDT
      - Actions: Equal allocation to both assets, conservative limit prices
      - Conviction: 7/10
      - Rationale: "Both assets showing accumulation signals, diversify risk"
      - Risks: "Opportunity cost if BTC significantly outperforms"
      - Expected outcome: "50% chance of fills within 72h"

   C. **"Opportunistic ADA Focus"**:
      - btc_allocation_pct: 10% of USDT
      - ada_allocation_pct: 35% of USDT
      - Actions: Heavy ADA accumulation due to ecosystem catalysts
      - Conviction: 6/10
      - Rationale: "Hydra development + staking participation rising while price weak"
      - Risks: "ADA more volatile, beta to BTC, could underperform"
      - Expected outcome: "60% chance of fills within week"

   D. **"HOLD and Wait"**:
      - btc_allocation_pct: 0%
      - ada_allocation_pct: 0%
      - Actions: [HOLD action only]
      - Conviction: 5/10
      - Rationale: "Risk level elevated, no clear entry signal, patience warranted"
      - Risks: "Miss opportunity if market quickly recovers"
      - Expected outcome: "Wait for better setup"

   E. **"Conservative Scaling"**:
      - btc_allocation_pct: 15% of USDT
      - ada_allocation_pct: 5% of USDT
      - Actions: Small limit orders well below market
      - Conviction: 6/10
      - Rationale: "Cautious entry given mixed signals, nibble don't gorge"
      - Risks: "May not fill if market doesn't drop further"
      - Expected outcome: "30% chance of fills within week"

4. **SPECIFIC ACTION GENERATION**:

   For each strategic option, generate specific actions:

   **LIMIT BUY ORDER** (preferred):
   {{
     "type": "PLACE_LIMIT_BUY",
     "asset": "BTCUSDT" or "ADAUSDT",
     "price": specific_number (2-5% below current market),
     "quantity": calculated_from_allocation_pct,
     "reasoning": "Entry at $89,500 targets lower BB support with 65% fill probability"
   }}

   **MARKET BUY ORDER** (only for exceptional opportunities):
   {{
     "type": "PLACE_MARKET_BUY",
     "asset": "BTCUSDT" or "ADAUSDT",
     "quantity": calculated_from_allocation_pct,
     "reasoning": "RSI at 22, extreme capitulation, execute immediately"
   }}

   **CANCEL OLD ORDERS** (if needed to make room):
   {{
     "type": "CANCEL_ORDER",
     "order_id": "existing_order_id",
     "reasoning": "Cancel old stale order to place new one at better level"
   }}

   **HOLD**:
   {{
     "type": "HOLD",
     "reasoning": "No favorable entry signals, preserve capital and wait"
   }}

5. **RISK CONSTRAINTS** (Validate against):
   - Max {AgentConfig.MAX_ORDERS_PER_ASSET} open orders per asset ({AgentConfig.MAX_TOTAL_ORDERS} total)
   - Max {AgentConfig.MAX_PORTFOLIO_EXPOSURE_PCT}% portfolio exposure in pending orders
   - Limit prices within ±{AgentConfig.LIMIT_PRICE_DEVIATION_PCT}% of current market
   - Minimum ${AgentConfig.MIN_ORDER_VALUE_USD} per order

6. **SELECT RECOMMENDED OPTION**:
   - Based on synthesis of all data, which option is BEST?
   - Consider: Risk-reward, conviction, fill probability, risk level
   - Index of your top pick (0-based)

OUTPUT FORMAT:
Return a StrategyOptions object with:
- options: List of {AgentConfig.MIN_STRATEGY_OPTIONS}-{AgentConfig.MAX_STRATEGY_OPTIONS} StrategyOption objects
- recommended_option: int (index of your top pick)
- market_summary: str (2-3 sentence overview of current conditions)

IMPORTANT PRINCIPLES:
✓ OPTIONS SHOULD BE DIVERSE (not all similar)
✓ Include at least one conservative option (HOLD or small size)
✓ Include at least one aggressive option (if conditions support it)
✓ Specific prices > vague ranges ("$89,500" not "$89K-$90K")
✓ Calculate quantities from allocation % and USDT balance
✓ Rationale must tie to research findings and analyst outputs
✓ Conviction reflects strength of evidence (9-10 = exceptional)
✓ Expected outcome includes timeframe and probability
✓ Don't force trades - HOLD is valid if no good setup

EXAMPLE WORKFLOW:

You receive research findings showing:
- BTC RSI at 28 (oversold)
- Fear & Greed Index at 18 (extreme fear)
- Fed meeting next week (uncertainty)

You call tools:
1. technical_analysis → Returns BTC entry quality 8/10, recommended price $89,500
2. fundamental_analysis → Returns BTC conviction 9/10 (undervalued), ADA conviction 7/10
3. risk_analysis → Returns YELLOW (moderate risk due to Fed uncertainty)
4. sentiment_analysis → Returns contrarian buy signal (extreme fear)

You generate 4 options:
1. Aggressive BTC (40% USDT) - for bull case
2. Balanced (25% BTC, 25% ADA) - for diversification
3. Conservative (15% BTC only) - for cautious approach
4. HOLD - for bear case

You recommend option 1 (Aggressive BTC) because:
- Technical 8/10 + Fundamental 9/10 + Sentiment extreme fear = strong signal
- Risk is YELLOW not RED, manageable
- 10-year horizon reduces short-term macro concerns

Remember: You're PROPOSING options, not making final decision. Decision Agent will choose the best one.
"""

    # Create agent with specialist tools
    agent = Agent(
        name="DCA_Strategist",
        model=ModelConfig.STRATEGIST,  # GPT-5
        instructions=instructions,
        output_type=StrategyOptions,
    )

    # Add specialist tools
    agent = agent.clone(tools=[
        technical_tool,
        fundamental_tool,
        risk_tool,
        sentiment_tool,
    ])

    return agent


async def generate_strategy_options(
    market_context: MarketContext,
    research_summaries: List[dict],
    technical_tool,
    fundamental_tool,
    risk_tool,
    sentiment_tool
) -> StrategyOptions:
    """
    Generate strategic options using the Strategist Agent

    Args:
        market_context: Current market data and portfolio state
        research_summaries: List of research findings
        technical_tool: Technical analyst as tool
        fundamental_tool: Fundamental analyst as tool
        risk_tool: Risk analyst as tool
        sentiment_tool: Sentiment analyst as tool

    Returns:
        StrategyOptions with 3-5 strategic alternatives
    """
    # Create strategist with specialist tools
    strategist = create_strategist_agent(
        technical_tool,
        fundamental_tool,
        risk_tool,
        sentiment_tool
    )

    # Format the prompt
    user_prompt = format_strategist_prompt(market_context, research_summaries)

    print("\n🎯 Strategist synthesizing research and calling specialist tools...\n")

    # Run strategist
    result = await Runner.run(strategist, user_prompt)

    strategy_options = result.final_output

    print(f"\n✓ Generated {len(strategy_options.options)} strategic options")
    print(f"Market Summary: {strategy_options.market_summary}")
    print(f"Recommended Option: #{strategy_options.recommended_option + 1}\n")

    return strategy_options


def format_strategist_prompt(
    context: MarketContext,
    research_summaries: List[dict]
) -> str:
    """Format context for strategist"""

    portfolio = context.portfolio
    btc = context.btc_data
    ada = context.ada_data

    prompt = f"""STRATEGY SYNTHESIS REQUEST

Generate 3-5 strategic options for BTC/ADA accumulation based on comprehensive research and specialist analysis.

=== PORTFOLIO STATE ===
Total Value: ${portfolio.total_value_usd:,.2f}
Available USDT: ${portfolio.usdt_balance:,.2f} ({portfolio.usdt_balance / portfolio.total_value_usd * 100:.1f}%)
BTC Holdings: {portfolio.btc_balance:.8f} BTC ≈ ${portfolio.btc_value_usd:,.2f}
ADA Holdings: {portfolio.ada_balance:.2f} ADA ≈ ${portfolio.ada_value_usd:,.2f}

=== CURRENT MARKET STATE ===
BTC: ${btc.current_price:,.2f} ({btc.price_change_24h_pct:+.2f}% 24h) | RSI: {btc.indicators.rsi:.1f}
ADA: ${ada.current_price:.4f} ({ada.price_change_24h_pct:+.2f}% 24h) | RSI: {ada.indicators.rsi:.1f}

=== OPEN ORDERS ===
Current Open Orders: {len(context.open_orders)}
"""

    if context.open_orders:
        for order in context.open_orders:
            prompt += f"\n- {order.side} {order.quantity} {order.asset} @ ${order.price}"
    else:
        prompt += "\nNo open orders"

    prompt += "\n\n=== RESEARCH FINDINGS (10-15 Summaries) ===\n\n"

    # Add research summaries
    for i, summary in enumerate(research_summaries, 1):
        prompt += f"**{i}. {summary.get('query', 'Research Item')}**\n"
        prompt += f"{summary.get('summary', '')}\n"
        if summary.get('implications'):
            prompt += f"Implications: {summary['implications']}\n"
        prompt += "\n"

    if context.previous_plan:
        prompt += f"\n=== PREVIOUS STRATEGIC PLAN ===\n{context.previous_plan}\n"

    prompt += f"""

=== YOUR TASK ===

1. Review the research findings above
2. Call specialist analyst tools as needed:
   - technical_analysis (for entry quality and limit prices)
   - fundamental_analysis (for conviction and value assessment)
   - risk_analysis (for risk level and threats)
   - sentiment_analysis (for contrarian signals)
3. Generate {AgentConfig.MIN_STRATEGY_OPTIONS}-{AgentConfig.MAX_STRATEGY_OPTIONS} diverse strategic options
4. Each option must include:
   - Specific BTC/ADA allocation percentages
   - Concrete actions (PLACE_LIMIT_BUY, PLACE_MARKET_BUY, CANCEL_ORDER, HOLD)
   - Conviction score (1-10)
   - Detailed rationale tied to data
   - Risks and mitigations
   - Expected outcome with probability

5. Recommend your top pick (index)
6. Provide 2-3 sentence market summary

Remember: Options should be DIVERSE (aggressive, balanced, conservative, HOLD). Don't force trades if no good setup.
"""

    return prompt
