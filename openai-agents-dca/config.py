"""
Configuration for DCA Agent System
"""
import os
from dotenv import load_dotenv

load_dotenv()

# OpenAI API Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Model Configuration
class ModelConfig:
    """Model selection based on task complexity

    Environment variables for testing (optional):
    - MODEL_STRATEGIC: Override for strategic/planning tasks (default: gpt-5)
    - MODEL_EXECUTION: Override for execution/analysis tasks (default: gpt-5-mini)
    - MODEL_VALIDATION: Override for validation tasks (default: gpt-4o-mini)

    If env vars are not set, uses carefully chosen defaults.
    """

    # Base model tiers (defaults)
    GPT_5 = "gpt-5"
    GPT_5_MINI = "gpt-5-mini"
    GPT_4O_MINI = "gpt-4o-mini"

    # Environment variable overrides (for testing)
    _STRATEGIC = os.getenv("MODEL_STRATEGIC", GPT_5)
    _EXECUTION = os.getenv("MODEL_EXECUTION", GPT_5_MINI)
    _VALIDATION = os.getenv("MODEL_VALIDATION", GPT_4O_MINI)

    # Model assignments (strategic tier - high IQ tasks)
    PLANNER = _STRATEGIC      # Research query generation
    STRATEGIST = _STRATEGIC   # Strategy synthesis
    DECISION = _STRATEGIC     # Final decision

    # Model assignments (execution tier - analysis tasks)
    RESEARCHER = _EXECUTION   # Web search synthesis
    TECHNICAL = _EXECUTION    # Technical analysis
    FUNDAMENTAL = _EXECUTION  # Fundamental analysis
    RISK = _EXECUTION         # Risk analysis
    SENTIMENT = _EXECUTION    # Sentiment analysis

    # Model assignments (validation tier - guardrails)
    VALIDATOR = _VALIDATION   # Risk validation guardrail
    VERIFIER = _VALIDATION    # Post-decision audit


# Agent Configuration
class AgentConfig:
    """Configuration for agent behavior"""

    # Research configuration
    MIN_RESEARCH_QUERIES = 5
    MAX_RESEARCH_QUERIES = 5
    RESEARCH_SUMMARY_MAX_WORDS = 200

    # Strategy configuration
    MIN_STRATEGY_OPTIONS = 3
    MAX_STRATEGY_OPTIONS = 5

    # Risk limits (must match production)
    MAX_ORDERS_PER_ASSET = 3
    MAX_TOTAL_ORDERS = 6
    MAX_PORTFOLIO_EXPOSURE_PCT = 50.0
    LIMIT_PRICE_DEVIATION_PCT = 5.0
    MIN_ORDER_VALUE_USD = 10.0

    # Accumulation rules
    ASSETS = ["BTCUSDT", "ADAUSDT"]
    PREFERRED_ORDER_TYPE = "LIMIT"
    LIMIT_ORDER_DISCOUNT_MIN_PCT = 2.0
    LIMIT_ORDER_DISCOUNT_MAX_PCT = 5.0


# Production Data Connection
class ProductionConfig:
    """Configuration for connecting to production data"""

    # Next.js API endpoint (if exposing data via API)
    PRODUCTION_API_URL = os.getenv("PRODUCTION_API_URL", "http://localhost:3000")

    # Or direct database connection (InfluxDB)
    INFLUXDB_URL = os.getenv("INFLUXDB_URL")
    INFLUXDB_TOKEN = os.getenv("INFLUXDB_TOKEN")
    INFLUXDB_ORG = os.getenv("INFLUXDB_ORG")
    INFLUXDB_BUCKET = os.getenv("INFLUXDB_BUCKET")

    # Binance API (for market data)
    BINANCE_API_KEY = os.getenv("BINANCE_API_KEY")
    BINANCE_API_SECRET = os.getenv("BINANCE_API_SECRET")


# Tracing Configuration
class TracingConfig:
    """Configuration for observability"""

    ENABLE_TRACING = True
    LOG_LEVEL = "INFO"
    LOG_FORMAT = "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>"
    OUTPUT_DIR = "outputs"
    TRACES_DIR = "traces"
