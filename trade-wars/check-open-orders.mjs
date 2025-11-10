#!/usr/bin/env node
/**
 * Check Open Orders Script
 * Shows all open orders for each agent and optionally cancels them
 */

import { Spot } from '@binance/connector';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const AGENTS = [
  {
    name: 'openai',
    apiKey: process.env.BINANCE_API_KEY,
    secretKey: process.env.BINANCE_SECRET_KEY,
  },
  {
    name: 'grok',
    apiKey: process.env.BINANCE_API_KEY,
    secretKey: process.env.BINANCE_SECRET_KEY,
  },
  {
    name: 'gemini',
    apiKey: process.env.BINANCE_API_KEY,
    secretKey: process.env.BINANCE_SECRET_KEY,
  },
  {
    name: 'council',
    apiKey: process.env.BINANCE_API_KEY,
    secretKey: process.env.BINANCE_SECRET_KEY,
  },
];

const BINANCE_BASE_URL = process.env.BINANCE_BASE_URL || 'https://testnet.binance.vision';
const CANCEL_ORDERS = process.argv.includes('--cancel');

/**
 * Check open orders for a single agent
 */
async function checkOpenOrders(agent) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Agent: ${agent.name.toUpperCase()}`);
  console.log(`${'='.repeat(60)}`);

  if (!agent.apiKey || !agent.secretKey) {
    console.log(`  ⚠️  Missing credentials, skipping...`);
    return [];
  }

  try {
    const client = new Spot(agent.apiKey, agent.secretKey, {
      baseURL: BINANCE_BASE_URL
    });

    // Get open orders for BTCUSDT
    const response = await client.openOrders('BTCUSDT');
    const orders = response.data;

    if (!orders || orders.length === 0) {
      console.log('  ✅ No open orders');
      return [];
    }

    console.log(`  📋 Found ${orders.length} open order(s):\n`);

    orders.forEach((order, index) => {
      console.log(`  Order #${index + 1}:`);
      console.log(`    Order ID: ${order.orderId}`);
      console.log(`    Symbol: ${order.symbol}`);
      console.log(`    Side: ${order.side}`);
      console.log(`    Type: ${order.type}`);
      console.log(`    Price: ${order.price}`);
      console.log(`    Quantity: ${order.origQty}`);
      console.log(`    Status: ${order.status}`);
      console.log(`    Time: ${new Date(order.time).toISOString()}`);
      console.log();
    });

    return orders;

  } catch (error) {
    console.error(`  ❌ Error fetching orders:`, error.message);
    if (error.response?.data) {
      console.error(`     API Error:`, error.response.data);
    }
    return [];
  }
}

/**
 * Cancel an open order
 */
async function cancelOrder(agent, orderId, symbol = 'BTCUSDT') {
  try {
    const client = new Spot(agent.apiKey, agent.secretKey, {
      baseURL: BINANCE_BASE_URL
    });

    const response = await client.cancelOrder(symbol, {
      orderId: orderId
    });

    console.log(`    ✅ Cancelled order ${orderId}`);
    return true;

  } catch (error) {
    console.error(`    ❌ Failed to cancel order ${orderId}:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 CHECKING OPEN ORDERS ACROSS ALL AGENTS');
  console.log('═'.repeat(60));

  const allOrders = {};

  // Check orders for all agents
  for (const agent of AGENTS) {
    const orders = await checkOpenOrders(agent);
    allOrders[agent.name] = orders;
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(60));

  let totalOrders = 0;
  for (const agent of AGENTS) {
    const orderCount = allOrders[agent.name]?.length || 0;
    totalOrders += orderCount;
    const status = orderCount === 0 ? '✅' : '⚠️';
    console.log(`${status} ${agent.name.padEnd(10)}: ${orderCount} open order(s)`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`Total: ${totalOrders} open order(s) across all agents`);
  console.log('═'.repeat(60));

  // Cancel orders if requested
  if (CANCEL_ORDERS && totalOrders > 0) {
    console.log('\n❗ CANCELLING ALL OPEN ORDERS...\n');

    for (const agent of AGENTS) {
      const orders = allOrders[agent.name] || [];
      if (orders.length > 0) {
        console.log(`  Cancelling ${orders.length} order(s) for ${agent.name}:`);
        for (const order of orders) {
          await cancelOrder(agent, order.orderId, order.symbol);
        }
      }
    }

    console.log('\n✅ All orders cancelled!');
  } else if (totalOrders > 0) {
    console.log('\n💡 TIP: Run with --cancel flag to cancel all open orders');
    console.log('   Example: node check-open-orders.mjs --cancel');
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
