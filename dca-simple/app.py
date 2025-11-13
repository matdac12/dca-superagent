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
    """Get recent DCA purchase history from execution logs"""
    try:
        execution_dir = Path(__file__).parent / 'logs' / 'executions'

        if not execution_dir.exists():
            return jsonify({
                'success': True,
                'purchases': []
            })

        # Get all execution log files, sorted by date (newest first)
        log_files = sorted(
            execution_dir.glob('*.json'),
            key=lambda x: x.stat().st_mtime,
            reverse=True
        )

        purchases = []
        for log_file in log_files[:20]:  # Last 20 sessions
            try:
                with open(log_file, 'r') as f:
                    session = json.load(f)

                # Only include BUY sessions from EUR trading (skip old USDT logs)
                if session.get('session_type') == 'BUY' and 'eur_balance' in session:
                    decision = session.get('decision', {})
                    btc_amount = decision.get('btc_amount', 0)
                    ada_amount = decision.get('ada_amount', 0)

                    # Add BTC purchase if any
                    if btc_amount >= config.MIN_ORDER_SIZE:
                        purchases.append({
                            'timestamp': session['timestamp'],
                            'asset': 'BTC',
                            'amount_eur': btc_amount,
                            'price': session.get('btc_price', 0),
                            'confidence': decision.get('confidence', 0)
                        })

                    # Add ADA purchase if any
                    if ada_amount >= config.MIN_ORDER_SIZE:
                        purchases.append({
                            'timestamp': session['timestamp'],
                            'asset': 'ADA',
                            'amount_eur': ada_amount,
                            'price': session.get('ada_price', 0),
                            'confidence': decision.get('confidence', 0)
                        })
            except Exception as e:
                # Skip corrupted log files
                continue

        # Sort by timestamp (newest first)
        purchases.sort(key=lambda x: x['timestamp'], reverse=True)

        return jsonify({
            'success': True,
            'purchases': purchases[:10]  # Return last 10 purchases
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/stats')
def get_stats():
    """Calculate performance statistics from execution logs"""
    try:
        execution_dir = Path(__file__).parent / 'logs' / 'executions'

        if not execution_dir.exists():
            return jsonify({
                'success': True,
                'stats': {
                    'total_buys': 0,
                    'total_invested': 0,
                    'btc_purchases': 0,
                    'ada_purchases': 0,
                    'avg_btc_price': 0,
                    'avg_ada_price': 0
                }
            })

        # Process all execution logs
        log_files = list(execution_dir.glob('*.json'))

        total_buys = 0
        total_invested = 0
        btc_purchases = []
        ada_purchases = []

        for log_file in log_files:
            try:
                with open(log_file, 'r') as f:
                    session = json.load(f)

                # Only include EUR trading (skip old USDT logs)
                if session.get('session_type') == 'BUY' and 'eur_balance' in session:
                    decision = session.get('decision', {})
                    btc_amount = decision.get('btc_amount', 0)
                    ada_amount = decision.get('ada_amount', 0)

                    if btc_amount >= config.MIN_ORDER_SIZE:
                        total_buys += 1
                        total_invested += btc_amount
                        btc_purchases.append(session.get('btc_price', 0))

                    if ada_amount >= config.MIN_ORDER_SIZE:
                        total_buys += 1
                        total_invested += ada_amount
                        ada_purchases.append(session.get('ada_price', 0))
            except Exception:
                continue

        return jsonify({
            'success': True,
            'stats': {
                'total_buys': total_buys,
                'total_invested': round(total_invested, 2),
                'btc_purchases': len(btc_purchases),
                'ada_purchases': len(ada_purchases),
                'avg_btc_price': round(sum(btc_purchases) / len(btc_purchases), 2) if btc_purchases else 0,
                'avg_ada_price': round(sum(ada_purchases) / len(ada_purchases), 4) if ada_purchases else 0
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    # For local development (port 5001 to avoid macOS AirPlay on 5000)
    app.run(debug=True, host='0.0.0.0', port=5001)
