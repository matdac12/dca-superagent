"""
DCA Agent Orchestrator - Main pipeline coordinator

Runs the complete 5-stage decision process:
1. RESEARCH: Planner + parallel web searches
2. ANALYSIS: Specialist analysts (technical, fundamental, risk, sentiment)
3. STRATEGY: Strategist generates 3-5 options
4. DECISION: Decision agent selects best option
5. VERIFICATION: Verifier audits decision logic
"""
import asyncio
import json
from datetime import datetime
from typing import Optional
from pathlib import Path

from agents import Runner
from agents.planner import plan_research, format_market_context_for_planner
from agents.researcher import execute_research_plan, format_research_results
from agents.analysts.technical import create_technical_analyst, format_technical_context
from agents.analysts.fundamental import create_fundamental_analyst, format_fundamental_context
from agents.analysts.risk import create_risk_analyst, format_risk_context
from agents.analysts.sentiment import create_sentiment_analyst, format_sentiment_context
from agents.strategist import generate_strategy_options
from agents.decision import make_final_decision
from agents.verifier import verify_decision

from models.schemas import MarketContext, TradingDecision, VerificationResult, GuardrailOutput
from config import TracingConfig

from loguru import logger


class DCAOrchestrator:
    """
    Main orchestrator for DCA agent system

    Coordinates all 5 stages of the decision pipeline and manages
    outputs, tracing, and error handling.
    """

    def __init__(self, output_dir: str = None):
        """
        Initialize orchestrator

        Args:
            output_dir: Directory for outputs (default: TracingConfig.OUTPUT_DIR)
        """
        self.output_dir = Path(output_dir or TracingConfig.OUTPUT_DIR)
        self.traces_dir = Path(TracingConfig.TRACES_DIR)

        # Create output directories
        self.output_dir.mkdir(exist_ok=True)
        self.traces_dir.mkdir(exist_ok=True)

        # Configure logging
        logger.remove()  # Remove default handler
        logger.add(
            lambda msg: print(msg, end=""),
            format=TracingConfig.LOG_FORMAT,
            level=TracingConfig.LOG_LEVEL,
        )
        logger.add(
            self.output_dir / "orchestrator.log",
            format=TracingConfig.LOG_FORMAT,
            level=TracingConfig.LOG_LEVEL,
            rotation="10 MB",
        )

    async def run(
        self,
        market_context: MarketContext,
        save_trace: bool = True
    ) -> tuple[TradingDecision, VerificationResult, GuardrailOutput, dict]:
        """
        Run the complete DCA decision pipeline

        Args:
            market_context: Current market data and portfolio state
            save_trace: Whether to save full execution trace

        Returns:
            Tuple of (TradingDecision, VerificationResult, GuardrailOutput, full_trace)
        """
        logger.info("="*80)
        logger.info("DCA SUPERHUMAN AGENT SYSTEM - Starting Decision Pipeline")
        logger.info(f"Timestamp: {market_context.timestamp}")
        logger.info("="*80)

        trace = {
            "timestamp": market_context.timestamp,
            "market_context": market_context.model_dump(),
            "stages": {}
        }

        try:
            # ================================================================
            # STAGE 1: RESEARCH
            # ================================================================
            logger.info("\n📋 STAGE 1: RESEARCH PLANNING & EXECUTION")
            logger.info("-" * 80)

            # 1.1: Generate research plan
            logger.info("Planner Agent (GPT-5) generating research queries...")
            research_plan = await plan_research(market_context)

            logger.info(f"✓ Generated {len(research_plan.searches)} research queries")
            logger.info(f"Strategy Hint: {research_plan.strategy_hint}")

            trace["stages"]["research_plan"] = research_plan.model_dump()

            # 1.2: Execute research queries in parallel
            logger.info("\nExecuting web searches in parallel...")
            research_results = await execute_research_plan(research_plan)

            logger.info(f"✓ Completed {len(research_results)} research queries")

            trace["stages"]["research_results"] = [r.model_dump() for r in research_results]

            # Format research for downstream agents
            research_formatted = format_research_results(research_results)

            # ================================================================
            # STAGE 2: SPECIALIST ANALYSIS
            # ================================================================
            logger.info("\n🔬 STAGE 2: SPECIALIST ANALYSIS")
            logger.info("-" * 80)

            # Create specialist analysts
            technical_analyst = create_technical_analyst()
            fundamental_analyst = create_fundamental_analyst()
            risk_analyst = create_risk_analyst()
            sentiment_analyst = create_sentiment_analyst()

            # These will be called by Strategist as tools (not directly here)
            # But we can optionally run them for tracing purposes
            logger.info("Specialist analysts ready (will be called by Strategist as needed)")

            # Convert to tools for Strategist
            technical_tool = technical_analyst.as_tool(
                tool_name="technical_analysis",
                tool_description="Get technical analysis with entry quality scores for BTC and ADA"
            )

            fundamental_tool = fundamental_analyst.as_tool(
                tool_name="fundamental_analysis",
                tool_description="Get fundamental conviction scores and on-chain insights"
            )

            risk_tool = risk_analyst.as_tool(
                tool_name="risk_analysis",
                tool_description="Get comprehensive risk assessment (GREEN/YELLOW/RED)"
            )

            sentiment_tool = sentiment_analyst.as_tool(
                tool_name="sentiment_analysis",
                tool_description="Get market sentiment and contrarian signals"
            )

            # ================================================================
            # STAGE 3: STRATEGY SYNTHESIS
            # ================================================================
            logger.info("\n🎯 STAGE 3: STRATEGY SYNTHESIS")
            logger.info("-" * 80)

            logger.info("Strategist Agent (GPT-5) generating strategic options...")
            logger.info("(Strategist may call specialist tools as needed)")

            strategy_options = await generate_strategy_options(
                market_context,
                [r.model_dump() for r in research_results],
                technical_tool,
                fundamental_tool,
                risk_tool,
                sentiment_tool
            )

            logger.info(f"✓ Generated {len(strategy_options.options)} strategic options")
            logger.info(f"Recommended: Option #{strategy_options.recommended_option + 1}")

            trace["stages"]["strategy_options"] = strategy_options.model_dump()

            # Display options summary
            for i, option in enumerate(strategy_options.options):
                logger.info(f"\n  Option {i+1}: {option.strategy}")
                logger.info(f"    Conviction: {option.conviction}/10")
                logger.info(f"    BTC: {option.btc_allocation_pct:.1f}%, ADA: {option.ada_allocation_pct:.1f}%")

            # ================================================================
            # STAGE 4: FINAL DECISION
            # ================================================================
            logger.info("\n⚖️  STAGE 4: FINAL DECISION (with Risk Validation)")
            logger.info("-" * 80)

            logger.info("Decision Agent (GPT-5) evaluating options...")
            logger.info("Risk Validator (GPT-4o-mini) running in parallel...")

            decision, guardrail_result = await make_final_decision(
                strategy_options,
                market_context
            )

            logger.info(f"\n✓ Decision: Option #{decision.selected_option + 1}")
            logger.info(f"Guardrail: {guardrail_result.status}")

            trace["stages"]["decision"] = decision.model_dump()
            trace["stages"]["guardrail"] = guardrail_result.model_dump()

            # ================================================================
            # STAGE 5: VERIFICATION
            # ================================================================
            logger.info("\n🔍 STAGE 5: VERIFICATION")
            logger.info("-" * 80)

            logger.info("Verifier Agent (GPT-4o-mini) auditing decision...")

            verification = await verify_decision(
                decision,
                strategy_options
            )

            logger.info(f"✓ Verification: {verification.consistency_check}")

            trace["stages"]["verification"] = verification.model_dump()

            # ================================================================
            # PIPELINE COMPLETE
            # ================================================================
            logger.info("\n" + "="*80)
            logger.info("✓ PIPELINE COMPLETE")
            logger.info("="*80)

            logger.info(f"\nSelected Strategy: {strategy_options.options[decision.selected_option].strategy}")
            logger.info(f"Actions: {len([a for a in decision.actions if a.type.value != 'HOLD'])} trades")
            logger.info(f"Risk Validation: {guardrail_result.status}")
            logger.info(f"Decision Audit: {verification.consistency_check}")

            if guardrail_result.status == "TRIPWIRE":
                logger.warning("\n⚠️  EXECUTION BLOCKED: Risk guardrail triggered")
                logger.warning("Decision cannot be executed due to hard limit violations")

            elif verification.consistency_check == "ISSUES":
                logger.warning("\n⚠️  DECISION HAS ISSUES: Review verification report")

            else:
                logger.success("\n✓ Decision is valid and ready for execution")

            # Save trace
            if save_trace:
                trace_file = self._save_trace(trace)
                logger.info(f"\nFull trace saved: {trace_file}")

            return decision, verification, guardrail_result, trace

        except Exception as e:
            logger.error(f"\n❌ Pipeline failed: {str(e)}")
            logger.exception("Full traceback:")
            raise

    def _save_trace(self, trace: dict) -> Path:
        """Save full execution trace to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        trace_file = self.traces_dir / f"trace_{timestamp}.json"

        with open(trace_file, "w") as f:
            json.dump(trace, f, indent=2, default=str)

        return trace_file

    async def run_test(self, market_context: MarketContext):
        """
        Run pipeline in test mode (outputs decision without executing)

        Args:
            market_context: Market data for testing

        Returns:
            Tuple of (decision, verification, guardrail, trace)
        """
        logger.info("\n🧪 RUNNING IN TEST MODE (no execution)")

        result = await self.run(market_context, save_trace=True)

        decision, verification, guardrail, trace = result

        # Display decision summary
        self._display_decision_summary(decision, verification, guardrail, trace)

        return result

    def _display_decision_summary(
        self,
        decision: TradingDecision,
        verification: VerificationResult,
        guardrail: GuardrailOutput,
        trace: dict
    ):
        """Display formatted decision summary"""

        print("\n" + "="*80)
        print("DECISION SUMMARY")
        print("="*80)

        strategy_options = trace["stages"]["strategy_options"]
        selected_option = strategy_options["options"][decision.selected_option]

        print(f"\nSelected Strategy: {selected_option['strategy']}")
        print(f"Conviction: {selected_option['conviction']}/10")
        print(f"\nAllocations:")
        print(f"  BTC: {selected_option['btc_allocation_pct']:.1f}% of USDT")
        print(f"  ADA: {selected_option['ada_allocation_pct']:.1f}% of USDT")

        print(f"\nActions ({len(decision.actions)} total):")
        for action in decision.actions:
            print(f"  - {action.type.value}", end="")
            if action.asset:
                print(f" {action.asset}", end="")
            if action.price:
                print(f" @ ${action.price}", end="")
            if action.quantity:
                print(f" qty {action.quantity}", end="")
            print(f"\n    Reasoning: {action.reasoning}")

        print(f"\nReasoning:")
        print(f"  {decision.reasoning}")

        print(f"\nUpdated Plan:")
        print(f"  {decision.plan}")

        print(f"\nRisk Assessment:")
        print(f"  {decision.risk_assessment}")

        print(f"\nValidation:")
        print(f"  Guardrail: {guardrail.status}")
        print(f"  Verification: {verification.consistency_check}")

        if guardrail.status == "TRIPWIRE":
            print(f"\n⚠️  BLOCKED - Guardrail Violations:")
            for violation in guardrail.violations:
                print(f"    - {violation}")

        if verification.issues:
            print(f"\n⚠️  Decision Issues:")
            for issue in verification.issues:
                print(f"    - {issue}")

        if verification.recommendations:
            print(f"\nRecommendations:")
            for rec in verification.recommendations:
                print(f"  • {rec}")

        print("\n" + "="*80)


# Convenience function for quick testing
async def run_dca_decision(market_context: MarketContext):
    """
    Quick function to run DCA decision pipeline

    Args:
        market_context: Current market data

    Returns:
        Tuple of (decision, verification, guardrail, trace)
    """
    orchestrator = DCAOrchestrator()
    return await orchestrator.run_test(market_context)


if __name__ == "__main__":
    # Example usage
    print("DCA Agent Orchestrator")
    print("Import and use: orchestrator = DCAOrchestrator()")
    print("Then: await orchestrator.run(market_context)")
