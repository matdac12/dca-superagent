## DCA Superhuman Agent System - Quick Start Guide

This guide will help you set up and run the DCA agent system for the first time.

## Prerequisites

- Python 3.10+ installed
- OpenAI API key
- Terminal access

## Installation

### 1. Navigate to Project Directory

```bash
cd /Users/mattia/Documents/Projects/tradewarriors/openai-agents-dca
```

### 2. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate  # On Windows
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-...your-key-here...
```

## Running Your First Test

### Quick Test (Mock Data)

Run a single test with mock market data:

```bash
python test_runner.py single
```

This will:
1. Load mock market data (BTC oversold scenario)
2. Run all 5 stages of the agent pipeline:
   - Research (10-15 web searches in parallel)
   - Specialist Analysis (Technical, Fundamental, Risk, Sentiment)
   - Strategy Synthesis (3-5 strategic options)
   - Decision (final selection with risk validation)
   - Verification (consistency audit)
3. Output a complete decision with reasoning
4. Save results to `outputs/latest_decision.json`

### Expected Output

You should see output like:

```
================================================================================
DCA SUPERHUMAN AGENT SYSTEM - TEST MODE
================================================================================

📊 Loading mock market data...

Market Context:
  Portfolio Value: $10,000.00
  Available USDT: $5,000.00
  BTC: $89,500.00 (RSI: 28.3)
  ADA: $0.9165 (RSI: 38.5)

🚀 Starting decision pipeline...

================================================================================
DCA SUPERHUMAN AGENT SYSTEM - Starting Decision Pipeline
Timestamp: 2025-01-08T...
================================================================================

📋 STAGE 1: RESEARCH PLANNING & EXECUTION
--------------------------------------------------------------------------------
Planner Agent (GPT-5) generating research queries...
✓ Generated 12 research queries
Strategy Hint: Market appears to be in oversold territory...

Executing web searches in parallel...
  [1/12] ✓ Bitcoin RSI oversold extreme levels... (recency: 10/10)
  [2/12] ✓ crypto Fear and Greed Index today... (recency: 10/10)
  ...

✓ Completed 12 research queries successfully

🔬 STAGE 2: SPECIALIST ANALYSIS
--------------------------------------------------------------------------------
Specialist analysts ready (will be called by Strategist as needed)

🎯 STAGE 3: STRATEGY SYNTHESIS
--------------------------------------------------------------------------------
Strategist Agent (GPT-5) generating strategic options...
(Strategist may call specialist tools as needed)

✓ Generated 4 strategic options
Recommended: Option #1

  Option 1: Aggressive BTC Accumulation
    Conviction: 9/10
    BTC: 40.0%, ADA: 10.0%

  Option 2: Balanced Accumulation
    Conviction: 7/10
    BTC: 25.0%, ADA: 25.0%
  ...

⚖️  STAGE 4: FINAL DECISION (with Risk Validation)
--------------------------------------------------------------------------------
Decision Agent (GPT-5) evaluating options...
Risk Validator (GPT-4o-mini) running in parallel...

✓ Decision: Option #1
Guardrail: PASS

🔍 STAGE 5: VERIFICATION
--------------------------------------------------------------------------------
Verifier Agent (GPT-4o-mini) auditing decision...
✓ Verification: PASS

================================================================================
✓ PIPELINE COMPLETE
================================================================================

Selected Strategy: Aggressive BTC Accumulation
Actions: 3 trades
Risk Validation: PASS
Decision Audit: PASS

✓ Decision is valid and ready for execution

Full trace saved: traces/trace_20250108_143022.json

================================================================================
DECISION SUMMARY
================================================================================
[Detailed decision output with actions, reasoning, plan...]
```

## Running Multiple Tests

Run 3 iterations to see how decisions vary:

```bash
python test_runner.py multiple --count 3
```

## Performance Benchmark

Test pipeline speed:

```bash
python test_runner.py benchmark
```

## Understanding the Output

### Decision Files

- `outputs/latest_decision.json` - Most recent decision
- `traces/trace_*.json` - Full execution traces with all agent outputs

### Key Metrics

- **Conviction Score (1-10)**: How strong the signals are
  - 9-10 = Exceptional opportunity
  - 6-8 = Good opportunity
  - 4-5 = Neutral
  - 1-3 = Poor setup

- **Risk Level**: GREEN / YELLOW / RED
  - GREEN = Low risk, normal accumulation
  - YELLOW = Moderate risk, cautious approach
  - RED = High risk, defensive posture

- **Allocation %**: Percentage of USDT to deploy
  - Aggressive: 40-50%
  - Normal: 20-30%
  - Conservative: 10-20%
  - HOLD: 0%

## Customizing for Production

### 1. Connect to Real Data

Edit `tools/binance_data.py` to implement:
- Binance API integration (fetch real prices, indicators, order book)
- Next.js API endpoint (if you expose market data via API)

### 2. Update Model Selection

In `config.py`, change models for testing:

```python
# For testing with cheaper models
GPT_5 = "gpt-4.1"  # Instead of gpt-5
GPT_5_MINI = "gpt-4o-mini"  # Instead of gpt-5-mini
```

For production, use:
```python
GPT_5 = "gpt-5"
GPT_5_MINI = "gpt-5-mini"
```

### 3. Adjust Research Queries

Edit prompts in `agents/planner.py` to:
- Add more categories
- Focus on specific data sources
- Tune for your strategy

### 4. Customize Risk Limits

Edit `config.py` `AgentConfig`:

```python
MAX_ORDERS_PER_ASSET = 3  # Adjust as needed
MAX_PORTFOLIO_EXPOSURE_PCT = 50.0  # Adjust as needed
```

## Integration with Current System

To run alongside your existing council system:

1. **Parallel Testing**:
   - Run both systems on same market data
   - Compare decisions
   - Track performance over time

2. **Hybrid Approach**:
   - Use new system for research only
   - Feed insights to council
   - Keep council for final decision

3. **Full Migration**:
   - Replace council entirely
   - Use new system as primary decision maker
   - Keep council for validation/audit

## Troubleshooting

### "Module not found" errors

Make sure you activated the virtual environment:
```bash
source venv/bin/activate
```

### "OpenAI API key not found"

Check your `.env` file has:
```
OPENAI_API_KEY=sk-...
```

### "Request timed out"

Increase timeout in `requirements.txt` or reduce research query count in `config.py`.

### "Rate limit exceeded"

Add delays between API calls or use lower-tier models for testing.

## Next Steps

1. **Test with mock data** - Understand the system flow
2. **Review decision traces** - See how agents reason
3. **Connect real data** - Implement Binance integration
4. **Compare with council** - Run parallel for 30 days
5. **Tune prompts** - Adjust based on decision quality
6. **Deploy to production** - When confident in results

## Support

For issues or questions:
1. Check traces in `traces/` directory
2. Review logs in `outputs/orchestrator.log`
3. Inspect individual agent outputs in trace JSON

## Architecture Overview

```
Stage 1: RESEARCH (Planner GPT-5 → 10-15 parallel searches GPT-5-mini)
    ↓
Stage 2: ANALYSIS (4 specialist analysts GPT-5-mini as tools)
    ↓
Stage 3: STRATEGY (Strategist GPT-5 generates 3-5 options)
    ↓
Stage 4: DECISION (Decision GPT-5 + Risk Validator GPT-4o-mini)
    ↓
Stage 5: VERIFICATION (Verifier GPT-4o-mini audits logic)
    ↓
OUTPUT: TradingDecision + full reasoning trace
```

Happy testing! 🚀
