"""
DCA Agent System Test - Using OpenAI Agents SDK

This demonstrates the 5-stage pipeline with actual OpenAI agent calls.
"""
import asyncio
from pydantic import BaseModel
from agents import Agent, Runner, WebSearchTool
from agents.model_settings import ModelSettings
from datetime import datetime


# ============================================================================
# STAGE 1: Research Planning
# ============================================================================

class ResearchQuery(BaseModel):
    query: str
    reason: str
    category: str


class ResearchPlan(BaseModel):
    searches: list[ResearchQuery]
    strategy_hint: str


# Planner Agent (GPT-5 for strategic planning)
planner_agent = Agent(
    name="DCA_Planner",
    model="gpt-5",  # Heavy IQ task: strategic research planning
    instructions="""You are a cryptocurrency DCA research planner.

Generate exactly 5 web search queries for BTC/ADA accumulation decision.

Categories:
- on-chain: BTC whale movements, exchange flows
- technical: RSI levels, support/resistance
- sentiment: Fear & Greed Index, funding rates
- macro: Fed policy, institutional adoption

For each search provide: query, reason, category.""",
    output_type=ResearchPlan
)


# Research Agent with WebSearch (GPT-5-mini for execution)
search_agent = Agent(
    name="DCA_Researcher",
    model="gpt-5-mini",  # Lightweight: execute searches and summarize
    instructions="""You are a crypto research assistant.

Use web search to find RECENT data (last 72 hours preferred).
Summarize in 200 words with:
- Key metrics/numbers
- Timing (when did this happen?)
- Implications for BTC/ADA accumulation

Focus on actionable data, not commentary.""",
    tools=[WebSearchTool()],
    model_settings=ModelSettings(tool_choice="required")
)


# ============================================================================
# STAGE 2: Analysis
# ============================================================================

class TechnicalAnalysis(BaseModel):
    btc_entry_quality: int  # 1-10
    ada_entry_quality: int  # 1-10
    recommendation: str


class RiskAnalysis(BaseModel):
    risk_level: str  # GREEN/YELLOW/RED
    assessment: str


class SentimentAnalysis(BaseModel):
    sentiment_score: int  # -10 to +10
    contrarian_opportunity: bool
    assessment: str


technical_analyst = Agent(
    name="TechnicalAnalyst",
    model="gpt-5-mini",  # Lightweight: technical analysis
    instructions="""You are a technical analyst for crypto DCA.

Analyze the market data and rate entry quality 1-10:
- 8-10: Strong buy (RSI <30, oversold, panic)
- 6-7: Good buy (RSI 30-40, mild oversold)
- 4-5: Neutral (wait for better setup)
- 1-3: Avoid (overbought, recent pump)

Provide specific recommendations.""",
    output_type=TechnicalAnalysis
)


risk_analyst = Agent(
    name="RiskAnalyst",
    model="gpt-5-mini",  # Lightweight: risk assessment
    instructions="""You are a risk analyst for crypto DCA.

Assess overall risk:
- GREEN: Low risk, normal accumulation
- YELLOW: Moderate risk, cautious approach
- RED: High risk, defensive posture

Consider: market structure, macro environment, tail risks.""",
    output_type=RiskAnalysis
)


sentiment_analyst = Agent(
    name="SentimentAnalyst",
    model="gpt-5-mini",  # Lightweight: sentiment analysis
    instructions="""You are a sentiment analyst for crypto.

Score sentiment -10 to +10:
- -10 to -7: Extreme fear (BUY signal)
- -6 to -3: Fear (good buy)
- -2 to +2: Neutral
- +3 to +6: Greed (caution)
- +7 to +10: Extreme greed (AVOID)

Identify contrarian opportunities.""",
    output_type=SentimentAnalysis
)


# ============================================================================
# STAGE 3: Strategy
# ============================================================================

class StrategyOption(BaseModel):
    name: str
    btc_allocation_pct: float
    ada_allocation_pct: float
    conviction: int  # 1-10
    rationale: str


class StrategyOptions(BaseModel):
    options: list[StrategyOption]
    recommended_option: int
    market_summary: str


# Create strategist with analyst tools
tech_tool = technical_analyst.as_tool(
    "technical_analysis",
    "Get technical entry quality scores"
)
risk_tool = risk_analyst.as_tool(
    "risk_analysis",
    "Get risk level assessment"
)
sentiment_tool = sentiment_analyst.as_tool(
    "sentiment_analysis",
    "Get sentiment score and contrarian signals"
)

strategist_agent = Agent(
    name="DCA_Strategist",
    model="gpt-5",  # Heavy IQ: strategy synthesis and option generation
    instructions="""You are a DCA portfolio strategist.

Review research findings and call analyst tools as needed:
- technical_analysis: Entry quality scores
- risk_analysis: Risk level
- sentiment_analysis: Contrarian signals

Generate 3-4 strategic options:
1. Aggressive (if signals strong)
2. Balanced
3. Conservative
4. HOLD (if no good setup)

Each option: name, BTC%, ADA%, conviction 1-10, rationale.
Recommend your top pick.""",
    tools=[tech_tool, risk_tool, sentiment_tool],
    output_type=StrategyOptions
)


# ============================================================================
# STAGE 4: Decision
# ============================================================================

class TradingDecision(BaseModel):
    selected_option: int
    strategy_name: str
    reasoning: str
    plan: str


decision_agent = Agent(
    name="DCA_DecisionMaker",
    model="gpt-5",  # Heavy IQ: final decision-making
    instructions="""You are the final decision-maker for DCA.

Review all strategic options and select THE BEST one.

Consider:
- Conviction level (higher = more aggressive)
- Risk-reward profile
- Evidence quality

Output: selected option index, reasoning, updated plan.

Choose based on data, not hope. HOLD is valid if no edge.""",
    output_type=TradingDecision
)


# ============================================================================
# Main Orchestrator
# ============================================================================

async def run_dca_pipeline():
    """Run the complete 5-stage DCA decision pipeline"""

    print("\n" + "="*80)
    print("DCA SUPERHUMAN AGENT SYSTEM - LIVE TEST")
    print("="*80)

    # Mock market context
    market_context = """
PORTFOLIO:
- Total: $10,000
- USDT: $5,000 (50%)
- BTC: 0.025 BTC ≈ $2,250
- ADA: 3000 ADA ≈ $2,750

CURRENT MARKET:
- BTC: $89,500 (24h: -5.2%, RSI: 28.3)
- ADA: $0.9165 (24h: -3.8%, RSI: 38.5)

Previous Plan: Accumulating during pullback, waiting for extreme oversold.
"""

    # STAGE 1: Research Planning
    print("\n📋 STAGE 1: RESEARCH PLANNING")
    print("-" * 80)
    plan_result = await Runner.run(
        planner_agent,
        f"Generate research queries for BTC/ADA accumulation.\n\n{market_context}"
    )
    research_plan = plan_result.final_output
    print(f"✓ Generated {len(research_plan.searches)} research queries")
    print(f"Strategy Hint: {research_plan.strategy_hint}")

    # Show first 3 queries
    for i, query in enumerate(research_plan.searches[:3], 1):
        print(f"  {i}. [{query.category}] {query.query}")

    # STAGE 1b: Execute searches (parallel)
    print("\n🔍 Executing web searches in parallel...")
    search_tasks = []
    for query in research_plan.searches:  # Execute all 5 queries
        input_text = f"Search: {query.query}\nReason: {query.reason}"
        task = asyncio.create_task(Runner.run(search_agent, input_text))
        search_tasks.append(task)

    search_results = []
    for i, task in enumerate(asyncio.as_completed(search_tasks), 1):
        result = await task
        search_results.append(str(result.final_output))
        print(f"  [{i}/{len(search_tasks)}] Completed")

    print(f"✓ Completed {len(search_results)} searches")

    # Format research for downstream
    research_summary = "\n\n".join([
        f"Research {i+1}:\n{result}"
        for i, result in enumerate(search_results)
    ])

    # STAGE 3: Strategy Synthesis
    print("\n\n🎯 STAGE 3: STRATEGY SYNTHESIS")
    print("-" * 80)
    print("Strategist calling analyst tools and generating options...")

    strategy_input = f"""
{market_context}

RESEARCH FINDINGS:
{research_summary}

Generate 3-4 strategic options for accumulation.
Call analyst tools as needed for deeper insights.
"""

    strategy_result = await Runner.run(strategist_agent, strategy_input)
    strategy_options = strategy_result.final_output

    print(f"✓ Generated {len(strategy_options.options)} strategic options")
    print(f"Market Summary: {strategy_options.market_summary}")
    print(f"\nOptions:")
    for i, opt in enumerate(strategy_options.options, 1):
        print(f"  {i}. {opt.name} (Conviction: {opt.conviction}/10)")
        print(f"     BTC: {opt.btc_allocation_pct}%, ADA: {opt.ada_allocation_pct}%")

    # STAGE 4: Final Decision
    print("\n\n⚖️  STAGE 4: FINAL DECISION")
    print("-" * 80)

    decision_input = f"""
{market_context}

STRATEGIC OPTIONS:
{strategy_options.model_dump_json(indent=2)}

Recommended: Option {strategy_options.recommended_option + 1}

Select THE BEST option and provide detailed reasoning.
"""

    decision_result = await Runner.run(decision_agent, decision_input)
    decision = decision_result.final_output

    print(f"✓ Selected: Option {decision.selected_option + 1} - {decision.strategy_name}")
    print(f"\nReasoning:")
    print(f"  {decision.reasoning}")
    print(f"\nUpdated Plan:")
    print(f"  {decision.plan}")

    # Summary
    print("\n\n" + "="*80)
    print("✅ DECISION COMPLETE")
    print("="*80)

    selected = strategy_options.options[decision.selected_option]
    print(f"\nStrategy: {selected.name}")
    print(f"Conviction: {selected.conviction}/10")
    print(f"Allocation: BTC {selected.btc_allocation_pct}%, ADA {selected.ada_allocation_pct}%")
    print(f"Rationale: {selected.rationale}")

    print("\n" + "="*80)
    print("\n✅ Full pipeline executed successfully with real OpenAI agents!")
    print("This demonstrates the 5-stage architecture with actual API calls.\n")


if __name__ == "__main__":
    asyncio.run(run_dca_pipeline())
