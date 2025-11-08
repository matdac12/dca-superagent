import { TradeRecord, Action } from '@/types/trading';

export interface FormattedTradeHistory {
  entries: string[];
  summary: string;
  plan: string;
  planLastUpdated: string | null;
}

function formatTimeAgo(timestamp: string): string {
  const tradeTime = new Date(timestamp).getTime();
  if (Number.isNaN(tradeTime)) {
    return 'unknown time';
  }

  const now = Date.now();
  const diffMs = Math.max(0, now - tradeTime);
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function computePnl(entryPrice: number, currentPrice: number, quantity: number, action: 'BUY' | 'SELL') {
  const direction = action === 'SELL' ? -1 : 1;
  const priceDiff = (currentPrice - entryPrice) * direction;
  const value = priceDiff * quantity;
  const percent = entryPrice > 0 ? (priceDiff / entryPrice) * 100 : 0;
  return { value, percent };
}

export function formatTradeHistory(trades: TradeRecord[], currentPrice: number): FormattedTradeHistory {
  if (!trades || trades.length === 0) {
    return {
      entries: ['No trade history available.'],
      summary: 'No trades have been executed yet.',
      plan: trades[0]?.plan ?? '',
      planLastUpdated: trades[0]?.timestamp ?? null,
    };
  }

  const entries = trades.map(trade => {
    const timeAgo = formatTimeAgo(trade.timestamp);
    const executed = trade.executedOrder;
    const primaryAction = extractPrimaryAction(trade.decision.actions);
    const direction = inferDirection(trade, primaryAction);

    if (!executed) {
      return `${timeAgo}: ${direction ?? 'HOLD'} (no fill reported)`;
    }

    const orderType = executed.orderType ?? inferOrderType(primaryAction);
    const quantity = executed.quantity ?? primaryAction?.quantity ?? 0;
    const limitPrice = executed.limitPrice ?? primaryAction?.price;
    const requestedLabel = limitPrice ? `$${limitPrice.toFixed(2)}` : 'market price';
    const fillPrice = executed.executedPrice;
    const signedQuantity = `${direction === 'SELL' ? '-' : '+'}${quantity.toFixed(4)} BTC`;
    const pnl = direction ? computePnl(fillPrice, currentPrice, quantity, direction) : { value: 0, percent: 0 };
    const pnlText = `${pnl.value >= 0 ? '+' : '-'}$${Math.abs(pnl.value).toFixed(2)} P&L`;
    const priceImprovement = extractPriceImprovement(executed.priceImprovement, limitPrice, fillPrice, orderType);

    return `${timeAgo}: ${direction ?? 'TRADE'} ${orderType} @ ${requestedLabel} | Filled @ $${fillPrice.toFixed(2)} | ${signedQuantity} | ${pnlText}${priceImprovement}`;
  });

  const lastTrade = trades[0];
  const summaryAction = inferDirection(lastTrade, extractPrimaryAction(lastTrade.decision.actions)) ?? 'HOLD';
  const summaryTimeAgo = formatTimeAgo(lastTrade.timestamp);
  const summaryExecuted = lastTrade.executedOrder;
  let summaryPnL = '';

  if (summaryExecuted && (summaryAction === 'BUY' || summaryAction === 'SELL')) {
    const pnl = computePnl(summaryExecuted.executedPrice, currentPrice, summaryExecuted.quantity, summaryAction);
    summaryPnL = ` Current mark-to-market: ${pnl.value >= 0 ? '+' : '-'}$${Math.abs(pnl.value).toFixed(2)} (${pnl.percent >= 0 ? '+' : '-'}${Math.abs(pnl.percent).toFixed(2)}%).`;
  }

  const latestPlanRecord = trades.find(trade => trade.plan?.trim());
  const planText = latestPlanRecord?.plan ?? '';
  const planTimestamp = latestPlanRecord?.timestamp ?? null;

  return {
    entries,
    summary: `Last action: ${summaryAction} ${summaryTimeAgo}.${summaryPnL}`,
    plan: planText,
    planLastUpdated: planTimestamp,
  };
}

function extractPrimaryAction(actions?: Action[]): Action | null {
  if (!actions || !actions.length) {
    return null;
  }

  return actions.find(action => action.type.startsWith('PLACE_')) ?? actions[0];
}

function inferDirection(trade: TradeRecord, primaryAction: Action | null): 'BUY' | 'SELL' | null {
  if (primaryAction) {
    if (primaryAction.type.includes('BUY')) {
      return 'BUY';
    }

    if (primaryAction.type.includes('SELL')) {
      return 'SELL';
    }
  }

  const legacyAction = (trade as any).decision?.action;
  if (legacyAction === 'BUY' || legacyAction === 'SELL') {
    return legacyAction;
  }

  return null;
}

function inferOrderType(primaryAction: Action | null): 'MARKET' | 'LIMIT' {
  if (primaryAction?.type?.includes('MARKET')) {
    return 'MARKET';
  }

  if (primaryAction?.type?.includes('LIMIT')) {
    return 'LIMIT';
  }

  return 'MARKET';
}

function extractPriceImprovement(priceImprovement: number | undefined, limitPrice: number | undefined, fillPrice: number, orderType: string): string {
  let improvementValue: number | null = null;

  if (typeof priceImprovement === 'number') {
    improvementValue = priceImprovement;
  } else if (orderType === 'LIMIT' && typeof limitPrice === 'number') {
    improvementValue = limitPrice - fillPrice;
  }

  if (improvementValue === null || improvementValue === 0) {
    return '';
  }

  const formatted = `${improvementValue >= 0 ? '+' : '-'}$${Math.abs(improvementValue).toFixed(2)}`;
  return ` | ${formatted} price improvement`;
}
