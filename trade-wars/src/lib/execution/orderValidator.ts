import { Action, Balance, OpenOrder } from '@/types/trading';

export interface RiskValidationResult {
  allowed: boolean;
  errors: string[];
}

interface RiskEvaluationContext {
  actions: Action[];
  placeActions: Action[];
  openOrders: OpenOrder[];
  balances: Balance[];
  currentPrice: number;
}

type RiskCheck = (context: RiskEvaluationContext) => string[];

export function validateRiskLimits(
  actions: Action[],
  openOrders: OpenOrder[],
  balances: Balance[],
  currentPrice: number
): RiskValidationResult {
  const placeActions = actions.filter(action => action.type.startsWith('PLACE_'));

  const context: RiskEvaluationContext = {
    actions,
    placeActions,
    openOrders,
    balances,
    currentPrice
  };

  const riskChecks: RiskCheck[] = [
    enforceMaxOpenOrderCount,
    enforceMaxExposure,
    preventDuplicateLimitOrders,
    enforceLimitPriceBounds,
    enforceMinimumOrderValue
  ];

  const errors = riskChecks.flatMap(check => check(context));

  return {
    allowed: errors.length === 0,
    errors
  };
}

function enforceMaxOpenOrderCount(context: RiskEvaluationContext): string[] {
  const { openOrders, placeActions } = context;
  const MAX_OPEN_ORDERS = 3;

  const newLimitOrders = placeActions.filter(action => action.type.startsWith('PLACE_LIMIT_'));
  const projectedOpenOrders = openOrders.length + newLimitOrders.length;

  if (projectedOpenOrders > MAX_OPEN_ORDERS) {
    return [
      `Too many open orders. Maximum allowed is ${MAX_OPEN_ORDERS}, current pending: ${openOrders.length}, new limit orders requested: ${newLimitOrders.length}`
    ];
  }

  return [];
}

function enforceMaxExposure(context: RiskEvaluationContext): string[] {
  const { balances, openOrders, placeActions, currentPrice } = context;

  const portfolioValue = calculatePortfolioValue(balances, currentPrice);

  if (portfolioValue <= 0) {
    return ['Portfolio value is zero. Unable to evaluate exposure limits.'];
  }

  const existingExposure = openOrders.reduce((total, order) => total + order.price * order.quantity, 0);

  const newExposure = placeActions.reduce((total, action) => {
    if (typeof action.quantity !== 'number' || action.quantity <= 0) {
      return total;
    }

    const orderPrice = typeof action.price === 'number' && action.price > 0 ? action.price : currentPrice;
    return total + orderPrice * action.quantity;
  }, 0);

  const totalExposure = existingExposure + newExposure;
  const exposureLimit = portfolioValue * 0.5;

  if (totalExposure > exposureLimit) {
    const exposurePercent = (totalExposure / portfolioValue) * 100;
    return [
      `Exposure limit exceeded: ${exposurePercent.toFixed(2)}% of portfolio (limit 50%). ` +
      `Current exposure: $${totalExposure.toFixed(2)}, Portfolio value: $${portfolioValue.toFixed(2)}`
    ];
  }

  return [];
}

function calculatePortfolioValue(balances: Balance[], currentPrice: number): number {
  return balances.reduce((total, balance) => {
    if (balance.asset === 'USDT') {
      return total + balance.free + balance.locked;
    }

    if (balance.asset === 'BTC') {
      const btcHoldings = balance.free + balance.locked;
      return total + btcHoldings * currentPrice;
    }

    return total;
  }, 0);
}

function preventDuplicateLimitOrders(context: RiskEvaluationContext): string[] {
  const { openOrders, placeActions } = context;
  const errors: string[] = [];

  const existingOrderMap = new Map<string, Set<number>>();

  for (const order of openOrders) {
    const key = `${order.side}_${order.symbol}`;
    if (!existingOrderMap.has(key)) {
      existingOrderMap.set(key, new Set());
    }
    existingOrderMap.get(key)!.add(Number(order.price.toFixed(8)));
  }

  for (const action of placeActions) {
    if (!action.type.startsWith('PLACE_LIMIT_')) {
      continue;
    }

    if (!action.asset || typeof action.price !== 'number') {
      continue;
    }

    const symbol = normalizeSymbol(action.asset);
    const side = action.type === 'PLACE_LIMIT_BUY' ? 'BUY' : 'SELL';
    const key = `${side}_${symbol}`;
    const price = Number(action.price.toFixed(8));

    if (existingOrderMap.get(key)?.has(price)) {
      errors.push(`Duplicate limit order detected for ${symbol} at $${action.price.toFixed(2)} (${side}).`);
    }
  }

  return errors;
}

function normalizeSymbol(asset: string): string {
  const upper = asset.toUpperCase();

  if (upper.includes('/')) {
    return upper.replace('/', '');
  }

  if (upper.length === 3) {
    return `${upper}USDT`;
  }

  return upper;
}

function enforceLimitPriceBounds(context: RiskEvaluationContext): string[] {
  const { placeActions, currentPrice } = context;
  const errors: string[] = [];

  const lowerBound = currentPrice * 0.95;
  const upperBound = currentPrice * 1.05;

  for (const action of placeActions) {
    if (!action.type.startsWith('PLACE_LIMIT_')) {
      continue;
    }

    if (typeof action.price !== 'number' || action.price <= 0) {
      continue;
    }

    if (action.price < lowerBound || action.price > upperBound) {
      errors.push(
        `Limit price ${action.price.toFixed(2)} out of bounds (${lowerBound.toFixed(2)} - ${upperBound.toFixed(2)}) for action ${action.type}.`
      );
    }
  }

  return errors;
}

function enforceMinimumOrderValue(context: RiskEvaluationContext): string[] {
  const { placeActions, currentPrice } = context;
  const errors: string[] = [];
  const MIN_ORDER_VALUE = 10;

  for (const action of placeActions) {
    if (typeof action.quantity !== 'number' || action.quantity <= 0) {
      continue;
    }

    const orderPrice = typeof action.price === 'number' && action.price > 0 ? action.price : currentPrice;
    const orderValue = action.quantity * orderPrice;

    if (orderValue < MIN_ORDER_VALUE) {
      errors.push(
        `Order value below minimum $${MIN_ORDER_VALUE.toFixed(2)} for action ${action.type}: ` +
        `${action.quantity} units @ $${orderPrice.toFixed(2)} = $${orderValue.toFixed(2)}`
      );
    }
  }

  return errors;
}
