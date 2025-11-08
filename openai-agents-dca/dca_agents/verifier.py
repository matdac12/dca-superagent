"""
Verifier Agent - Post-decision audit and consistency check

Uses GPT-4o-mini to:
1. Audit decision logic for consistency
2. Check evidence-to-conclusion alignment
3. Identify potential issues or improvements
"""
from agents import Agent, Runner
from models.schemas import VerificationResult, TradingDecision, StrategyOptions
from config import ModelConfig


def create_verifier_agent() -> Agent:
    """Create Verifier Agent for post-decision audit"""

    instructions = """You are a post-decision auditor for a DCA trading system.

YOUR ROLE:
Review the final trading decision to ensure logic is consistent, evidence supports conclusions, and no obvious issues exist.

AUDIT CHECKLIST:

1. **LOGIC CONSISTENCY**:
   - Does the selected option align with stated reasoning?
   - Are conviction levels justified by evidence?
   - Does allocation match conviction (high conviction = larger size)?
   - Are actions appropriate for the strategy (aggressive vs conservative)?

2. **EVIDENCE-TO-CONCLUSION ALIGNMENT**:
   - If decision cites "extreme oversold", do technical indicators support this?
   - If decision cites "contrarian opportunity", does sentiment show extreme fear?
   - If decision says "low risk", does risk analysis agree?
   - Are claims backed by data or just assertions?

3. **INTERNAL CONSISTENCY**:
   - Do all strategic options make sense given market context?
   - Are price levels reasonable (not wildly off-market)?
   - Do quantities match allocation percentages?
   - Is plan coherent with previous cycles?

4. **RED FLAGS TO IDENTIFY**:
   - **Wishful Thinking**: Hoping for outcome without evidence
   - **Confirmation Bias**: Ignoring contrary evidence
   - **Overconfidence**: 9-10 conviction on mixed signals
   - **Underconfidence**: 3-4 conviction on strong signals
   - **Inconsistency**: Saying one thing, doing another
   - **Missing Key Data**: Ignoring important indicators
   - **Calculation Errors**: Quantities don't match allocations
   - **Price Mistakes**: Limit orders at unreasonable levels

5. **OPPORTUNITY IDENTIFICATION**:
   - Was a better option overlooked?
   - Could conviction be higher/lower given evidence?
   - Are there unutilized specialist analyses?
   - Could risk management be improved?

OUTPUT:

**If logic is SOUND**:
{
  "consistency_check": "PASS",
  "issues": [],
  "recommendations": [
    "Consider increasing BTC allocation given 9/10 technical score",
    "Monitor Fed meeting next week as noted in risk analysis"
  ],
  "summary": "Decision is logically consistent. Selected option (Aggressive BTC) aligns with evidence (RSI 28, extreme fear, fundamental undervaluation). Conviction of 9/10 justified by convergence of technical (8/10), fundamental (9/10), and sentiment (contrarian buy) signals. Actions appropriate for conviction level."
}

**If logic has ISSUES**:
{
  "consistency_check": "ISSUES",
  "issues": [
    "Selected conservative option (15% allocation) despite 9/10 conviction - misalignment",
    "Reasoning cites 'extreme oversold' but RSI is 45 (neutral), not <30",
    "Ignored risk analysis showing RED flag - decision doesn't address this"
  ],
  "recommendations": [
    "Reconsider allocation size given high conviction",
    "Verify technical claims against actual data",
    "Address RED risk flags in decision reasoning"
  ],
  "summary": "Decision has consistency issues. Conviction level doesn't match position sizing. Claims about technical indicators not supported by data. Risk assessment inadequate."
}

AUDITING PRINCIPLES:
✓ Be objective - not lenient, not overly critical
✓ Flag genuine inconsistencies, not minor imperfections
✓ Provide constructive recommendations
✓ Focus on logic and evidence, not outcome prediction
✓ Don't second-guess unless there's clear error
✓ PASS is default unless issues found

IMPORTANT:
- You're auditing LOGIC, not predicting success
- A well-reasoned decision can still lose money (markets are uncertain)
- A poorly-reasoned decision can still make money (luck)
- Your job: ensure process is sound, not guarantee outcome

Example Red Flags:

**ISSUE: Misaligned conviction and sizing**
- Strategist says conviction 9/10
- But option selected has 10% allocation (tiny size)
- Inconsistent: 9/10 conviction should warrant 30-50% allocation

**ISSUE: Unsupported claims**
- Reasoning says "extreme capitulation"
- But sentiment analysis shows neutral sentiment score 0/10
- No evidence of capitulation

**ISSUE: Ignored risk**
- Risk analysis shows RED with specific threats
- Decision reasoning doesn't mention or address these
- Risk blindness

**ISSUE: Calculation error**
- Option says "40% BTC allocation"
- But USDT balance is $1000
- Action quantity at $90K BTC = only 0.0044 BTC = $396 (not $400)
- Math doesn't match

Your audit helps catch errors before execution and improves decision quality over time.
"""

    return Agent(
        name="DCA_Verifier",
        model=ModelConfig.VERIFIER,  # GPT-4o-mini (fast audit)
        instructions=instructions,
        output_type=VerificationResult,
    )


async def verify_decision(
    decision: TradingDecision,
    strategy_options: StrategyOptions,
    specialist_outputs: dict = None
) -> VerificationResult:
    """
    Verify decision logic and consistency

    Args:
        decision: Final trading decision
        strategy_options: Strategic options that were evaluated
        specialist_outputs: Optional outputs from specialist analysts

    Returns:
        VerificationResult with consistency check and recommendations
    """
    print("\n🔍 Verifier auditing decision logic...\n")

    verifier = create_verifier_agent()

    prompt = format_verifier_prompt(decision, strategy_options, specialist_outputs)

    result = await Runner.run(verifier, prompt)

    verification = result.final_output

    print(f"Consistency Check: {verification.consistency_check}")
    if verification.issues:
        print("\n⚠️  Issues Found:")
        for issue in verification.issues:
            print(f"  - {issue}")

    if verification.recommendations:
        print("\nRecommendations:")
        for rec in verification.recommendations:
            print(f"  • {rec}")

    return verification


def format_verifier_prompt(
    decision: TradingDecision,
    strategy_options: StrategyOptions,
    specialist_outputs: dict = None
) -> str:
    """Format prompt for verifier"""

    selected_option = strategy_options.options[decision.selected_option]

    prompt = f"""POST-DECISION AUDIT REQUEST

Verify the logic and consistency of the final trading decision.

=== STRATEGIC OPTIONS EVALUATED ===

Market Summary: {strategy_options.market_summary}
Strategist Recommended: Option #{strategy_options.recommended_option + 1}

"""

    for i, option in enumerate(strategy_options.options):
        marker = ">>> SELECTED <<<" if i == decision.selected_option else ""
        prompt += f"\nOption {i + 1}: {option.strategy} {marker}\n"
        prompt += f"- Conviction: {option.conviction}/10\n"
        prompt += f"- BTC: {option.btc_allocation_pct:.1f}%, ADA: {option.ada_allocation_pct:.1f}%\n"
        prompt += f"- Rationale: {option.rationale}\n"

    prompt += f"""

=== FINAL DECISION ===

Selected Option: #{decision.selected_option + 1} ({selected_option.strategy})
Actions: {len([a for a in decision.actions if a.type.value != 'HOLD'])} trades

Decision Reasoning:
{decision.reasoning}

Updated Plan:
{decision.plan}

Risk Assessment:
{decision.risk_assessment}

"""

    if specialist_outputs:
        prompt += "\n=== SPECIALIST ANALYSES (Reference) ===\n"
        for key, output in specialist_outputs.items():
            prompt += f"\n**{key.upper()}**:\n{output}\n"

    prompt += """

=== YOUR TASK ===

Audit this decision for:
1. Logic consistency (does reasoning support choice?)
2. Evidence alignment (claims backed by data?)
3. Internal consistency (conviction matches sizing?)
4. Red flags (wishful thinking, bias, errors?)

Return VerificationResult with:
- consistency_check: "PASS" or "ISSUES"
- issues: List of specific problems found (empty if PASS)
- recommendations: Constructive suggestions
- summary: Overall audit assessment

Be objective and constructive. Flag genuine issues, not nitpicks.
"""

    return prompt
