"""
AI Decision Agent using OpenAI Responses API via Python Agents SDK

Single agent that makes DCA allocation decisions based on market data.
"""
from agents import Agent, Runner
from typing import Dict, Any
import config
from schemas import SimpleDCADecision
from utils import get_fear_greed_label, format_rsi_emoji, get_fear_greed_index


def create_decision_agent(intelligence: Dict[str, Any], max_deploy: float) -> Agent:
    """
    Create the DCA Decision Agent using Responses API.

    Args:
        intelligence: Complete market intelligence from BinanceMarketData
        max_deploy: Maximum USD allowed to deploy this session

    Returns:
        Agent configured for DCA decision making
    """
    btc = intelligence['btc']
    ada = intelligence['ada']
    portfolio = intelligence['portfolio']

    # Get Fear & Greed (from utils, cached)
    fear_greed = get_fear_greed_index()
    fg_label = get_fear_greed_label(fear_greed)

    instructions = f"""You are a DCA (Dollar-Cost Averaging) assistant specializing in long-term Bitcoin and Cardano accumulation.

INVESTMENT PHILOSOPHY:
- Time horizon: 10-15 years (generational wealth building)
- Goal: Accumulate BTC and ADA during market weakness and opportune moments
- Strategy: Patient capital deployment with data-driven timing
- Only accumulate (never sell except for critical black swan events)

CONSTRAINTS:
- Maximum to deploy TODAY: ${max_deploy:.2f} USD
- Minimum order size: ${config.MIN_ORDER_SIZE:.2f} USD per asset
- Assets available: BTC, ADA
- You can allocate to one, both, or neither (HOLD)

CURRENT MARKET DATA ({intelligence['timestamp']}):

BITCOIN (BTC):
- Current Price: ${btc['price']:,.2f}
- 24h Change: {btc['change_24h']:+.2f}%
- RSI(14): {btc['indicators']['rsi']:.1f} {format_rsi_emoji(btc['indicators']['rsi'])}
- Bollinger Bands: ${btc['indicators']['bb_lower']:,.2f} / ${btc['indicators']['bb_middle']:,.2f} / ${btc['indicators']['bb_upper']:,.2f}
- 24h Volume: ${btc['volume_24h']:,.0f}

CARDANO (ADA):
- Current Price: ${ada['price']:.4f}
- 24h Change: {ada['change_24h']:+.2f}%
- RSI(14): {ada['indicators']['rsi']:.1f} {format_rsi_emoji(ada['indicators']['rsi'])}
- Bollinger Bands: ${ada['indicators']['bb_lower']:.4f} / ${ada['indicators']['bb_middle']:.4f} / ${ada['indicators']['bb_upper']:.4f}
- 24h Volume: ${ada['volume_24h']:,.0f}

MARKET SENTIMENT:
- Fear & Greed Index: {fear_greed}/100 ({fg_label})

CURRENT PORTFOLIO:
- Total Value: ${portfolio['total_value_usd']:,.2f}
- USDT Available: ${portfolio['usdt']['free']:,.2f}
- BTC Holdings: {portfolio['btc']['free']:.8f} BTC (${portfolio['btc']['value_usd']:,.2f})
- ADA Holdings: {portfolio['ada']['free']:.2f} ADA (${portfolio['ada']['value_usd']:,.2f})

DECISION GUIDELINES:

Technical Analysis:
- RSI < 30 = Oversold (strong buy opportunity)
- RSI 30-45 = Weakening (moderate buy opportunity)
- RSI 45-55 = Neutral (normal DCA, no rush)
- RSI 55-70 = Strengthening (reduce deployment or wait)
- RSI > 70 = Overbought (HOLD or minimal deployment)

Sentiment Analysis:
- Fear & Greed < 25 = Extreme Fear (aggressive buying opportunity)
- Fear & Greed 25-45 = Fear (good buying opportunity)
- Fear & Greed 45-55 = Neutral (normal DCA)
- Fear & Greed 55-75 = Greed (be cautious, reduce deployment)
- Fear & Greed > 75 = Extreme Greed (HOLD, wait for pullback)

Allocation Strategy:
- You can deploy LESS than ${max_deploy:.2f} if conditions aren't ideal
- You can HOLD entirely (btc_amount=0, ada_amount=0) if both assets are overbought
- Prefer BTC for large allocations (more established)
- Consider ADA when it shows relative strength or better value
- Don't feel obligated to deploy all available capital

YOUR TASK:
Analyze the market data above and decide:
1. How much USD to deploy for Bitcoin (0 if skipping)
2. How much USD to deploy for Cardano (0 if skipping)
3. Clear reasoning for your decision (be specific about RSI, sentiment, price action)
4. Your confidence level (1=low uncertainty, 5=high conviction)

Remember:
- This is LONG-TERM accumulation (10-15 years)
- Patience is key - missing one day is fine if conditions aren't right
- Oversold + Fear = Opportunity
- Overbought + Greed = Wait
- Be conservative with capital - you can always deploy more tomorrow"""

    return Agent(
        name="DCA_DecisionAgent",
        model=config.MODEL,
        instructions=instructions,
        output_type=SimpleDCADecision  # Structured output via Responses API
    )


async def get_decision(
    intelligence: Dict[str, Any],
    max_deploy: float
) -> SimpleDCADecision:
    """
    Get AI decision using OpenAI Responses API via Agents SDK.

    Args:
        intelligence: Complete market intelligence
        max_deploy: Maximum allowed deployment

    Returns:
        SimpleDCADecision with btc_amount, ada_amount, reasoning, confidence

    Raises:
        Exception: If API call fails
    """
    print(f"🤖 Requesting AI decision (max deploy: ${max_deploy:.2f})...")

    try:
        # Create agent
        agent = create_decision_agent(intelligence, max_deploy)

        # User prompt (brief - context is in instructions)
        user_prompt = "Decide now: How should we allocate today's capital (if any)?"

        # Run agent using Responses API
        result = await Runner.run(agent, user_prompt)
        decision = result.final_output  # Already parsed to SimpleDCADecision

        print(f"   Decision: BTC=${decision.btc_amount:.2f}, ADA=${decision.ada_amount:.2f}")
        print(f"   Confidence: {decision.confidence}/5")
        print(f"   Reasoning: {decision.reasoning[:100]}...")

        # Safety validation: ensure total doesn't exceed max_deploy
        total = decision.btc_amount + decision.ada_amount
        if total > max_deploy:
            print(f"   ⚠️  AI exceeded max deploy (${total:.2f} > ${max_deploy:.2f}), scaling down...")
            scale_factor = max_deploy / total
            decision.btc_amount *= scale_factor
            decision.ada_amount *= scale_factor
            print(f"   Scaled to: BTC=${decision.btc_amount:.2f}, ADA=${decision.ada_amount:.2f}")

        # Validate minimum order sizes
        if 0 < decision.btc_amount < config.MIN_ORDER_SIZE:
            print(f"   ⚠️  BTC amount ${decision.btc_amount:.2f} below minimum, setting to 0")
            decision.btc_amount = 0.0

        if 0 < decision.ada_amount < config.MIN_ORDER_SIZE:
            print(f"   ⚠️  ADA amount ${decision.ada_amount:.2f} below minimum, setting to 0")
            decision.ada_amount = 0.0

        return decision

    except Exception as e:
        print(f"   ❌ AI decision failed: {e}")
        raise


def get_mock_decision(max_deploy: float) -> SimpleDCADecision:
    """
    Get a mock decision for testing without API calls.

    Args:
        max_deploy: Maximum allowed deployment

    Returns:
        SimpleDCADecision with test data
    """
    print("🧪 Using mock decision (testing mode)...")

    # Simple allocation: 60% BTC, 40% ADA
    btc_amount = max_deploy * 0.60
    ada_amount = max_deploy * 0.40

    return SimpleDCADecision(
        btc_amount=btc_amount,
        ada_amount=ada_amount,
        reasoning="Mock decision for testing: 60/40 BTC/ADA split",
        confidence=3
    )


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    import asyncio
    from pathlib import Path
    import sys

    # Add parent to path
    parent_dir = Path(__file__).parent.parent
    openai_agents_dir = parent_dir / "openai-agents-dca"
    sys.path.insert(0, str(parent_dir))
    sys.path.insert(0, str(openai_agents_dir))

    from binance_integration import BinanceMarketData

    print("Testing Decision Agent (Responses API)\n")

    async def test():
        # Get real market data
        print("1. Fetching market intelligence...")
        binance_data = BinanceMarketData()
        intelligence = binance_data.get_complete_market_intelligence()

        # Test with $100 max deploy
        max_deploy = 100.0

        print(f"\n2. Getting AI decision (max deploy: ${max_deploy})...")
        try:
            decision = await get_decision(intelligence, max_deploy)
            print(f"\n✅ Decision received:")
            print(f"   BTC: ${decision.btc_amount:.2f}")
            print(f"   ADA: ${decision.ada_amount:.2f}")
            print(f"   Total: ${decision.total_amount:.2f}")
            print(f"   Confidence: {decision.confidence}/5")
            print(f"   Reasoning: {decision.reasoning}")
            print(f"   Is Hold: {decision.is_hold}")

        except Exception as e:
            print(f"❌ Test failed: {e}")
            print("\n3. Falling back to mock decision...")
            decision = get_mock_decision(max_deploy)
            print(f"   {decision}")

    # Run test
    asyncio.run(test())
