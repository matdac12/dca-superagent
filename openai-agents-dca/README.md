# DCA Superhuman Agent System

A multi-agent system for making superhuman BTC/ADA accumulation decisions using OpenAI's Agents SDK.

## Architecture

5-stage deep analysis pipeline:

1. **RESEARCH** (Parallel Web Search)
   - Planner Agent (GPT-5) generates 10-15 specialized queries
   - Research Agents (GPT-5-mini + WebSearchTool) execute in parallel

2. **SPECIALIST ANALYSIS** (Agents as Tools)
   - Technical Analyst (GPT-5-mini)
   - Fundamental Analyst (GPT-5-mini)
   - Risk Analyst (GPT-5-mini)
   - Sentiment Analyst (GPT-5-mini)

3. **STRATEGY SYNTHESIS**
   - Strategist (GPT-5) generates 3-5 strategic options
   - Calls specialist tools for deep dives

4. **DECISION**
   - Decision Agent (GPT-5) selects best option
   - Risk Validator Guardrail (GPT-4o-mini, parallel)

5. **VERIFICATION**
   - Post-decision verifier (GPT-4o-mini) audits logic

## Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys
```

## Project Structure

```
openai-agents-dca/
├── agents/
│   ├── planner.py          # Research planner (GPT-5)
│   ├── researcher.py       # WebSearch agents (GPT-5-mini)
│   ├── analysts/
│   │   ├── technical.py    # Technical analyst
│   │   ├── fundamental.py  # Fundamental analyst
│   │   ├── risk.py         # Risk analyst
│   │   └── sentiment.py    # Sentiment analyst
│   ├── strategist.py       # Strategy synthesis (GPT-5)
│   ├── decision.py         # Final decision maker (GPT-5)
│   └── verifier.py         # Post-decision audit
├── tools/
│   └── binance_data.py     # Production data connector
├── models/
│   ├── schemas.py          # Pydantic models
│   └── types.py            # Type definitions
├── orchestrator.py         # Main DCA orchestrator
├── test_runner.py          # Testing framework
└── config.py               # Configuration
```

## Model Assignment

- **GPT-5**: Planner, Strategist, Decision (critical thinking)
- **GPT-5-mini**: Researchers, all 4 Analysts (high-quality execution)
- **GPT-4o-mini**: Risk Validator, Verifier (fast validation)

## Quick Start

See [QUICKSTART.md](QUICKSTART.md) for detailed setup instructions.

```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Add your OPENAI_API_KEY to .env

# Run test with mock data
python test_runner.py single
```

## Usage

### Testing Mode (Mock Data)

```bash
# Single test
python test_runner.py single

# Multiple iterations
python test_runner.py multiple --count 5

# Performance benchmark
python test_runner.py benchmark
```

### Programmatic Usage

```python
from orchestrator import DCAOrchestrator
from tools import get_mock_market_context

# Create orchestrator
orchestrator = DCAOrchestrator()

# Load market context (mock or production)
market_context = await get_mock_market_context()

# Run decision pipeline
decision, verification, guardrail, trace = await orchestrator.run(market_context)

# Check results
if guardrail.status == "PASS" and verification.consistency_check == "PASS":
    print("✓ Decision is valid and ready for execution")
    print(f"Selected: {decision.plan}")
    print(f"Actions: {len(decision.actions)} trades")
```

### Integration with Production

```python
from orchestrator import DCAOrchestrator
from tools import get_production_data

orchestrator = DCAOrchestrator()

# Fetch real market data from your production system
market_context = await get_production_data(use_mock=False)

# Run agent pipeline
decision, verification, guardrail, trace = await orchestrator.run(market_context)

# Execute decision (your existing executor)
if guardrail.status == "PASS":
    # Use your multiActionExecutor here
    results = await execute_actions(decision.actions)
```

## Testing

The system runs on production data without executing trades, outputting decisions for manual review and comparison.

```bash
python test_runner.py
```

## Key Features

- **Deep Analysis**: 10-15 parallel web searches + 4 specialist analysts
- **Strategic Options**: 3-5 alternatives evaluated before final decision
- **Quality Models**: GPT-5 for critical thinking, GPT-5-mini for execution
- **Built-in Tools**: WebSearchTool (no external API setup needed)
- **Full Tracing**: See every agent's reasoning and tool calls
- **Guardrails**: Parallel risk validation prevents bad decisions
- **Testable**: Run on production data without risk

## Development Status

- [x] Project structure
- [x] Configuration and schemas
- [x] Planner Agent (GPT-5)
- [x] Research Agents (GPT-5-mini + WebSearchTool, parallel execution)
- [x] Specialist Analysts (Technical, Fundamental, Risk, Sentiment)
- [x] Strategist Agent (GPT-5 with specialist tools)
- [x] Decision Agent (GPT-5 with risk validator guardrail)
- [x] Verifier Agent (GPT-4o-mini post-decision audit)
- [x] Orchestrator (5-stage pipeline)
- [x] Testing framework
- [x] Mock data connector
- [ ] Real Binance API integration
- [ ] Production deployment
