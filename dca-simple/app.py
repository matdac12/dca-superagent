"""
DCA Simple - Flask Dashboard
Minimal dashboard to view portfolio status and recent DCA purchases
"""
from flask import Flask, render_template, jsonify
from datetime import datetime
from pathlib import Path
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import DCA modules
from binance_integration import BinanceMarketData
import config

app = Flask(__name__)


@app.route('/')
def index():
    """Main dashboard page"""
    return render_template('index.html')


@app.route('/api/portfolio')
def get_portfolio():
    """Get current portfolio data from Binance"""
    try:
        binance = BinanceMarketData(testnet=config.BINANCE_TESTNET)
        intelligence = binance.get_complete_market_intelligence()

        # Extract relevant data
        portfolio = intelligence['portfolio']
        btc = intelligence['btc']
        ada = intelligence['ada']

        return jsonify({
            'success': True,
            'timestamp': datetime.now().isoformat(),
            'portfolio': {
                'total_eur': portfolio['eur']['free'],
                'btc_balance': portfolio['btc']['free'],
                'btc_value_eur': portfolio['btc']['value_usd'],
                'ada_balance': portfolio['ada']['free'],
                'ada_value_eur': portfolio['ada']['value_usd'],
                'total_value': portfolio['total_value_usd']
            },
            'prices': {
                'btc': btc['price'],
                'ada': ada['price']
            },
            'market': {
                'btc_rsi': btc['indicators']['rsi'],
                'ada_rsi': ada['indicators']['rsi'],
                'fear_greed': intelligence.get('fear_greed', 50)
            }
        })
    except Exception as e:
        import traceback
        print(f"ERROR in /api/portfolio: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/history')
def get_history():
    """Get recent purchase history from actual Binance trades"""
    try:
        binance = BinanceMarketData(testnet=config.BINANCE_TESTNET)

        # Get actual trades from Binance
        trades = binance.get_trade_history()

        # Convert to purchases format (filter only BUYs, newest first)
        purchases = []
        for trade in trades:
            if trade['side'] == 'BUY':
                # Extract asset from symbol (e.g., BTCEUR -> BTC)
                asset = trade['symbol'].replace('EUR', '').replace('USDT', '')

                purchases.append({
                    'timestamp': trade['timestamp'],
                    'asset': asset,
                    'amount_eur': trade['quote_quantity'],  # Actual EUR spent
                    'price': trade['price'],
                    'quantity': trade['quantity'],  # Amount of crypto purchased
                    'source': 'binance',  # Mark as real trade
                    'order_id': trade['order_id']
                })

        # Sort by timestamp (newest first)
        purchases.sort(key=lambda x: x['timestamp'], reverse=True)

        return jsonify({
            'success': True,
            'purchases': purchases[:20]  # Return last 20 purchases
        })
    except Exception as e:
        import traceback
        print(f"ERROR in /api/history: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/stats')
def get_stats():
    """Calculate performance statistics from actual Binance trade history"""
    try:
        binance = BinanceMarketData(testnet=config.BINANCE_TESTNET)

        # Get cost basis (includes trades, avoiding duplicate API call)
        cost_basis = binance.calculate_cost_basis()
        trades = cost_basis['trades']

        # Calculate VWAP (Volume-Weighted Average Price) for BUY trades
        # VWAP = sum(price * quantity) / sum(quantity)
        btc_total_cost = 0
        btc_total_quantity = 0
        ada_total_cost = 0
        ada_total_quantity = 0

        for trade in trades:
            if trade['side'] == 'BUY':
                if 'BTC' in trade['symbol']:
                    btc_total_cost += trade['price'] * trade['quantity']
                    btc_total_quantity += trade['quantity']
                elif 'ADA' in trade['symbol']:
                    ada_total_cost += trade['price'] * trade['quantity']
                    ada_total_quantity += trade['quantity']

        # Calculate VWAP
        vwap_btc = btc_total_cost / btc_total_quantity if btc_total_quantity > 0 else 0
        vwap_ada = ada_total_cost / ada_total_quantity if ada_total_quantity > 0 else 0

        return jsonify({
            'success': True,
            'stats': {
                'total_buys': cost_basis['total_buy_trades'],  # Count only BUY trades
                'total_invested': cost_basis['total_invested'],  # Total EUR spent on buys
                'net_invested': cost_basis['net_invested'],      # Invested - sold
                'total_sold': cost_basis['total_sold'],          # Total EUR from sells
                'btc_purchases': cost_basis['btc_trades'],
                'ada_purchases': cost_basis['ada_trades'],
                'avg_btc_price': round(vwap_btc, 2),  # VWAP instead of simple mean
                'avg_ada_price': round(vwap_ada, 4),  # VWAP instead of simple mean
                # Additional insights
                'btc_invested': cost_basis['btc_invested'],
                'ada_invested': cost_basis['ada_invested']
            }
        })
    except Exception as e:
        import traceback
        print(f"ERROR in /api/stats: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    # For local development (port 5001 to avoid macOS AirPlay on 5000)
    app.run(debug=True, host='0.0.0.0', port=5001)
