"""
Test Runner for DCA Agent System

Runs the complete agent pipeline on test data and outputs decisions
without executing trades.
"""
import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from orchestrator import DCAOrchestrator
from tools.binance_data import get_mock_market_context
from loguru import logger


async def run_single_test():
    """Run a single test with mock data"""

    print("\n" + "="*80)
    print("DCA SUPERHUMAN AGENT SYSTEM - TEST MODE")
    print("="*80)

    # Get mock market data
    print("\n📊 Loading mock market data...")
    market_context = await get_mock_market_context()

    print(f"\nMarket Context:")
    print(f"  Portfolio Value: ${market_context.portfolio.total_value_usd:,.2f}")
    print(f"  Available USDT: ${market_context.portfolio.usdt_balance:,.2f}")
    print(f"  BTC: ${market_context.btc_data.current_price:,.2f} (RSI: {market_context.btc_data.indicators.rsi:.1f})")
    print(f"  ADA: ${market_context.ada_data.current_price:.4f} (RSI: {market_context.ada_data.indicators.rsi:.1f})")

    # Create orchestrator
    orchestrator = DCAOrchestrator()

    # Run pipeline
    print("\n🚀 Starting decision pipeline...\n")

    try:
        decision, verification, guardrail, trace = await orchestrator.run_test(market_context)

        print("\n✅ Test completed successfully!")

        # Save decision to file
        output_file = orchestrator.output_dir / "latest_decision.json"
        import json
        with open(output_file, "w") as f:
            json.dump({
                "decision": decision.model_dump(),
                "verification": verification.model_dump(),
                "guardrail": guardrail.model_dump(),
            }, f, indent=2, default=str)

        print(f"\nDecision saved to: {output_file}")

        # Return status based on results
        if guardrail.status == "TRIPWIRE":
            print("\n⚠️  Decision blocked by guardrail - would NOT execute")
            return 1
        elif verification.consistency_check == "ISSUES":
            print("\n⚠️  Decision has consistency issues - review recommended")
            return 1
        else:
            print("\n✅ Decision is valid and would be executed in production")
            return 0

    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        logger.exception("Full error:")
        return 1


async def run_multiple_tests(count: int = 3):
    """Run multiple test iterations"""

    print(f"\n🧪 Running {count} test iterations...")

    results = []
    for i in range(count):
        print(f"\n{'='*80}")
        print(f"TEST {i+1}/{count}")
        print(f"{'='*80}")

        result = await run_single_test()
        results.append(result)

        if i < count - 1:
            print(f"\n⏳ Waiting 5 seconds before next test...")
            await asyncio.sleep(5)

    # Summary
    print(f"\n{'='*80}")
    print("TEST SUMMARY")
    print(f"{'='*80}")
    print(f"Total Tests: {count}")
    print(f"Passed: {results.count(0)}")
    print(f"Failed: {results.count(1)}")


async def benchmark_performance():
    """Benchmark agent pipeline performance"""

    print("\n⏱️  PERFORMANCE BENCHMARK")
    print("="*80)

    import time

    market_context = await get_mock_market_context()
    orchestrator = DCAOrchestrator()

    # Warmup
    print("\n🔥 Warming up (1 iteration)...")
    await orchestrator.run(market_context, save_trace=False)

    # Benchmark
    iterations = 3
    print(f"\n📊 Running benchmark ({iterations} iterations)...")

    times = []
    for i in range(iterations):
        start = time.time()
        await orchestrator.run(market_context, save_trace=False)
        elapsed = time.time() - start
        times.append(elapsed)
        print(f"  Iteration {i+1}: {elapsed:.2f}s")

    avg_time = sum(times) / len(times)
    min_time = min(times)
    max_time = max(times)

    print(f"\n📈 Results:")
    print(f"  Average: {avg_time:.2f}s")
    print(f"  Min: {min_time:.2f}s")
    print(f"  Max: {max_time:.2f}s")
    print(f"\nNote: Time includes all 5 stages (Research, Analysis, Strategy, Decision, Verification)")


def main():
    """Main entry point"""

    import argparse

    parser = argparse.ArgumentParser(description="DCA Agent System Test Runner")
    parser.add_argument(
        "mode",
        choices=["single", "multiple", "benchmark"],
        default="single",
        nargs="?",
        help="Test mode: single (default), multiple, or benchmark"
    )
    parser.add_argument(
        "--count",
        type=int,
        default=3,
        help="Number of iterations for multiple mode (default: 3)"
    )

    args = parser.parse_args()

    if args.mode == "single":
        exit_code = asyncio.run(run_single_test())
        sys.exit(exit_code)

    elif args.mode == "multiple":
        asyncio.run(run_multiple_tests(args.count))

    elif args.mode == "benchmark":
        asyncio.run(benchmark_performance())


if __name__ == "__main__":
    main()
