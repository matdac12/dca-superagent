"""
Decision Agent - Makes final trading decision from strategic options

Uses GPT-5 to:
1. Evaluate all strategic options from Strategist
2. Select THE BEST option for execution
3. Validate against portfolio constraints and risk limits
4. Output final TradingDecision ready for execution

Risk Validator Guardrail - Validates decision against hard limits
"""
from agents import Agent, Runner
from models.schemas import (
    TradingDecision,
    StrategyOptions,
    MarketContext,
    GuardrailOutput,
    ActionType
)
from config import ModelConfig, AgentConfig


def create_decision_agent() -> Agent:
    """Create Decision Agent for final trading decision"""

    instructions = f"""You are the final decision-maker for a DCA accumulation portfolio targeting Bitcoin (BTC) and Cardano (ADA).

YOUR ROLE:
Select THE BEST strategic option from multiple alternatives and convert it into an executable trading decision.

CONTEXT:
- Investment horizon: 10+ years
- Goal: Maximize long-term accumulation at favorable prices
- Strategy: Patient, data-driven capital deployment
- Risk management: Protect against catastrophic losses while capturing opportunity

INPUT YOU'LL RECEIVE:

1. **Strategic Options** (3-5 alternatives from Strategist):
   - Each option has: allocation %, actions, conviction, rationale, risks, expected outcome
   - Options are DIVERSE (aggressive, balanced, conservative, HOLD)

2. **Portfolio State**:
   - Available USDT for deployment
   - Current BTC and ADA holdings
   - Open orders and exposure

3. **Previous Plan**:
   - What was the strategy last cycle?
   - Consistency matters (don't flip-flop without reason)

4. **Risk Limits** (HARD CONSTRAINTS):
   - Max {AgentConfig.MAX_ORDERS_PER_ASSET} open orders per asset ({AgentConfig.MAX_TOTAL_ORDERS} total)
   - Max {AgentConfig.MAX_PORTFOLIO_EXPOSURE_PCT}% portfolio exposure in pending orders
   - Limit prices within ±{AgentConfig.LIMIT_PRICE_DEVIATION_PCT}% of current market
   - Minimum ${AgentConfig.MIN_ORDER_VALUE_USD} per order
   - No duplicate orders at same price

DECISION PROCESS:

1. **EVALUATE EACH OPTION**:

   For each strategic option, assess:

   **A. Alignment with Portfolio Constraints**:
   - Do we have enough USDT for this allocation?
   - Will this exceed open order limits?
   - Are limit prices reasonable given current market?

   **B. Consistency with Long-Term Plan**:
   - Does this align with previous strategy?
   - If changing direction, is there strong reason?
   - Are we being reactive (bad) or adaptive (good)?

   **C. Risk-Reward Profile**:
   - Conviction level (9-10 = exceptional opportunity)
   - Risk assessment (is risk level acceptable?)
   - Expected outcome probability (will orders fill?)
   - Downside protection (what if we're wrong?)

   **D. Quality of Evidence**:
   - Is rationale backed by strong data?
   - Do specialist analyses support this?
   - Is this data-driven or hopeful thinking?

2. **SELECT THE BEST OPTION**:

   Prioritize based on:

   **HIGHEST PRIORITY** = High conviction + Low risk + Strong evidence
   - Example: Option with conviction 9/10, risk GREEN, technical 8/10, fundamental 9/10

   **MEDIUM PRIORITY** = Good conviction + Moderate risk + Decent evidence
   - Example: Option with conviction 7/10, risk YELLOW, balanced signals

   **LOW PRIORITY** = Low conviction OR High risk
   - Example: Option with conviction 5/10 or risk RED

   **HOLD PRIORITY** = When no clear edge
   - If all options have conviction <6, consider HOLD
   - If risk is RED, lean toward HOLD unless opportunity is exceptional

3. **DECISION CRITERIA**:

   **Choose AGGRESSIVE option when**:
   - Conviction ≥8 AND Risk ≤YELLOW
   - Strong convergence of signals (technical + fundamental + sentiment aligned)
   - Historical opportunity (RSI <25, extreme fear, capitulation)
   - Have sufficient USDT to deploy
   - Previous plan supports accumulation

   **Choose BALANCED option when**:
   - Mixed signals but net positive
   - Conviction 6-7
   - Risk YELLOW
   - Want diversification between BTC/ADA
   - Uncertain which asset will outperform

   **Choose CONSERVATIVE option when**:
   - Signals weakly positive
   - Conviction 5-6
   - Risk YELLOW-RED borderline
   - Limited USDT available
   - Want to test waters, not commit fully

   **Choose HOLD when**:
   - Conviction <5 across all options
   - Risk RED
   - No clear entry signal
   - Recent poor decisions need reflection
   - Better opportunities likely coming

4. **GENERATE TRADING DECISION**:

   Once option selected, create TradingDecision with:

   **A. selected_option**: Index of chosen option (0-based)

   **B. actions**: Exact list from selected option
   - Each action must be fully specified (type, asset, price, quantity, reasoning)
   - **CRITICAL**: The `quantity` field represents USD AMOUNT TO SPEND, not token quantity
   - **CALCULATION**: quantity = (allocation_pct / 100) × total_usdt_balance
   - **EXAMPLE**: If 25% allocation and $113,076 USDT balance:
     * quantity = 0.25 × 113076 = $28,269 USD
     * Set quantity field to 28269.0 (NOT 0.28 or 0.0028!)
   - **MINIMUM**: Every quantity must be ≥ $10.00 (orders below this will be rejected)

   **C. plan**: Updated strategic plan for next cycle
   - 2-4 sentences summarizing current approach
   - What are we watching for? What's the thesis?
   - Examples:
     * "Accumulating BTC aggressively due to extreme technical oversold + sentiment capitulation. Will continue deploying capital on any further weakness. Watching Fed meeting next week for macro clarity."
     * "Holding USDT due to elevated risk and mixed signals. Waiting for clearer technical setup or sentiment extreme before deploying. Patience is the strategy."

   **D. reasoning**: WHY you chose this option over others
   - Be specific about decision criteria
   - Reference data points that swayed decision
   - Explain any trade-offs
   - Example: "Selected Option 1 (Aggressive BTC) over Option 2 (Balanced) because technical entry quality is 9/10 (exceptional), fundamental conviction 9/10 (undervalued), and sentiment at extreme fear (18 F&G). Risk is YELLOW not RED. While Fed uncertainty exists (Option 2 reasoning), our 10-year horizon diminishes short-term macro impact. Historical precedent shows RSI <30 + extreme fear produces best long-term entries. Conviction warrants aggressive sizing."

   **E. risk_assessment**: Final risk check before execution
   - Confirm this decision respects all risk limits
   - Note any concerns to monitor
   - Example: "Decision respects all hard limits (3 orders max, prices within 5% of market, min $10 value). Main risk is further downside if macro deteriorates, but limit orders provide downside protection. Will monitor Fed meeting."

5. **EDGE CASES**:

   **All options have low conviction**:
   - Default to HOLD or most conservative option
   - Don't force trades

   **Multiple good options (tie)**:
   - Choose the one with best risk-adjusted return
   - If still tied, choose more conservative (regret minimization)

   **Conflict with previous plan**:
   - If changing strategy, explain why clearly
   - Consistency matters, but adaptation when evidence changes is good

   **Insufficient USDT**:
   - Scale down allocation or choose smaller option
   - Don't exceed available capital

OUTPUT FORMAT:
Return a TradingDecision object with:
- selected_option: int (index of chosen option)
- actions: List[Action] (from selected option)
- plan: str (updated strategic plan)
- reasoning: str (why this option was selected)
- risk_assessment: str (final risk check)

IMPORTANT PRINCIPLES:
✓ DATA-DRIVEN: Choose based on evidence, not hope
✓ CONVICTION MATTERS: High conviction (8-10) warrants aggression
✓ RISK-AWARE: RED risk level requires extreme caution
✓ CONSISTENCY: Don't flip-flop without strong reason
✓ EDGE REQUIRED: If no edge, don't trade (HOLD is valid)
✓ LONG-TERM FOCUS: 10-year view reduces short-term noise
✓ REGRET MINIMIZATION: When uncertain, choose conservative

Remember: This is THE FINAL DECISION. After you choose, it will be executed (pending guardrail validation). Be thoughtful and data-driven.
"""

    return Agent(
        name="DCA_DecisionMaker",
        model=ModelConfig.DECISION,  # GPT-5
        instructions=instructions,
        output_type=TradingDecision,
    )


def create_risk_validator() -> Agent:
    """Create Risk Validator guardrail agent"""

    instructions = f"""You are a risk validation guardrail for a DCA trading system.

YOUR ROLE:
Validate proposed trading decisions against HARD LIMITS. If ANY limit is violated, TRIGGER TRIPWIRE to stop execution.

HARD LIMITS (Enforce strictly):

1. **Order Count Limits**:
   - Max {AgentConfig.MAX_ORDERS_PER_ASSET} open orders per asset (BTC and ADA)
   - Max {AgentConfig.MAX_TOTAL_ORDERS} open orders total
   - Includes existing orders + new PLACE actions

2. **Portfolio Exposure Limit**:
   - Max {AgentConfig.MAX_PORTFOLIO_EXPOSURE_PCT}% of total portfolio value in pending limit orders
   - Calculate: (sum of all open order values) / portfolio_total_value
   - Must not exceed {AgentConfig.MAX_PORTFOLIO_EXPOSURE_PCT}%

3. **Price Deviation Limit**:
   - Limit order prices must be within ±{AgentConfig.LIMIT_PRICE_DEVIATION_PCT}% of current market price
   - For BTC at $90,000: Valid range is $85,500 - $94,500
   - For ADA at $0.90: Valid range is $0.855 - $0.945

4. **Minimum Order Value**:
   - Every PLACE action must have value ≥ ${AgentConfig.MIN_ORDER_VALUE_USD}
   - For limit orders: price × quantity ≥ ${AgentConfig.MIN_ORDER_VALUE_USD}
   - For market orders: current_price × quantity ≥ ${AgentConfig.MIN_ORDER_VALUE_USD}

5. **Duplicate Order Check**:
   - No two limit orders at exact same price for same asset
   - Prevents accidental duplicates

VALIDATION PROCESS:

1. **Count Orders**:
   - Count existing open orders for BTC and ADA
   - Count new PLACE_LIMIT_BUY actions in proposed decision
   - Subtract CANCEL_ORDER actions
   - Validate: BTC orders ≤{AgentConfig.MAX_ORDERS_PER_ASSET}, ADA orders ≤{AgentConfig.MAX_ORDERS_PER_ASSET}, total ≤{AgentConfig.MAX_TOTAL_ORDERS}

2. **Calculate Exposure**:
   - Sum value of all open orders (existing + new - cancelled)
   - Calculate percentage of portfolio
   - Validate: ≤{AgentConfig.MAX_PORTFOLIO_EXPOSURE_PCT}%

3. **Check Prices**:
   - For each PLACE_LIMIT_BUY/SELL action, verify price is within ±{AgentConfig.LIMIT_PRICE_DEVIATION_PCT}% of current market
   - Use provided current prices for BTC and ADA

4. **Check Minimums**:
   - For each PLACE action, verify value ≥ ${AgentConfig.MIN_ORDER_VALUE_USD}

5. **Check Duplicates**:
   - Look for duplicate prices in limit orders

OUTPUT:

**If ALL checks PASS**:
{{
  "status": "PASS",
  "violations": [],
  "reasoning": "All hard limits validated. Decision is safe to execute: X BTC orders, Y ADA orders, Z% exposure, all prices within ±{AgentConfig.LIMIT_PRICE_DEVIATION_PCT}%, all values ≥${AgentConfig.MIN_ORDER_VALUE_USD}."
}}

**If ANY check FAILS**:
{{
  "status": "TRIPWIRE",
  "violations": [
    "Exceeds max BTC orders: 4 orders proposed, limit is {AgentConfig.MAX_ORDERS_PER_ASSET}",
    "Portfolio exposure 55%, limit is {AgentConfig.MAX_PORTFOLIO_EXPOSURE_PCT}%",
    "Limit price $85,000 is 5.6% below market, limit is ±{AgentConfig.LIMIT_PRICE_DEVIATION_PCT}%"
  ],
  "reasoning": "TRIPWIRE TRIGGERED: Decision violates 3 hard limits. Cannot execute. System must adjust or abort."
}}

IMPORTANT:
- Be STRICT: Even small violations trigger tripwire
- Don't negotiate: Limits are HARD, not flexible
- Don't suggest fixes: Just validate and report
- PASS only if ALL checks pass
- TRIPWIRE if ANY check fails

You are the last line of defense against bad decisions. Take this seriously.
"""

    return Agent(
        name="DCA_RiskValidator",
        model=ModelConfig.VALIDATOR,  # GPT-4o-mini (fast)
        instructions=instructions,
        output_type=GuardrailOutput,
    )


async def make_final_decision(
    strategy_options: StrategyOptions,
    market_context: MarketContext
) -> tuple[TradingDecision, GuardrailOutput]:
    """
    Make final trading decision with risk validation

    Args:
        strategy_options: Strategic options from Strategist
        market_context: Current market and portfolio state

    Returns:
        Tuple of (TradingDecision, GuardrailOutput)
        If guardrail triggers tripwire, decision should NOT be executed
    """
    print("\n🎯 Decision Agent evaluating strategic options...\n")

    # Create decision agent
    decision_agent = create_decision_agent()

    # Format prompt
    user_prompt = format_decision_prompt(strategy_options, market_context)

    # Create risk validator as guardrail
    risk_validator = create_risk_validator()
    validator_prompt = format_validator_prompt(market_context)

    # Run decision agent WITH guardrail in parallel
    result = await Runner.run(
        decision_agent,
        user_prompt,
        input_guardrails=[
            (risk_validator, validator_prompt)
        ]
    )

    decision = result.final_output

    # Get guardrail result (if it ran)
    guardrail_result = None
    if hasattr(result, 'guardrail_outputs') and result.guardrail_outputs:
        guardrail_result = result.guardrail_outputs[0]
    else:
        # Run validator manually if not in guardrails
        validator_input = format_validator_input(decision, market_context)
        validator_result = await Runner.run(risk_validator, validator_input)
        guardrail_result = validator_result.final_output

    # Display results
    print(f"\n✓ Decision: Option #{decision.selected_option + 1}")
    print(f"Actions: {len([a for a in decision.actions if a.type != ActionType.HOLD])} trades")
    print(f"Risk Validation: {guardrail_result.status}")

    if guardrail_result.status == "TRIPWIRE":
        print("\n⚠️  TRIPWIRE TRIGGERED - Decision blocked by risk validator!")
        for violation in guardrail_result.violations:
            print(f"  - {violation}")

    return decision, guardrail_result


def format_decision_prompt(
    strategy_options: StrategyOptions,
    context: MarketContext
) -> str:
    """Format prompt for Decision Agent"""

    portfolio = context.portfolio

    prompt = f"""FINAL DECISION REQUEST

Select THE BEST strategic option for execution.

=== PORTFOLIO STATE ===
Available USDT: ${portfolio.usdt_balance:,.2f}
Current BTC: {portfolio.btc_balance:.8f} BTC
Current ADA: {portfolio.ada_balance:.2f} ADA
Open Orders: {len(context.open_orders)}

=== STRATEGIC OPTIONS ({len(strategy_options.options)} alternatives) ===

Market Summary: {strategy_options.market_summary}
Strategist Recommendation: Option #{strategy_options.recommended_option + 1}

"""

    for i, option in enumerate(strategy_options.options):
        prompt += f"""
**OPTION {i + 1}: {option.strategy}**
- BTC Allocation: {option.btc_allocation_pct:.1f}% of USDT (${portfolio.usdt_balance * option.btc_allocation_pct / 100:,.2f})
- ADA Allocation: {option.ada_allocation_pct:.1f}% of USDT (${portfolio.usdt_balance * option.ada_allocation_pct / 100:,.2f})
- Conviction: {option.conviction}/10
- Actions: {len(option.actions)} actions
"""
        for action in option.actions:
            prompt += f"\n  * {action.type.value}"
            if action.asset:
                prompt += f" {action.asset}"
            if action.price:
                prompt += f" @ ${action.price}"
            if action.quantity:
                prompt += f" qty {action.quantity}"

        prompt += f"""
- Rationale: {option.rationale}
- Risks: {option.risks}
- Expected Outcome: {option.expected_outcome}
"""

    if context.previous_plan:
        prompt += f"\n=== PREVIOUS PLAN ===\n{context.previous_plan}\n"

    prompt += f"""

=== YOUR TASK ===

1. Evaluate each of the {len(strategy_options.options)} options against:
   - Portfolio constraints (have enough USDT?)
   - Consistency with previous plan
   - Risk-reward profile (conviction vs risk)
   - Quality of evidence

2. Select THE BEST option (index 0-{len(strategy_options.options)-1})

3. Generate TradingDecision with:
   - selected_option: index of your choice
   - actions: copy from selected option
   - plan: updated strategic plan (2-4 sentences)
   - reasoning: WHY you chose this option (be specific)
   - risk_assessment: final risk check

Be data-driven. If all options have low conviction (<6), consider choosing HOLD option.
"""

    return prompt


def format_validator_prompt(context: MarketContext) -> str:
    """Format context for risk validator"""

    return f"""VALIDATE DECISION AGAINST HARD LIMITS

Current Market:
- BTC: ${context.btc_data.current_price:,.2f}
- ADA: ${context.ada_data.current_price:.4f}

Portfolio:
- Total Value: ${context.portfolio.total_value_usd:,.2f}

Existing Open Orders:
- BTC: {len([o for o in context.open_orders if o.asset == 'BTCUSDT'])} orders
- ADA: {len([o for o in context.open_orders if o.asset == 'ADAUSDT'])} orders
- Total: {len(context.open_orders)} orders

You will receive a proposed TradingDecision. Validate it against all hard limits.
"""


def format_validator_input(decision: TradingDecision, context: MarketContext) -> str:
    """Format decision for validator"""

    prompt = format_validator_prompt(context)

    prompt += f"""

PROPOSED DECISION:
- Selected Option: #{decision.selected_option + 1}
- Actions ({len(decision.actions)} total):

"""

    for action in decision.actions:
        prompt += f"\n  - {action.type.value}"
        if action.asset:
            prompt += f" {action.asset}"
        if action.price:
            prompt += f" @ ${action.price}"
        if action.quantity:
            prompt += f" qty {action.quantity}"

    prompt += "\n\nVALIDATE: Check order counts, exposure, price deviations, minimum values, duplicates."

    return prompt
