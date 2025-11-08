"""
Production Data Connector

Connects to production data sources to fetch market context:
- Binance API for real-time market data
- Next.js API endpoint (if exposed)
- Or mock data for testing
"""
import httpx
from typing import Optional
from datetime import datetime

from models.schemas import (
    MarketContext,
    PortfolioState,
    MarketData,
    TechnicalIndicators,
    OrderBook,
    OrderBookLevel,
    OpenOrder
)
from config import ProductionConfig


class ProductionDataConnector:
    """
    Connects to production system to fetch current market context

    Supports multiple data sources:
    1. Direct Binance API
    2. Next.js API endpoint (if you expose one)
    3. Mock data for testing
    """

    def __init__(self, use_mock: bool = False):
        """
        Initialize data connector

        Args:
            use_mock: If True, uses mock data instead of real API calls
        """
        self.use_mock = use_mock
        self.client = httpx.AsyncClient(timeout=30.0)

    async def get_market_context(self) -> MarketContext:
        """
        Fetch complete market context from production

        Returns:
            MarketContext with all required data
        """
        if self.use_mock:
            return self._get_mock_data()

        # TODO: Implement real data fetching
        # For now, return mock data as placeholder
        print("⚠️  Real data connector not yet implemented, using mock data")
        return self._get_mock_data()

    async def fetch_from_nextjs_api(self) -> MarketContext:
        """
        Fetch market context from Next.js API endpoint

        Requires: API endpoint that exposes market data at /api/dca/market-context
        """
        url = f"{ProductionConfig.PRODUCTION_API_URL}/api/dca/market-context"

        try:
            response = await self.client.get(url)
            response.raise_for_status()

            data = response.json()
            return MarketContext(**data)

        except Exception as e:
            print(f"Error fetching from Next.js API: {e}")
            print("Falling back to mock data")
            return self._get_mock_data()

    async def fetch_from_binance(
        self,
        portfolio_state: Optional[PortfolioState] = None
    ) -> MarketContext:
        """
        Fetch market data directly from Binance API

        Args:
            portfolio_state: Current portfolio (if None, uses defaults)

        Returns:
            MarketContext with Binance market data
        """
        # TODO: Implement Binance API calls
        # - GET /api/v3/ticker/price for current prices
        # - GET /api/v3/klines for historical candles (calculate indicators)
        # - GET /api/v3/depth for order book
        # - Need to calculate RSI, Bollinger Bands, SMA/EMA from kline data

        print("⚠️  Binance API connector not yet implemented, using mock data")
        return self._get_mock_data()

    def _get_mock_data(self) -> MarketContext:
        """Generate mock market data for testing"""

        # Mock portfolio state
        portfolio = PortfolioState(
            total_value_usd=10000.00,
            usdt_balance=5000.00,
            btc_balance=0.025,
            btc_value_usd=2250.00,
            ada_balance=3000.00,
            ada_value_usd=2750.00
        )

        # Mock BTC data (oversold scenario)
        btc_current_price = 89500.00
        btc_data = MarketData(
            asset="BTCUSDT",
            current_price=btc_current_price,
            price_change_24h_pct=-5.2,
            price_change_96h_pct=-15.8,
            high_96h=102000.00,
            low_96h=88200.00,
            avg_96h=95100.00,
            indicators=TechnicalIndicators(
                rsi=28.3,
                bb_upper=98500.00,
                bb_middle=92000.00,
                bb_lower=85500.00,
                sma_20=94200.00,
                ema_12=91800.00,
                ema_26=93500.00
            ),
            order_book=OrderBook(
                bids=[
                    OrderBookLevel(price=89450.00, quantity=1.25),
                    OrderBookLevel(price=89400.00, quantity=2.10),
                    OrderBookLevel(price=89350.00, quantity=0.85),
                    OrderBookLevel(price=89300.00, quantity=1.50),
                    OrderBookLevel(price=89250.00, quantity=3.20),
                ],
                asks=[
                    OrderBookLevel(price=89550.00, quantity=0.95),
                    OrderBookLevel(price=89600.00, quantity=1.80),
                    OrderBookLevel(price=89650.00, quantity=2.30),
                    OrderBookLevel(price=89700.00, quantity=1.10),
                    OrderBookLevel(price=89750.00, quantity=2.75),
                ]
            )
        )

        # Mock ADA data (also weak but less oversold)
        ada_current_price = 0.9165
        ada_data = MarketData(
            asset="ADAUSDT",
            current_price=ada_current_price,
            price_change_24h_pct=-3.8,
            price_change_96h_pct=-8.2,
            high_96h=1.0150,
            low_96h=0.9050,
            avg_96h=0.9600,
            indicators=TechnicalIndicators(
                rsi=38.5,
                bb_upper=1.0200,
                bb_middle=0.9600,
                bb_lower=0.9000,
                sma_20=0.9750,
                ema_12=0.9450,
                ema_26=0.9620
            ),
            order_book=OrderBook(
                bids=[
                    OrderBookLevel(price=0.9160, quantity=15000.00),
                    OrderBookLevel(price=0.9155, quantity=22000.00),
                    OrderBookLevel(price=0.9150, quantity=8500.00),
                    OrderBookLevel(price=0.9145, quantity=12000.00),
                    OrderBookLevel(price=0.9140, quantity=28000.00),
                ],
                asks=[
                    OrderBookLevel(price=0.9170, quantity=18000.00),
                    OrderBookLevel(price=0.9175, quantity=10000.00),
                    OrderBookLevel(price=0.9180, quantity=25000.00),
                    OrderBookLevel(price=0.9185, quantity=14000.00),
                    OrderBookLevel(price=0.9190, quantity=32000.00),
                ]
            )
        )

        # Mock open orders
        open_orders = [
            OpenOrder(
                order_id="BTC_LIMIT_1",
                asset="BTCUSDT",
                side="BUY",
                price=87500.00,
                quantity=0.0285,
                time_placed="2025-01-08T10:30:00Z"
            )
        ]

        # Previous plan
        previous_plan = "Accumulating BTC during pullback. Limit orders placed at support levels. Waiting for RSI to reach extreme oversold (<30) for aggressive entry."

        return MarketContext(
            timestamp=datetime.now().isoformat(),
            portfolio=portfolio,
            btc_data=btc_data,
            ada_data=ada_data,
            open_orders=open_orders,
            previous_plan=previous_plan,
            recent_trades=None  # Optional field
        )

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# Convenience functions
async def get_production_data(use_mock: bool = True) -> MarketContext:
    """
    Get market context from production system

    Args:
        use_mock: Whether to use mock data (default True for testing)

    Returns:
        MarketContext with current market state
    """
    connector = ProductionDataConnector(use_mock=use_mock)
    try:
        return await connector.get_market_context()
    finally:
        await connector.close()


async def get_mock_market_context() -> MarketContext:
    """Quick function to get mock market data for testing"""
    connector = ProductionDataConnector(use_mock=True)
    return connector._get_mock_data()
