// DCA Simple Dashboard - Auto-refresh logic
// Inspired by Trade Wars dashboard pattern

let refreshInterval = null;
const REFRESH_RATE = 30000; // 30 seconds

// Format currency
function formatCurrency(value) {
    return `€${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Format percentage
function formatPercent(value) {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}

// Format date/time
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show loading state
function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('error').classList.add('hidden');
    document.getElementById('content').classList.add('hidden');
}

// Show error state
function showError(message) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('content').classList.add('hidden');
    document.getElementById('error-message').textContent = message;
}

// Show content
function showContent() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
    document.getElementById('content').classList.remove('hidden');
}

// Update last updated timestamp
function updateLastUpdated() {
    const now = new Date();
    document.getElementById('last-updated').textContent =
        `Updated at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
}

// Load portfolio data
async function loadPortfolio() {
    try {
        const response = await fetch('/api/portfolio');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        const { portfolio, prices } = data;

        // Update portfolio summary
        document.getElementById('total-value').textContent = formatCurrency(portfolio.total_value);

        // Calculate P&L and ROI using net invested (accounts for sells)
        const netInvested = await getTotalInvested();  // Returns net_invested from API
        const pnl = portfolio.total_value - netInvested;
        const roi = netInvested > 0 ? (pnl / netInvested) * 100 : 0;

        const pnlElement = document.getElementById('total-pnl');
        pnlElement.textContent = formatCurrency(pnl);
        pnlElement.className = `text-4xl font-bold mono ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`;

        const roiElement = document.getElementById('roi');
        roiElement.textContent = formatPercent(roi);
        roiElement.className = `text-4xl font-bold mono ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`;

        // Update holdings
        const totalValue = portfolio.total_value;

        // EUR
        document.getElementById('eur-balance').textContent = portfolio.total_eur.toFixed(2);
        document.getElementById('eur-value').textContent = formatCurrency(portfolio.total_eur);
        document.getElementById('eur-percent').textContent =
            `${((portfolio.total_eur / totalValue) * 100).toFixed(1)}%`;

        // BTC
        document.getElementById('btc-balance').textContent = portfolio.btc_balance.toFixed(8);
        document.getElementById('btc-value').textContent = formatCurrency(portfolio.btc_value_eur);
        document.getElementById('btc-percent').textContent =
            `${((portfolio.btc_value_eur / totalValue) * 100).toFixed(1)}%`;

        // ADA
        document.getElementById('ada-balance').textContent = portfolio.ada_balance.toFixed(2);
        document.getElementById('ada-value').textContent = formatCurrency(portfolio.ada_value_eur);
        document.getElementById('ada-percent').textContent =
            `${((portfolio.ada_value_eur / totalValue) * 100).toFixed(1)}%`;

        // Update market conditions
        document.getElementById('btc-price').textContent = formatCurrency(prices.btc);
        document.getElementById('ada-price').textContent = formatCurrency(prices.ada);
        document.getElementById('btc-rsi').textContent = data.market.btc_rsi.toFixed(1);
        document.getElementById('ada-rsi').textContent = data.market.ada_rsi.toFixed(1);

        const fearGreed = data.market.fear_greed;
        const fearGreedElement = document.getElementById('fear-greed');
        fearGreedElement.textContent = `${fearGreed} (${getFearGreedLabel(fearGreed)})`;
        fearGreedElement.className = `font-semibold mono ${getFearGreedColor(fearGreed)}`;

        return true;
    } catch (error) {
        console.error('Error loading portfolio:', error);
        throw error;
    }
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        const { stats } = data;

        document.getElementById('total-buys').textContent = stats.total_buys;
        document.getElementById('total-invested').textContent = formatCurrency(stats.total_invested);
        document.getElementById('avg-btc-price').textContent =
            stats.avg_btc_price > 0 ? formatCurrency(stats.avg_btc_price) : '—';
        document.getElementById('avg-ada-price').textContent =
            stats.avg_ada_price > 0 ? formatCurrency(stats.avg_ada_price) : '—';

        return stats.net_invested;  // Use net_invested for accurate PnL (accounts for sells)
    } catch (error) {
        console.error('Error loading stats:', error);
        throw error;
    }
}

// Load purchase history
async function loadHistory() {
    try {
        const response = await fetch('/api/history');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        const { purchases } = data;
        const container = document.getElementById('recent-purchases');
        const noData = document.getElementById('no-purchases');

        if (purchases.length === 0) {
            container.innerHTML = '';
            noData.classList.remove('hidden');
            return;
        }

        noData.classList.add('hidden');
        container.innerHTML = purchases.map(purchase => {
            const assetColor = purchase.asset === 'BTC' ? 'orange' : 'blue';
            return `
                <div class="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div class="flex items-center space-x-3">
                        <div class="w-2 h-2 bg-${assetColor}-500 rounded-full"></div>
                        <div>
                            <div class="font-semibold text-gray-900">${purchase.asset}</div>
                            <div class="text-sm text-gray-500">${formatTimestamp(purchase.timestamp)}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold mono text-gray-900">${formatCurrency(purchase.amount_eur)}</div>
                        <div class="text-sm text-gray-500">@ ${formatCurrency(purchase.price)}</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading history:', error);
        throw error;
    }
}

// Helper: Get net invested amount (total invested - total sold)
// Cached from stats API for PnL calculation
let cachedTotalInvested = 0;
async function getTotalInvested() {
    return cachedTotalInvested;  // Returns net_invested (accounts for sells)
}

// Helper: Get Fear & Greed label
function getFearGreedLabel(value) {
    if (value <= 25) return 'Extreme Fear';
    if (value <= 45) return 'Fear';
    if (value <= 55) return 'Neutral';
    if (value <= 75) return 'Greed';
    return 'Extreme Greed';
}

// Helper: Get Fear & Greed color
function getFearGreedColor(value) {
    if (value <= 25) return 'text-red-600';
    if (value <= 45) return 'text-orange-600';
    if (value <= 55) return 'text-gray-600';
    if (value <= 75) return 'text-green-600';
    return 'text-green-700';
}

// Main dashboard loader
async function loadDashboard() {
    try {
        showLoading();

        // Load all data in parallel
        const statsPromise = loadStats();
        const portfolioPromise = loadPortfolio();
        const historyPromise = loadHistory();

        cachedTotalInvested = await statsPromise;
        await Promise.all([portfolioPromise, historyPromise]);

        showContent();
        updateLastUpdated();
    } catch (error) {
        console.error('Dashboard load error:', error);
        showError(error.message || 'Failed to load dashboard data');
    }
}

// Auto-refresh setup (Trade Wars pattern)
function startAutoRefresh() {
    // Clear existing interval
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }

    // Refresh every 30 seconds
    refreshInterval = setInterval(() => {
        console.log('Auto-refreshing dashboard...');
        loadDashboard();
    }, REFRESH_RATE);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    startAutoRefresh();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});
