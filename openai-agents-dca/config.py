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
    """Model selection based on task complexity"""

    # GPT-5 for critical thinking tasks
    GPT_5 = "gpt-5"

    # GPT-5-mini for high-quality execution
    GPT_5_MINI = "gpt-5-mini"

    # GPT-4o-mini for fast validation
    GPT_4O_MINI = "gpt-4o-mini"

    # Model assignments
    PLANNER = GPT_5           # Research query generation
    RESEARCHER = GPT_5_MINI   # Web search synthesis
    TECHNICAL = GPT_5_MINI    # Technical analysis
    FUNDAMENTAL = GPT_5_MINI  # Fundamental analysis
    RISK = GPT_5_MINI         # Risk analysis
    SENTIMENT = GPT_5_MINI    # Sentiment analysis
    STRATEGIST = GPT_5        # Strategy synthesis
    DECISION = GPT_5          # Final decision
    VALIDATOR = GPT_4O_MINI   # Risk validation guardrail
    VERIFIER = GPT_4O_MINI    # Post-decision audit


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
