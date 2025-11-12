"""
Pydantic schemas for DCA Simple system
"""
from pydantic import BaseModel, Field
from typing import Literal
from enum import Enum


# ============================================================================
# AI DECISION OUTPUT
# ============================================================================

class SimpleDCADecision(BaseModel):
    """
    Output from the single AI decision agent.

    The agent decides how much USD to allocate to each asset based on
    market conditions, balance constraints, and long-term DCA strategy.
    """
    btc_amount: float = Field(
        ge=0.0,
        description="USD amount to deploy for Bitcoin (0 = skip BTC today)"
    )
    ada_amount: float = Field(
        ge=0.0,
        description="USD amount to deploy for Cardano (0 = skip ADA today)"
    )
    reasoning: str = Field(
        min_length=20,
        max_length=500,
        description="Clear explanation of why this allocation was chosen (20-500 chars)"
    )
    confidence: int = Field(
        ge=1,
        le=5,
        description="Confidence in decision: 1=low (uncertain), 5=high (strong conviction)"
    )

    @property
    def total_amount(self) -> float:
        """Total USD being deployed"""
        return self.btc_amount + self.ada_amount

    @property
    def is_hold(self) -> bool:
        """True if decision is to HOLD (no deployment)"""
        return self.total_amount == 0

    @property
    def btc_percentage(self) -> float:
        """Percentage allocated to BTC (0-100)"""
        if self.total_amount == 0:
            return 0.0
        return (self.btc_amount / self.total_amount) * 100

    @property
    def ada_percentage(self) -> float:
        """Percentage allocated to ADA (0-100)"""
        if self.total_amount == 0:
            return 0.0
        return (self.ada_amount / self.total_amount) * 100

    def __str__(self) -> str:
        """Human-readable representation"""
        if self.is_hold:
            return f"HOLD - {self.reasoning}"
        return (
            f"BUY: ${self.btc_amount:.2f} BTC ({self.btc_percentage:.0f}%), "
            f"${self.ada_amount:.2f} ADA ({self.ada_percentage:.0f}%) "
            f"- {self.reasoning}"
        )


# ============================================================================
# ACTION MODELS (reused from existing system)
# ============================================================================

class ActionType(str, Enum):
    """Types of trading actions"""
    PLACE_MARKET_BUY = "PLACE_MARKET_BUY"
    PLACE_MARKET_SELL = "PLACE_MARKET_SELL"
    PLACE_LIMIT_BUY = "PLACE_LIMIT_BUY"
    PLACE_LIMIT_SELL = "PLACE_LIMIT_SELL"
    CANCEL_ORDER = "CANCEL_ORDER"
    HOLD = "HOLD"


class Action(BaseModel):
    """
    Trading action to be validated and executed.

    This model is compatible with the existing BinanceExecutor
    and SafetyValidator classes.
    """
    type: ActionType = Field(
        description="Type of action to execute"
    )
    asset: str | None = Field(
        None,
        description="Trading pair (e.g., 'BTCUSDT', 'ADAUSDT')"
    )
    price: float | None = Field(
        None,
        ge=0,
        description="Price for limit orders (not used for market orders)"
    )
    quantity: float | None = Field(
        None,
        ge=0,
        description="USD amount to spend (NOT token quantity). Min $10."
    )
    order_id: str | None = Field(
        None,
        description="Order ID for cancellation actions"
    )
    reasoning: str = Field(
        default="",
        description="Explanation for this action"
    )

    def __str__(self) -> str:
        """Human-readable representation"""
        if self.type == ActionType.HOLD:
            return f"HOLD - {self.reasoning}"
        elif self.type == ActionType.PLACE_MARKET_BUY:
            return f"BUY ${self.quantity:.2f} {self.asset} (market)"
        elif self.type == ActionType.PLACE_LIMIT_BUY:
            return f"BUY ${self.quantity:.2f} {self.asset} @ ${self.price:.2f} (limit)"
        elif self.type == ActionType.CANCEL_ORDER:
            return f"CANCEL {self.asset} order {self.order_id}"
        else:
            return f"{self.type} {self.asset}"


# ============================================================================
# EXECUTION RESULT
# ============================================================================

class ExecutionResult(BaseModel):
    """Result of a single order execution"""
    success: bool = Field(description="Whether the order was successful")
    asset: str = Field(description="Trading pair (e.g., 'BTCUSDT')")
    action_type: ActionType = Field(description="Type of action executed")
    order_id: str | None = Field(None, description="Binance order ID")
    executed_price: float | None = Field(None, description="Actual execution price")
    executed_quantity: float | None = Field(None, description="Actual token quantity filled")
    usd_amount: float | None = Field(None, description="USD amount deployed")
    fee: float | None = Field(None, description="Trading fee in USD")
    error: str | None = Field(None, description="Error message if failed")
    timestamp: str = Field(description="ISO timestamp of execution")

    def __str__(self) -> str:
        """Human-readable representation"""
        if not self.success:
            return f"❌ {self.asset} - {self.error}"
        return (
            f"✅ {self.asset}: ${self.usd_amount:.2f} @ ${self.executed_price:.2f} "
            f"(filled: {self.executed_quantity:.8f}, fee: ${self.fee:.2f})"
        )


# ============================================================================
# SESSION SUMMARY
# ============================================================================

class SessionType(str, Enum):
    """Types of DCA sessions"""
    SKIP = "SKIP"      # Balance too low
    HOLD = "HOLD"      # Market conditions unfavorable
    BUY = "BUY"        # Orders executed


class DCASession(BaseModel):
    """
    Complete record of a DCA execution session.

    This is saved as JSON in logs/executions/ for historical tracking.
    """
    timestamp: str = Field(description="ISO timestamp of session start")
    session_type: SessionType = Field(description="Type of session")

    # Balance info
    usdt_balance: float = Field(description="Starting USDT balance")
    max_deploy: float = Field(description="Maximum allowed deployment")
    deployment_percentage: float = Field(description="Deployment % used (0.20 = 20%)")

    # Market data snapshot
    btc_price: float = Field(description="BTC price at decision time")
    ada_price: float = Field(description="ADA price at decision time")
    btc_rsi: float = Field(description="BTC RSI(14)")
    ada_rsi: float = Field(description="ADA RSI(14)")
    fear_greed: int = Field(description="Fear & Greed Index (0-100)")

    # Decision
    decision: SimpleDCADecision = Field(description="AI decision output")

    # Execution results (if BUY)
    execution_results: list[ExecutionResult] = Field(
        default_factory=list,
        description="Order execution results"
    )

    # Summary
    total_deployed: float = Field(default=0.0, description="Total USD deployed")
    total_fees: float = Field(default=0.0, description="Total fees paid")
    remaining_balance: float = Field(description="USDT balance after execution")

    @property
    def was_successful(self) -> bool:
        """True if session executed without errors"""
        if self.session_type != SessionType.BUY:
            return True  # SKIP and HOLD are "successful" no-ops
        return all(r.success for r in self.execution_results)

    def __str__(self) -> str:
        """Human-readable summary"""
        if self.session_type == SessionType.SKIP:
            return f"SKIP - Balance ${self.usdt_balance:.2f} < minimum"
        elif self.session_type == SessionType.HOLD:
            return f"HOLD - {self.decision.reasoning}"
        else:
            return (
                f"BUY - Deployed ${self.total_deployed:.2f} "
                f"({len(self.execution_results)} orders, "
                f"${self.total_fees:.2f} fees)"
            )


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def decision_to_actions(decision: SimpleDCADecision) -> list[Action]:
    """
    Convert AI decision to executable actions.

    Args:
        decision: SimpleDCADecision from AI agent

    Returns:
        List of Action objects for BinanceExecutor
    """
    actions = []

    if decision.is_hold:
        # HOLD decision - no actions
        actions.append(Action(
            type=ActionType.HOLD,
            reasoning=decision.reasoning
        ))
        return actions

    # BTC buy action
    if decision.btc_amount >= 10:  # Binance minimum
        actions.append(Action(
            type=ActionType.PLACE_MARKET_BUY,
            asset="BTCUSDT",
            quantity=decision.btc_amount,
            reasoning=f"BTC allocation: {decision.reasoning}"
        ))

    # ADA buy action
    if decision.ada_amount >= 10:  # Binance minimum
        actions.append(Action(
            type=ActionType.PLACE_MARKET_BUY,
            asset="ADAUSDT",
            quantity=decision.ada_amount,
            reasoning=f"ADA allocation: {decision.reasoning}"
        ))

    return actions


if __name__ == "__main__":
    # Test schemas
    print("Testing DCA Simple Schemas\n")

    # Test decision
    decision = SimpleDCADecision(
        btc_amount=100.0,
        ada_amount=50.0,
        reasoning="Both assets oversold (RSI<30), extreme fear creates opportunity",
        confidence=4
    )

    print("Decision:")
    print(f"  {decision}")
    print(f"  Total: ${decision.total_amount:.2f}")
    print(f"  BTC: {decision.btc_percentage:.1f}%")
    print(f"  ADA: {decision.ada_percentage:.1f}%")
    print(f"  Is Hold: {decision.is_hold}")

    # Test action conversion
    print("\nActions:")
    actions = decision_to_actions(decision)
    for action in actions:
        print(f"  {action}")

    # Test HOLD decision
    print("\nHOLD Decision:")
    hold_decision = SimpleDCADecision(
        btc_amount=0.0,
        ada_amount=0.0,
        reasoning="Both overbought (RSI>70), waiting for pullback",
        confidence=3
    )
    print(f"  {hold_decision}")
    print(f"  Is Hold: {hold_decision.is_hold}")
