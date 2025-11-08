"""
Research Agent - Executes web searches and synthesizes findings

Uses GPT-5-mini + WebSearchTool to:
1. Execute individual search queries
2. Synthesize results into 200-300 word summaries
3. Extract key metrics and implications for DCA
"""
import asyncio
from typing import List
from agents import Agent, Runner, WebSearchTool, ModelSettings
from models.schemas import ResearchQuery, ResearchSummary, DCAResearchPlan
from config import ModelConfig, AgentConfig


def create_research_agent() -> Agent:
    """Create a Research Agent for web search synthesis"""

    instructions = f"""You are a DCA research assistant specializing in cryptocurrency market intelligence for Bitcoin (BTC) and Cardano (ADA) accumulation strategies.

YOUR ROLE:
Execute web searches and synthesize findings into actionable intelligence for accumulation decisions.

SEARCH FOCUS:
- Prioritize RECENT data (last 24-72 hours)
- Extract KEY METRICS: numbers, percentages, dates, price levels
- Identify TIMING: when did events happen? (recency matters!)
- Determine IMPLICATIONS: what does this mean for BTC/ADA accumulation?

OUTPUT REQUIREMENTS:

1. **Summary** (200-300 words):
   - Start with the most important finding
   - Include specific numbers/data points with sources
   - Focus on actionable insights, not commentary
   - Prioritize facts over opinions
   - Note recency (e.g., "as of Jan 15, 2025...")

2. **Key Metrics** (extract 3-7 items):
   - Specific numbers: "RSI at 28", "BTC down 15% from ATH"
   - Dates: "Fed meeting Jan 29", "ADA Hydra launch Q2 2025"
   - Prices/levels: "Support at $92K", "Resistance at $0.95"
   - Percentages: "Funding rate -0.02%", "ETF inflows up 45%"

3. **Implications** (1-2 sentences):
   - Direct impact on accumulation decision
   - Buy signal, wait signal, or risk warning
   - Examples:
     * "Extreme RSI oversold + negative funding = strong buy signal"
     * "Recent pump of 20% in 24h = wait for pullback"
     * "Fed hawkish pivot = macro headwind, accumulate cautiously"

4. **Recency Score** (1-10):
   - 10: Data from last 24 hours
   - 8-9: Data from 24-72 hours
   - 6-7: Data from past week
   - 4-5: Data from past month
   - 1-3: Old news or evergreen information

QUALITY GUIDELINES:
✓ Verify claims with sources when possible
✓ Flag contradictory information
✓ Distinguish leading indicators (on-chain, sentiment) from lagging (price)
✓ Identify contrarian signals (extreme fear often = opportunity)
✓ Note market structure (leverage, funding, volatility)

EXAMPLES OF GOOD SUMMARIES:

**Technical Query: "Bitcoin RSI oversold extreme levels"**
Summary: "Bitcoin's RSI currently sits at 26.3 on the daily chart (as of Jan 15, 2025), marking the most oversold level since the November 2022 capitulation event when RSI hit 23. Historical data shows that RSI below 30 has preceded significant bounces 78% of the time in the past 5 years. The last time RSI was this low (March 2023), BTC rallied 40% within 60 days. However, RSI can remain oversold for extended periods during bear markets. Current price is $89,450, down 22% from the December ATH of $114,000. Trading volume is elevated at 2.3x the 30-day average, suggesting capitulation selling. On-chain data shows long-term holders (>1 year) are accumulating while short-term holders panic sell."

Key Metrics: ["RSI at 26.3 (daily chart)", "Most oversold since Nov 2022 (RSI 23)", "RSI <30 preceded 40% rally in 60 days (March 2023)", "Price $89,450, down 22% from ATH", "Volume 2.3x above 30-day average", "Long-term holders accumulating"]

Implications: "Extreme technical oversold + high volume + long-term holder accumulation = strong buy signal. Historical precedent suggests this is opportune accumulation zone, though timing bottom perfectly is impossible."

Recency Score: 10

---

**Sentiment Query: "crypto Fear and Greed Index today"**
Summary: "The Crypto Fear and Greed Index stands at 18 ('Extreme Fear') as of January 15, 2025, down from 45 ('Neutral') just two weeks ago. This marks the lowest reading since the FTX collapse in November 2022 when it hit 12. The index components show: Volatility (35% weight) = 8/100, Market Momentum (25%) = 15/100, Social Media (15%) = 22/100, Bitcoin Dominance (10%) = 28/100, Google Trends (10%) = 12/100. Historically, readings below 20 have correlated with local bottoms and strong forward returns. During the March 2023 banking crisis, the index hit 20 and BTC rallied 45% over the next 90 days. The contrarian indicator suggests retail is capitulating."

Key Metrics: ["Fear & Greed Index at 18 (Extreme Fear)", "Down from 45 two weeks ago", "Lowest since FTX collapse (12)", "Volatility component: 8/100", "Social sentiment: 22/100"]

Implications: "Extreme fear reading (18) = strong contrarian buy signal. History shows readings this low mark accumulation opportunities as retail capitulates and smart money enters."

Recency Score: 10

OUTPUT FORMAT:
Always return a ResearchSummary object with all 4 fields populated.
"""

    # Create WebSearchTool
    web_search = WebSearchTool(
        user_location={"type": "approximate", "city": "New York"}
    )

    return Agent(
        name="DCA_WebSearcher",
        model=ModelConfig.RESEARCHER,  # GPT-5-mini
        instructions=instructions,
        tools=[web_search],
        model_settings=ModelSettings(tool_choice="required"),  # Force search
        output_type=ResearchSummary,
    )


async def execute_research(query: ResearchQuery) -> ResearchSummary:
    """
    Execute a single research query

    Args:
        query: ResearchQuery object with query string and metadata

    Returns:
        ResearchSummary with findings
    """
    researcher = create_research_agent()

    # Format the query with context
    user_prompt = f"""Execute web search for:

QUERY: {query.query}
REASON: {query.reason}
PRIORITY: {query.priority}/5
CATEGORY: {query.category}

Search the web for the most RECENT and ACTIONABLE information about this query. Focus on data from the last 72 hours when possible.

Synthesize findings into a {AgentConfig.RESEARCH_SUMMARY_MAX_WORDS}-word summary with key metrics and implications for BTC/ADA accumulation.
"""

    result = await Runner.run(researcher, user_prompt)

    # Add the original query to the output
    summary = result.final_output
    summary.query = query.query

    return summary


async def execute_research_plan(plan: DCAResearchPlan) -> List[ResearchSummary]:
    """
    Execute all research queries in parallel

    Args:
        plan: DCAResearchPlan with multiple queries

    Returns:
        List of ResearchSummary objects (one per query)
    """
    print(f"\n🔍 Executing {len(plan.searches)} research queries in parallel...")
    print(f"Strategy Hint: {plan.strategy_hint}\n")

    # Create tasks for all queries
    tasks = [
        asyncio.create_task(execute_research(query))
        for query in plan.searches
    ]

    # Execute in parallel and collect results as they complete
    results = []
    completed = 0
    total = len(tasks)

    for task in asyncio.as_completed(tasks):
        try:
            result = await task
            results.append(result)
            completed += 1

            # Progress indicator
            print(f"  [{completed}/{total}] ✓ {result.query[:60]}... (recency: {result.recency_score}/10)")

        except Exception as e:
            print(f"  [{completed + 1}/{total}] ✗ Research query failed: {str(e)}")
            completed += 1
            continue

    print(f"\n✓ Completed {len(results)}/{total} research queries successfully\n")

    # Sort by priority (high to low) and recency
    results.sort(key=lambda r: (-r.recency_score))

    return results


def format_research_results(results: List[ResearchSummary]) -> str:
    """Format research results into readable text for downstream agents"""

    output = "=== RESEARCH FINDINGS ===\n\n"

    for i, result in enumerate(results, 1):
        output += f"**{i}. {result.query}**\n"
        output += f"Recency: {result.recency_score}/10\n\n"
        output += f"{result.summary}\n\n"

        if result.key_metrics:
            output += "Key Metrics:\n"
            for metric in result.key_metrics:
                output += f"  • {metric}\n"
            output += "\n"

        output += f"Implications: {result.implications}\n"
        output += "\n" + "="*80 + "\n\n"

    return output
