"""
Pydantic schemas for structured agent outputs
"""
from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from enum import Enum


# ============================================================================
# RESEARCH PHASE SCHEMAS
# ============================================================================

class ResearchCategory(str, Enum):
    """Categories for research queries"""
    ON_CHAIN = "on-chain"
    ECOSYSTEM = "ecosystem"
    MACRO = "macro"
    TECHNICAL = "technical"
    SENTIMENT = "sentiment"


class ResearchQuery(BaseModel):
    """Single research query specification"""
    query: str = Field(..., description="The search query string")
    reason: str = Field(..., description="Why this query is relevant for DCA timing")
    priority: int = Field(..., ge=1, le=5, description="1=critical, 5=nice-to-have")
    category: ResearchCategory = Field(..., description="Query category")


class DCAResearchPlan(BaseModel):
    """Output from Planner Agent"""
    searches: List[ResearchQuery] = Field(
        ...,
        min_length=5,
        max_length=5,
        description="Exactly 5 specialized research queries (one per category)"
    )
    strategy_hint: str = Field(
        ...,
        description="Initial hypothesis about market conditions based on available data"
    )


class ResearchSummary(BaseModel):
    """Output from individual Research Agent"""
    query: str = Field(..., description="The search query that was executed")
    summary: str = Field(
        ...,
        max_length=1500,
        description="200-300 word summary of findings"
    )
    key_metrics: List[str] = Field(
        ...,
        description="Key numbers, dates, or facts extracted"
    )
    implications: str = Field(
        ...,
        description="What this means for BTC/ADA accumulation"
    )
    recency_score: int = Field(
        ...,
        ge=1,
        le=10,
        description="How recent is this info? 10=last 24h, 1=old news"
    )


# ============================================================================
# SPECIALIST ANALYST SCHEMAS
# ============================================================================

class AssetAnalysis(BaseModel):
    """Base class for per-asset analysis"""
    asset: Literal["BTC", "ADA"]
    score: int = Field(..., ge=1, le=10, description="Quality/conviction score 1-10")
    reasoning: str = Field(..., description="Detailed reasoning for the score")


class TechnicalAssetAnalysis(AssetAnalysis):
    """Technical analysis for single asset"""
    entry_quality: int = Field(..., ge=1, le=10, description="How good is entry right now?")
    recommended_limit_price: Optional[float] = Field(None, description="Suggested limit price")
    fill_probability_pct: Optional[float] = Field(None, description="% chance of fill")
    setup_risks: List[str] = Field(..., description="Technical risks to watch")


class TechnicalAnalysis(BaseModel):
    """Output from Technical Analyst"""
    btc: TechnicalAssetAnalysis
    ada: TechnicalAssetAnalysis
    overall_market_structure: str = Field(
        ...,
        description="Bullish/bearish/neutral with reasoning"
    )
    best_entry_timing: str = Field(
        ...,
        description="Immediate, wait for dip, or avoid for now"
    )


class FundamentalAssetAnalysis(AssetAnalysis):
    """Fundamental analysis for single asset"""
    conviction: int = Field(..., ge=1, le=10, description="Long-term conviction 1-10")
    value_assessment: str = Field(
        ...,
        description="Undervalued/fairly valued/overvalued with reasoning"
    )
    key_metrics: List[str] = Field(..., description="Critical on-chain or ecosystem metrics")


class FundamentalAnalysis(BaseModel):
    """Output from Fundamental Analyst"""
    btc: FundamentalAssetAnalysis
    ada: FundamentalAssetAnalysis
    relative_preference: str = Field(
        ...,
        description="Which asset is more compelling for accumulation and why"
    )


class Risk(BaseModel):
    """Individual risk item"""
    risk: str = Field(..., description="Description of the risk")
    severity: int = Field(..., ge=1, le=10, description="How bad if it happens")
    probability: int = Field(..., ge=1, le=10, description="How likely it is")
    mitigation: str = Field(..., description="How to protect against this risk")


class RiskLevel(str, Enum):
    """Overall risk assessment"""
    GREEN = "GREEN"
    YELLOW = "YELLOW"
    RED = "RED"


class RiskAnalysis(BaseModel):
    """Output from Risk Analyst"""
    overall_level: RiskLevel = Field(..., description="GREEN/YELLOW/RED")
    risks: List[Risk] = Field(..., description="Specific risks identified")
    market_structure_assessment: str = Field(
        ...,
        description="Leverage, funding, volatility analysis"
    )
    macro_environment: str = Field(..., description="Fed policy, regulatory, institutional")
    recommendation: str = Field(
        ...,
        description="Given risks, should we be aggressive, cautious, or defensive?"
    )


class SentimentAnalysis(BaseModel):
    """Output from Sentiment Analyst"""
    sentiment_score: int = Field(
        ...,
        ge=-10,
        le=10,
        description="-10=extreme fear, 0=neutral, +10=extreme greed"
    )
    contrarian_opportunity: bool = Field(
        ...,
        description="True if extreme pessimism creates buy signal"
    )
    crowded_trade_risk: bool = Field(
        ...,
        description="True if FOMO conditions (everyone buying)"
    )
    fear_greed_index: Optional[int] = Field(None, description="Fear & Greed Index value")
    funding_rate_signal: str = Field(
        ...,
        description="What funding rates tell us about positioning"
    )
    social_sentiment: str = Field(..., description="Twitter/Reddit mood summary")
    recommendation: str = Field(
        ...,
        description="Buy signal, neutral, or wait based on sentiment"
    )


# ============================================================================
# STRATEGY PHASE SCHEMAS
# ============================================================================

class ActionType(str, Enum):
    """Trading action types"""
    PLACE_LIMIT_BUY = "PLACE_LIMIT_BUY"
    PLACE_LIMIT_SELL = "PLACE_LIMIT_SELL"
    PLACE_MARKET_BUY = "PLACE_MARKET_BUY"
    PLACE_MARKET_SELL = "PLACE_MARKET_SELL"
    CANCEL_ORDER = "CANCEL_ORDER"
    HOLD = "HOLD"


class Action(BaseModel):
    """Single trading action"""
    type: ActionType
    asset: Optional[str] = Field(None, description="BTCUSDT or ADAUSDT")
    price: Optional[float] = Field(None, description="Limit price in USD. Required for LIMIT orders (e.g., 102000.0 for BTC, 0.5550 for ADA)")
    quantity: Optional[float] = Field(
        None,
        description="USD amount to spend on this order (NOT token quantity). Required for PLACE actions. Example: 28269.0 means spend $28,269 USD. Must be >= 10.0",
        ge=10.0
    )
    order_id: Optional[str] = Field(None, description="Required for CANCEL_ORDER")
    reasoning: str = Field(..., description="Why this specific action")


class StrategyOption(BaseModel):
    """Single strategic option"""
    strategy: str = Field(..., description="Name of strategy (e.g., 'Aggressive BTC accumulation')")
    btc_allocation_pct: float = Field(
        ...,
        ge=0,
        le=100,
        description="% of available USDT to allocate to BTC"
    )
    ada_allocation_pct: float = Field(
        ...,
        ge=0,
        le=100,
        description="% of available USDT to allocate to ADA"
    )
    actions: List[Action] = Field(..., description="Specific orders to place")
    conviction: int = Field(..., ge=1, le=10, description="How confident in this strategy")
    rationale: str = Field(..., description="Why this makes sense given conditions")
    risks: str = Field(..., description="What could go wrong")
    expected_outcome: str = Field(
        ...,
        description="When orders likely fill, probability, timeframe"
    )


class StrategyOptions(BaseModel):
    """Output from Strategist"""
    options: List[StrategyOption] = Field(
        ...,
        min_length=3,
        max_length=5,
        description="3-5 strategic options"
    )
    recommended_option: int = Field(
        ...,
        description="Index of strategist's top pick (0-based)"
    )
    market_summary: str = Field(
        ...,
        max_length=500,
        description="2-3 sentence market overview"
    )


# ============================================================================
# DECISION PHASE SCHEMAS
# ============================================================================

class TradingDecision(BaseModel):
    """Final decision output - ready for execution"""
    selected_option: int = Field(..., description="Index of chosen strategy option")
    actions: List[Action] = Field(..., description="Actions to execute")
    plan: str = Field(..., description="Updated strategic plan for next cycle")
    reasoning: str = Field(
        ...,
        description="Why this option was selected over others"
    )
    risk_assessment: str = Field(
        ...,
        description="Final risk check before execution"
    )


class GuardrailOutput(BaseModel):
    """Output from Risk Validator guardrail"""
    status: Literal["PASS", "TRIPWIRE"] = Field(
        ...,
        description="PASS if all checks passed, TRIPWIRE if any violation"
    )
    violations: List[str] = Field(
        default_factory=list,
        description="List of violations if TRIPWIRE"
    )
    reasoning: str = Field(..., description="Explanation of validation result")


# ============================================================================
# VERIFICATION PHASE SCHEMAS
# ============================================================================

class VerificationResult(BaseModel):
    """Output from post-decision verifier"""
    consistency_check: Literal["PASS", "ISSUES"] = Field(
        ...,
        description="PASS if logic is consistent"
    )
    issues: List[str] = Field(
        default_factory=list,
        description="Any inconsistencies or red flags detected"
    )
    recommendations: List[str] = Field(
        default_factory=list,
        description="Suggestions for improvement"
    )
    summary: str = Field(..., description="Overall audit summary")


# ============================================================================
# MARKET CONTEXT INPUT (from production system)
# ============================================================================

class PortfolioState(BaseModel):
    """Current portfolio holdings"""
    total_value_usd: float
    usdt_balance: float
    btc_balance: float
    btc_value_usd: float
    ada_balance: float
    ada_value_usd: float


class TechnicalIndicators(BaseModel):
    """Technical indicators for an asset"""
    rsi: float
    bb_upper: float
    bb_middle: float
    bb_lower: float
    sma_20: float
    ema_12: float
    ema_26: float


class OrderBookLevel(BaseModel):
    """Single order book level"""
    price: float
    quantity: float


class OrderBook(BaseModel):
    """Order book summary"""
    bids: List[OrderBookLevel]
    asks: List[OrderBookLevel]


class OpenOrder(BaseModel):
    """Pending limit order"""
    order_id: str
    asset: str
    side: str
    price: float
    quantity: float
    time_placed: str


class MarketData(BaseModel):
    """Market data for single asset"""
    asset: str
    current_price: float
    price_change_24h_pct: float
    price_change_96h_pct: float
    high_96h: float
    low_96h: float
    avg_96h: float
    indicators: TechnicalIndicators
    order_book: OrderBook


class MarketContext(BaseModel):
    """Complete market context input"""
    timestamp: str
    portfolio: PortfolioState
    btc_data: MarketData
    ada_data: MarketData
    open_orders: List[OpenOrder]
    previous_plan: Optional[str] = None
    recent_trades: Optional[List[dict]] = None
