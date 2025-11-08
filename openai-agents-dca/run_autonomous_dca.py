"""
Autonomous DCA Agent System

Main entry point for the fully autonomous DCA decision and execution system.

Flow:
1. Fetch real Binance market data
2. Format context for agents
3. Run 5-stage agent pipeline (Research → Analysis → Strategy → Decision → Verification)
4. Validate safety requirements
5. Execute trades immediately on Binance
6. Log everything
"""
import asyncio
import os
import json
from datetime import datetime
from typing import Dict, List
from dotenv import load_dotenv
from loguru import logger

# Binance integration
from binance_integration import BinanceMarketData
from market_context_builder import MarketContextBuilder
from safety_validator import SafetyValidator
from binance_executor import BinanceExecutor
from telegram_notifier import TelegramNotifier

# OpenAI Agents
from agents import Runner
from dca_agents.planner import create_planner_agent
from dca_agents.researcher import create_research_agent
from dca_agents.analysts.technical import create_technical_analyst
from dca_agents.analysts.fundamental import create_fundamental_analyst
from dca_agents.analysts.risk import create_risk_analyst
from dca_agents.analysts.sentiment import create_sentiment_analyst
from dca_agents.strategist import create_strategist_agent
from dca_agents.decision import create_decision_agent, create_risk_validator
from dca_agents.verifier import create_verifier_agent

# Load environment
load_dotenv()


class AutonomousDCASystem:
    """Orchestrates the complete autonomous DCA decision and execution pipeline"""

    def __init__(self, testnet: bool = True, dry_run: bool = False):
        """
        Initialize autonomous DCA system

        Args:
            testnet: If True, use Binance testnet. If False, use production.
            dry_run: If True, skip actual trade execution (validation only).
        """
        self.testnet = testnet
        self.dry_run = dry_run

        # Initialize Binance clients
        self.market_data = BinanceMarketData(testnet=testnet)
        self.executor = BinanceExecutor(testnet=testnet)

        # Context builder
        self.context_builder = MarketContextBuilder()

        # Telegram notifier
        self.notifier = TelegramNotifier()

        # Setup logging
        self._setup_logging()

        logger.info(f"🤖 Autonomous DCA System initialized (testnet={testnet}, dry_run={dry_run})")

    def _setup_logging(self):
        """Configure logging with file output"""
        log_dir = "logs"
        os.makedirs(log_dir, exist_ok=True)

        # Add file handler with rotation
        logger.add(
            f"{log_dir}/dca_{{time:YYYY-MM-DD}}.log",
            rotation="00:00",
            retention="30 days",
            level="DEBUG",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function} - {message}"
        )

    async def run(self) -> Dict:
        """
        Run the complete autonomous DCA pipeline

        Returns:
            Complete execution report dictionary
        """
        logger.info("\n" + "="*80)
        logger.info("🚀 AUTONOMOUS DCA AGENT SYSTEM - STARTING")
        logger.info("="*80)

        start_time = datetime.now()

        try:
            # STAGE 0: Fetch market data
            logger.info("\n📊 STAGE 0: FETCHING MARKET DATA")
            logger.info("-" * 80)
            intelligence = self.market_data.get_complete_market_intelligence()

            # Build agent-readable context
            full_context = self.context_builder.build_context(intelligence)
            research_context = self.context_builder.build_research_context(intelligence)

            # STAGE 1: Research Planning
            logger.info("\n📋 STAGE 1: RESEARCH PLANNING")
            logger.info("-" * 80)
            planner = create_planner_agent()
            plan_result = await Runner.run(planner, research_context)
            research_plan = plan_result.final_output

            logger.info(f"✓ Generated {len(research_plan.searches)} research queries")
            logger.info(f"Strategy Hint: {research_plan.strategy_hint}")

            # STAGE 1b: Execute searches (parallel)
            logger.info("\n🔍 Executing web searches in parallel...")
            search_agent = create_research_agent()
            search_tasks = []

            for query in research_plan.searches:
                input_text = f"Search: {query.query}\nReason: {query.reason}"
                task = asyncio.create_task(Runner.run(search_agent, input_text))
                search_tasks.append(task)

            search_results = []
            for i, task in enumerate(asyncio.as_completed(search_tasks), 1):
                result = await task
                search_results.append(str(result.final_output))
                logger.info(f"  [{i}/{len(search_tasks)}] Completed")

            logger.info(f"✓ Completed {len(search_results)} searches")

            # Format research for downstream
            research_summary = "\n\n".join([
                f"Research {i+1} ({research_plan.searches[i].category}):\nQuery: {research_plan.searches[i].query}\n{result}"
                for i, result in enumerate(search_results)
            ])

            # STAGE 2: (Optional) Analyst calls can be made by strategist as needed

            # STAGE 3: Strategy Synthesis
            logger.info("\n\n🎯 STAGE 3: STRATEGY SYNTHESIS")
            logger.info("-" * 80)
            logger.info("Strategist calling analyst tools and generating options...")

            # Create analyst tools
            technical_analyst = create_technical_analyst()
            fundamental_analyst = create_fundamental_analyst()
            risk_analyst = create_risk_analyst()
            sentiment_analyst = create_sentiment_analyst()

            tech_tool = technical_analyst.as_tool("technical_analysis", "Get technical entry quality scores")
            fundamental_tool = fundamental_analyst.as_tool("fundamental_analysis", "Get fundamental conviction scores")
            risk_tool = risk_analyst.as_tool("risk_analysis", "Get risk level assessment")
            sentiment_tool = sentiment_analyst.as_tool("sentiment_analysis", "Get sentiment score and contrarian signals")

            # Create strategist with tools
            strategist = create_strategist_agent(
                technical_tool=tech_tool,
                fundamental_tool=fundamental_tool,
                risk_tool=risk_tool,
                sentiment_tool=sentiment_tool
            )

            strategy_input = f"""{full_context}

RESEARCH FINDINGS:
{research_summary}

Generate 3-4 strategic options for accumulation.
Call analyst tools as needed for deeper insights.
"""

            strategy_result = await Runner.run(strategist, strategy_input)
            strategy_options = strategy_result.final_output

            logger.info(f"✓ Generated {len(strategy_options.options)} strategic options")
            logger.info(f"Market Summary: {strategy_options.market_summary}")
            for i, opt in enumerate(strategy_options.options, 1):
                logger.info(f"  {i}. {opt.strategy} (Conviction: {opt.conviction}/10)")

            # STAGE 4: Final Decision
            logger.info("\n\n⚖️  STAGE 4: FINAL DECISION")
            logger.info("-" * 80)

            decision_agent = create_decision_agent()
            decision_input = f"""{full_context}

STRATEGIC OPTIONS:
{strategy_options.model_dump_json(indent=2)}

Recommended: Option {strategy_options.recommended_option + 1}

Select THE BEST option and provide detailed reasoning.
"""

            decision_result = await Runner.run(decision_agent, decision_input)
            decision = decision_result.final_output

            selected_option = strategy_options.options[decision.selected_option]
            logger.info(f"✓ Selected: Option {decision.selected_option + 1} - {selected_option.strategy}")
            logger.info(f"Conviction: {selected_option.conviction}/10")
            logger.info(f"Reasoning: {decision.reasoning}")

            # Convert actions from Pydantic models to dictionaries
            actions = []
            for action in decision.actions:
                action_dict = {
                    'type': action.type.value,
                    'asset': action.asset,
                    'reasoning': action.reasoning
                }
                if action.price is not None:
                    action_dict['price'] = action.price
                if action.quantity is not None:
                    action_dict['amount_usd'] = action.quantity
                if action.order_id is not None:
                    action_dict['order_id'] = action.order_id
                actions.append(action_dict)

            logger.info(f"Actions to execute: {len(actions)}")

            # STAGE 4b: Safety Validation
            logger.info("\n\n🛡️  STAGE 4B: SAFETY VALIDATION")
            logger.info("-" * 80)

            validator = SafetyValidator(intelligence)
            is_valid, errors = validator.validate_trading_decision(actions)

            if is_valid:
                logger.info("✅ All actions passed safety validation")
            else:
                logger.error(f"❌ Safety validation failed with {len(errors)} error(s):")
                for error in errors:
                    logger.error(f"  • {error}")

                return {
                    'success': False,
                    'stage': 'validation',
                    'error': 'Safety validation failed',
                    'errors': errors,
                    'timestamp': datetime.now().isoformat()
                }

            # STAGE 5: Execution
            if self.dry_run:
                logger.info("\n\n🔍 DRY RUN MODE - Skipping actual execution")
                execution_result = {
                    'success': True,
                    'executed': 0,
                    'failed': 0,
                    'results': [],
                    'dry_run': True
                }
            else:
                logger.info("\n\n🚀 STAGE 5: TRADE EXECUTION")
                logger.info("-" * 80)
                execution_result = self.executor.execute_actions(actions)

            # STAGE 6: Verification
            logger.info("\n\n🔍 STAGE 6: POST-DECISION VERIFICATION")
            logger.info("-" * 80)

            verifier = create_verifier_agent()
            verification_input = f"""{full_context}

RESEARCH FINDINGS:
{research_summary}

FINAL DECISION:
{decision.model_dump_json(indent=2)}

SELECTED STRATEGY:
{selected_option.model_dump_json(indent=2)}

EXECUTION RESULT:
{json.dumps(execution_result, indent=2)}

Audit the decision logic and execution for consistency and quality.
"""

            verification_result = await Runner.run(verifier, verification_input)
            verification = verification_result.final_output

            logger.info(f"Verification Status: {verification.consistency_check}")
            logger.info(f"Issues: {len(verification.issues)}")
            logger.info(f"Recommendations: {len(verification.recommendations)}")

            # Generate final report
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()

            report = {
                'success': execution_result['success'],
                'timestamp': start_time.isoformat(),
                'duration_seconds': duration,
                'testnet': self.testnet,
                'dry_run': self.dry_run,
                'market_data': intelligence,
                'research_plan': {
                    'queries': [q.model_dump() for q in research_plan.searches],
                    'strategy_hint': research_plan.strategy_hint
                },
                'strategy_options': [opt.model_dump() for opt in strategy_options.options],
                'decision': {
                    'selected_option': decision.selected_option,
                    'strategy_name': selected_option.strategy,
                    'reasoning': decision.reasoning,
                    'plan': decision.plan,
                    'conviction': selected_option.conviction
                },
                'actions': actions,
                'validation': {
                    'passed': is_valid,
                    'errors': errors
                },
                'execution': execution_result,
                'verification': {
                    'status': verification.consistency_check,
                    'issues': verification.issues,
                    'recommendations': verification.recommendations,
                    'summary': verification.summary
                }
            }

            # Save report
            self._save_report(report)

            # Send Telegram notification
            logger.info("📱 Sending Telegram notification...")
            if self.notifier.send_execution_report(report):
                logger.info("✓ Telegram notification sent")
            else:
                logger.warning("⚠️ Telegram notification not sent (check configuration)")

            # Final summary
            logger.info("\n\n" + "="*80)
            logger.info("✅ AUTONOMOUS DCA PIPELINE COMPLETE")
            logger.info("="*80)
            logger.info(f"Duration: {duration:.1f}s")
            logger.info(f"Strategy: {selected_option.strategy}")
            logger.info(f"Conviction: {selected_option.conviction}/10")
            logger.info(f"Actions: {len(actions)}")
            if not self.dry_run:
                logger.info(f"Executed: {execution_result['executed']}")
                logger.info(f"Failed: {execution_result['failed']}")
            logger.info(f"Verification: {verification.consistency_check}")
            logger.info("="*80)

            return report

        except Exception as e:
            logger.exception(f"❌ Pipeline failed with error: {e}")
            return {
                'success': False,
                'stage': 'unknown',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    def _parse_decision_actions(self, decision, intelligence: Dict) -> List[Dict]:
        """
        Parse actions from decision plan

        For now, this is a simple parser that extracts PLACE_LIMIT_BUY commands
        from the decision plan text.

        Args:
            decision: TradingDecision from decision agent
            intelligence: Market intelligence data

        Returns:
            List of action dictionaries
        """
        actions = []
        plan_lines = decision.plan.split('\n')

        for line in plan_lines:
            line = line.strip()

            # Look for PLACE_LIMIT_BUY commands
            if 'PLACE_LIMIT_BUY' in line:
                # Parse: "PLACE_LIMIT_BUY BTCUSDT @ $87,500 (qty: $2,000)"
                parts = line.split()
                if len(parts) >= 4:
                    asset = None
                    price = None
                    amount = None

                    for i, part in enumerate(parts):
                        if 'USDT' in part:
                            asset = part.replace(',', '').replace(')', '')
                        elif '$' in part and price is None:
                            price_str = part.replace('$', '').replace(',', '')
                            try:
                                price = float(price_str)
                            except:
                                pass
                        elif '$' in part and price is not None:
                            amount_str = part.replace('$', '').replace(',', '').replace(')', '')
                            try:
                                amount = float(amount_str)
                            except:
                                pass

                    if asset and price and amount:
                        actions.append({
                            'type': 'PLACE_LIMIT_BUY',
                            'asset': asset,
                            'price': price,
                            'amount_usd': amount
                        })

        # If no actions parsed, log warning
        if not actions:
            logger.warning("⚠️  No actions parsed from decision plan - may need manual review")
            logger.debug(f"Decision plan:\n{decision.plan}")

        return actions

    def _save_report(self, report: Dict):
        """Save execution report to file"""
        output_dir = "outputs"
        os.makedirs(output_dir, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{output_dir}/dca_execution_{timestamp}.json"

        with open(filename, 'w') as f:
            json.dump(report, f, indent=2, default=str)

        logger.info(f"📝 Report saved to: {filename}")


async def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Autonomous DCA Agent System")
    parser.add_argument(
        '--production',
        action='store_true',
        help='Use production Binance (default: testnet)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Skip actual trade execution (validation only)'
    )

    args = parser.parse_args()

    # Initialize system
    system = AutonomousDCASystem(
        testnet=not args.production,
        dry_run=args.dry_run
    )

    # Run pipeline
    report = await system.run()

    # Exit code based on success
    exit_code = 0 if report.get('success', False) else 1
    return exit_code


if __name__ == '__main__':
    exit_code = asyncio.run(main())
    exit(exit_code)
