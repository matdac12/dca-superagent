# Model Configuration for Testing

The system uses a tiered model architecture:

## Model Tiers

1. **Strategic Tier** (default: `gpt-5`)
   - Planner (research query generation)
   - Strategist (strategy synthesis)
   - Decision (final trading decision)

2. **Execution Tier** (default: `gpt-5-mini`)
   - Researcher (web search synthesis)
   - Technical Analyst
   - Fundamental Analyst
   - Risk Analyst
   - Sentiment Analyst

3. **Validation Tier** (default: `gpt-4o-mini`)
   - Validator (safety checks)
   - Verifier (post-decision audit)

## Testing with Cheaper Models

To test with `gpt-5-nano` (very cheap, fast), add these lines to your `.env` file:

```bash
# Testing with gpt-5-nano
MODEL_STRATEGIC=gpt-5-nano
MODEL_EXECUTION=gpt-5-nano
MODEL_VALIDATION=gpt-5-nano
```

Then run:
```bash
python run_autonomous_dca.py --dry-run
```

## Production Configuration

For production, simply **remove or comment out** the `MODEL_*` variables in `.env`:

```bash
# MODEL_STRATEGIC=gpt-5-nano     # Commented out = uses gpt-5
# MODEL_EXECUTION=gpt-5-nano     # Commented out = uses gpt-5-mini
# MODEL_VALIDATION=gpt-5-nano    # Commented out = uses gpt-4o-mini
```

The system will automatically use the carefully chosen production defaults.

## Quick Testing

You can also override models for a single run without editing `.env`:

```bash
MODEL_STRATEGIC=gpt-5-nano MODEL_EXECUTION=gpt-5-nano MODEL_VALIDATION=gpt-5-nano python run_autonomous_dca.py --dry-run
```

This preserves your architectural decisions while giving you flexibility for testing!
