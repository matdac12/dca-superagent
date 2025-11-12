"""
Binance Market Data Integration

Fetches real-time portfolio balances, market prices, technical indicators,
order book data, and open orders from Binance (testnet or production).
"""
import os
from typing import Dict, List, Optional
from datetime import datetime
from binance.client import Client
from binance.exceptions import BinanceAPIException
import pandas as pd
import ta
from loguru import logger


class BinanceMarketData:
    """Fetch complete market intelligence from Binance"""

    def __init__(self, testnet: bool = True):
        """
        Initialize Binance client

        Args:
            testnet: If True, use Binance testnet. If False, use production.
        """
        self.testnet = testnet

        # Initialize client
        self.client = Client(
            api_key=os.getenv('BINANCE_API_KEY'),
            api_secret=os.getenv('BINANCE_API_SECRET'),
            testnet=testnet
        )

        logger.info(f"Initialized Binance client (testnet={testnet})")

    def get_portfolio_balances(self) -> Dict:
        """
        Fetch current portfolio balances for EUR, BTC, ADA

        Returns:
            {
                'EUR': {'free': float, 'locked': float, 'total': float},
                'BTC': {...},
                'ADA': {...}
            }
        """
        try:
            account = self.client.get_account()
            balances = {}

            for asset in ['EUR', 'BTC', 'ADA']:
                balance = next((b for b in account['balances'] if b['asset'] == asset), None)
                if balance:
                    free = float(balance['free'])
                    locked = float(balance['locked'])
                    balances[asset] = {
                        'free': free,
                        'locked': locked,
                        'total': free + locked
                    }
                else:
                    balances[asset] = {'free': 0.0, 'locked': 0.0, 'total': 0.0}

            logger.info(f"Fetched balances: EUR={balances['EUR']['total']:.2f}, "
                       f"BTC={balances['BTC']['total']:.8f}, ADA={balances['ADA']['total']:.2f}")

            return balances

        except BinanceAPIException as e:
            logger.error(f"Failed to fetch balances: {e}")
            raise

    def get_ticker_24h(self, symbol: str) -> Dict:
        """
        Fetch 24-hour ticker statistics

        Args:
            symbol: Trading pair (e.g., 'BTCUSDT', 'ADAUSDT')

        Returns:
            {
                'price': float,
                'change_24h': float,  # percentage
                'volume_24h': float,
                'high_24h': float,
                'low_24h': float
            }
        """
        try:
            ticker = self.client.get_ticker(symbol=symbol)

            data = {
                'price': float(ticker['lastPrice']),
                'change_24h': float(ticker['priceChangePercent']),
                'volume_24h': float(ticker['volume']),
                'high_24h': float(ticker['highPrice']),
                'low_24h': float(ticker['lowPrice'])
            }

            logger.debug(f"{symbol}: ${data['price']:,.2f} ({data['change_24h']:+.2f}%)")

            return data

        except BinanceAPIException as e:
            logger.error(f"Failed to fetch ticker for {symbol}: {e}")
            raise

    def get_klines(self, symbol: str, interval: str = '4h', limit: int = 24) -> pd.DataFrame:
        """
        Fetch candlestick (kline) data

        Args:
            symbol: Trading pair (e.g., 'BTCUSDT')
            interval: Kline interval (default: '4h' = 4 hours)
            limit: Number of candles to fetch (default: 24 = 96 hours)

        Returns:
            DataFrame with columns: timestamp, open, high, low, close, volume
        """
        try:
            klines = self.client.get_klines(
                symbol=symbol,
                interval=interval,
                limit=limit
            )

            logger.debug(f"Received {len(klines)} raw klines from Binance for {symbol}")

            # Convert to DataFrame
            df = pd.DataFrame(klines, columns=[
                'timestamp', 'open', 'high', 'low', 'close', 'volume',
                'close_time', 'quote_volume', 'trades', 'taker_buy_base',
                'taker_buy_quote', 'ignore'
            ])

            # Convert timestamp to datetime
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')

            # Convert price/volume columns to float
            for col in ['open', 'high', 'low', 'close', 'volume']:
                df[col] = df[col].astype(float)

            # Keep only essential columns
            df = df[['timestamp', 'open', 'high', 'low', 'close', 'volume']]

            # Drop any duplicate timestamps (shouldn't happen but just in case)
            original_len = len(df)
            df = df.drop_duplicates(subset=['timestamp'])
            if len(df) < original_len:
                logger.warning(f"Dropped {original_len - len(df)} duplicate timestamps")

            logger.debug(f"Fetched {len(df)} klines for {symbol} ({interval})")

            return df

        except BinanceAPIException as e:
            logger.error(f"Failed to fetch klines for {symbol}: {e}")
            raise

    def calculate_technical_indicators(self, df: pd.DataFrame) -> Dict:
        """
        Calculate technical indicators from kline data

        Args:
            df: DataFrame with OHLCV data

        Returns:
            {
                'rsi': float,
                'rsi_signal': str,  # 'oversold', 'neutral', 'overbought'
                'bb_upper': float,
                'bb_middle': float,
                'bb_lower': float,
                'bb_position': float,  # % position between bands (0-100)
                'macd': float,
                'macd_signal': float,
                'macd_histogram': float,
                'ema_20': float,
                'ema_50': float,
                'atr': float,
                'adx': float
            }
        """
        try:
            # Check if we have enough data
            if len(df) < 14:
                logger.warning(f"Insufficient data for indicators: {len(df)} candles (need at least 14)")
                # Return default neutral values
                return {
                    'rsi': 50.0,
                    'rsi_signal': 'neutral',
                    'bb_upper': df['high'].max(),
                    'bb_middle': df['close'].mean(),
                    'bb_lower': df['low'].min(),
                    'bb_position': 50.0,
                    'macd': 0.0,
                    'macd_signal': 0.0,
                    'macd_histogram': 0.0,
                    'ema_20': df['close'].mean(),
                    'ema_50': df['close'].mean(),
                    'atr': (df['high'] - df['low']).mean(),
                    'adx': 25.0
                }

            close = df['close']
            high = df['high']
            low = df['low']

            # RSI (14 periods)
            rsi = ta.momentum.RSIIndicator(close, window=14).rsi().iloc[-1]

            # Determine RSI signal
            if rsi < 30:
                rsi_signal = 'oversold'
            elif rsi > 70:
                rsi_signal = 'overbought'
            else:
                rsi_signal = 'neutral'

            # Bollinger Bands (20 periods, 2 std dev)
            bb = ta.volatility.BollingerBands(close, window=20, window_dev=2)
            bb_upper = bb.bollinger_hband().iloc[-1]
            bb_middle = bb.bollinger_mavg().iloc[-1]
            bb_lower = bb.bollinger_lband().iloc[-1]

            # Current price position within bands (0-100%)
            current_price = close.iloc[-1]
            bb_position = ((current_price - bb_lower) / (bb_upper - bb_lower)) * 100 if bb_upper != bb_lower else 50

            # MACD (12, 26, 9)
            macd = ta.trend.MACD(close, window_slow=26, window_fast=12, window_sign=9)
            macd_line = macd.macd().iloc[-1]
            macd_signal_line = macd.macd_signal().iloc[-1]
            macd_histogram = macd.macd_diff().iloc[-1]

            # EMA (Exponential Moving Averages)
            ema_20 = ta.trend.EMAIndicator(close, window=20).ema_indicator().iloc[-1]
            ema_50 = ta.trend.EMAIndicator(close, window=50).ema_indicator().iloc[-1] if len(close) >= 50 else ema_20

            # ATR (Average True Range - volatility)
            atr = ta.volatility.AverageTrueRange(high, low, close, window=14).average_true_range().iloc[-1]

            # ADX (Average Directional Index - trend strength)
            adx = ta.trend.ADXIndicator(high, low, close, window=14).adx().iloc[-1]

            indicators = {
                'rsi': round(rsi, 2),
                'rsi_signal': rsi_signal,
                'bb_upper': round(bb_upper, 2),
                'bb_middle': round(bb_middle, 2),
                'bb_lower': round(bb_lower, 2),
                'bb_position': round(bb_position, 2),
                'macd': round(macd_line, 4),
                'macd_signal': round(macd_signal_line, 4),
                'macd_histogram': round(macd_histogram, 4),
                'ema_20': round(ema_20, 2),
                'ema_50': round(ema_50, 2),
                'atr': round(atr, 2),
                'adx': round(adx, 2)
            }

            logger.debug(f"Calculated indicators: RSI={indicators['rsi']:.1f} ({rsi_signal}), "
                        f"BB_position={indicators['bb_position']:.1f}%")

            return indicators

        except Exception as e:
            logger.error(f"Failed to calculate indicators: {e}")
            raise

    def get_order_book(self, symbol: str, limit: int = 20) -> Dict:
        """
        Fetch order book with support/resistance analysis

        Args:
            symbol: Trading pair (e.g., 'BTCUSDT')
            limit: Number of bid/ask levels to fetch

        Returns:
            {
                'bids': [(price, quantity), ...],
                'asks': [(price, quantity), ...],
                'bid_liquidity': float,  # Total bid volume
                'ask_liquidity': float,  # Total ask volume
                'spread': float,  # Best bid-ask spread
                'spread_pct': float  # Spread as percentage
            }
        """
        try:
            depth = self.client.get_order_book(symbol=symbol, limit=limit)

            # Parse bids and asks
            bids = [(float(bid[0]), float(bid[1])) for bid in depth['bids']]
            asks = [(float(ask[0]), float(ask[1])) for ask in depth['asks']]

            # Calculate liquidity
            bid_liquidity = sum(price * qty for price, qty in bids)
            ask_liquidity = sum(price * qty for price, qty in asks)

            # Calculate spread
            best_bid = bids[0][0] if bids else 0
            best_ask = asks[0][0] if asks else 0
            spread = best_ask - best_bid
            spread_pct = (spread / best_bid * 100) if best_bid > 0 else 0

            data = {
                'bids': bids[:10],  # Top 10 levels
                'asks': asks[:10],
                'bid_liquidity': round(bid_liquidity, 2),
                'ask_liquidity': round(ask_liquidity, 2),
                'spread': round(spread, 2),
                'spread_pct': round(spread_pct, 4)
            }

            logger.debug(f"{symbol} order book: spread={spread_pct:.3f}%, "
                        f"bid_liq=${bid_liquidity:,.0f}, ask_liq=${ask_liquidity:,.0f}")

            return data

        except BinanceAPIException as e:
            logger.error(f"Failed to fetch order book for {symbol}: {e}")
            raise

    def get_open_orders(self, symbol: Optional[str] = None) -> List[Dict]:
        """
        Fetch all open orders (or for specific symbol)

        Args:
            symbol: Optional trading pair to filter by

        Returns:
            List of order dictionaries with essential fields
        """
        try:
            orders = self.client.get_open_orders(symbol=symbol)

            parsed_orders = []
            for order in orders:
                parsed_orders.append({
                    'order_id': order['orderId'],
                    'symbol': order['symbol'],
                    'side': order['side'],  # BUY or SELL
                    'type': order['type'],  # LIMIT, MARKET, etc.
                    'price': float(order['price']),
                    'quantity': float(order['origQty']),
                    'filled': float(order['executedQty']),
                    'status': order['status'],
                    'time': datetime.fromtimestamp(order['time'] / 1000).isoformat()
                })

            logger.info(f"Found {len(parsed_orders)} open orders" +
                       (f" for {symbol}" if symbol else ""))

            return parsed_orders

        except BinanceAPIException as e:
            logger.error(f"Failed to fetch open orders: {e}")
            raise

    def get_complete_market_intelligence(self) -> Dict:
        """
        Fetch ALL market data in one call

        Returns comprehensive market intelligence including:
        - Portfolio balances
        - BTC and ADA market data (prices, indicators, order books)
        - Open orders
        """
        logger.info("🔍 Fetching complete market intelligence from Binance...")

        try:
            # Portfolio balances
            balances = self.get_portfolio_balances()

            # BTC data
            logger.info("Fetching BTC market data...")
            btc_ticker = self.get_ticker_24h('BTCEUR')
            # Use 1h interval to get more historical data (testnet has limited 4h data)
            # On testnet: 1h gives ~74 candles, 4h only gives ~19
            # On production: both will have full history
            btc_klines = self.get_klines('BTCEUR', interval='1h', limit=500)
            btc_indicators = self.calculate_technical_indicators(btc_klines)
            btc_order_book = self.get_order_book('BTCEUR', limit=20)

            # ADA data
            logger.info("Fetching ADA market data...")
            ada_ticker = self.get_ticker_24h('ADAEUR')
            ada_klines = self.get_klines('ADAEUR', interval='1h', limit=500)
            ada_indicators = self.calculate_technical_indicators(ada_klines)
            ada_order_book = self.get_order_book('ADAEUR', limit=20)

            # Open orders
            open_orders = self.get_open_orders()

            # Calculate portfolio values
            btc_value_usd = balances['BTC']['total'] * btc_ticker['price']
            ada_value_usd = balances['ADA']['total'] * ada_ticker['price']
            total_value_usd = balances['EUR']['total'] + btc_value_usd + ada_value_usd

            # Assemble complete intelligence
            intelligence = {
                'timestamp': datetime.now().isoformat(),
                'testnet': self.testnet,
                'portfolio': {
                    'total_value_usd': round(total_value_usd, 2),
                    'eur': balances['EUR'],
                    'btc': {
                        **balances['BTC'],
                        'value_usd': round(btc_value_usd, 2)
                    },
                    'ada': {
                        **balances['ADA'],
                        'value_usd': round(ada_value_usd, 2)
                    }
                },
                'btc': {
                    'symbol': 'BTCEUR',
                    **btc_ticker,
                    'indicators': btc_indicators,
                    'order_book': btc_order_book
                },
                'ada': {
                    'symbol': 'ADAEUR',
                    **ada_ticker,
                    'indicators': ada_indicators,
                    'order_book': ada_order_book
                },
                'open_orders': open_orders,
                'open_orders_count': len(open_orders)
            }

            logger.info(f"✓ Market intelligence fetched successfully")
            logger.info(f"  Portfolio: €{total_value_usd:,.2f} "
                       f"(EUR: €{balances['EUR']['total']:,.2f}, "
                       f"BTC: €{btc_value_usd:,.2f}, "
                       f"ADA: €{ada_value_usd:,.2f})")
            logger.info(f"  BTC: ${btc_ticker['price']:,.2f} (RSI: {btc_indicators['rsi']:.1f})")
            logger.info(f"  ADA: ${ada_ticker['price']:.4f} (RSI: {ada_indicators['rsi']:.1f})")
            logger.info(f"  Open orders: {len(open_orders)}")

            return intelligence

        except Exception as e:
            logger.error(f"Failed to fetch market intelligence: {e}")
            raise


if __name__ == '__main__':
    """Quick test of Binance integration"""
    from dotenv import load_dotenv
    load_dotenv()

    # Test with testnet
    market = BinanceMarketData(testnet=True)

    try:
        intelligence = market.get_complete_market_intelligence()

        print("\n" + "="*80)
        print("MARKET INTELLIGENCE TEST")
        print("="*80)
        print(f"\nPortfolio Value: ${intelligence['portfolio']['total_value_usd']:,.2f}")
        print(f"BTC: ${intelligence['btc']['price']:,.2f} (RSI: {intelligence['btc']['indicators']['rsi']:.1f})")
        print(f"ADA: ${intelligence['ada']['price']:.4f} (RSI: {intelligence['ada']['indicators']['rsi']:.1f})")
        print(f"Open Orders: {intelligence['open_orders_count']}")
        print("\n✅ Binance integration working correctly!\n")

    except Exception as e:
        print(f"\n❌ Test failed: {e}\n")
