import { Action, Balance, OpenOrder } from '@/types/trading';
import { executeLimitOrder, executeMarketOrder, cancelOrder, OrderResult } from '@/lib/binance/orderExecution';
import { validateRiskLimits } from '@/lib/execution/orderValidator';

export interface ActionResult {
  success: boolean;
  action: Action;
  order?: OrderResult;
  error?: string;
}

interface ExecutionContext {
  currentPrice: number;
  balances: Balance[];
  openOrders: OpenOrder[];
  apiKey?: string;
  secretKey?: string;
}

export async function executeActions(
  actions: Action[],
  currentPrice: number,
  balances: Balance[],
  openOrders: OpenOrder[] = [],
  apiKey?: string,
  secretKey?: string
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];
  const context: ExecutionContext = { currentPrice, balances, openOrders, apiKey, secretKey };

  const riskAssessment = validateRiskLimits(actions, openOrders, balances, currentPrice);

  if (!riskAssessment.allowed) {
    const errorMessage = `Risk limits violated: ${riskAssessment.errors.join('; ')}`;
    return actions.map(action => ({ success: false, action, error: errorMessage }));
  }

  for (const action of actions) {
    try {
      const result = await handleAction(action, context);

      if (!result.success && result.error) {
        console.warn(`[multiActionExecutor] Action ${action.type} reported failure: ${result.error}`);
      }

      results.push(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown action execution error';
      console.error(`[multiActionExecutor] Failed to execute action ${action.type}:`, message);
      results.push({ success: false, action, error: message });
    }
  }

  return results;
}

async function handleAction(action: Action, context: ExecutionContext): Promise<ActionResult> {
  switch (action.type) {
    case 'PLACE_LIMIT_BUY':
    case 'PLACE_LIMIT_SELL':
      return executeLimitAction(action, context);
    case 'PLACE_MARKET_BUY':
    case 'PLACE_MARKET_SELL':
      return executeMarketAction(action, context);
    case 'CANCEL_ORDER':
      return cancelExistingOrder(action, context);
    case 'HOLD':
      return holdPosition(action);
    default:
      return {
        success: false,
        action,
        error: `Unsupported action type: ${action.type}`
      };
  }
}

async function executeLimitAction(action: Action, context: ExecutionContext): Promise<ActionResult> {
  const { currentPrice, apiKey, secretKey } = context;

  if (!action.asset) {
    return {
      success: false,
      action,
      error: 'Limit order action missing asset'
    };
  }

  if (typeof action.quantity !== 'number' || action.quantity <= 0) {
    return {
      success: false,
      action,
      error: 'Limit order action requires positive quantity'
    };
  }

  if (typeof action.price !== 'number' || action.price <= 0) {
    return {
      success: false,
      action,
      error: 'Limit order action requires valid price'
    };
  }

  const symbol = normalizeSymbol(action.asset);
  const side = action.type === 'PLACE_LIMIT_BUY' ? 'BUY' : 'SELL';

  const order = await executeLimitOrder(
    symbol,
    side,
    action.quantity,
    action.price,
    currentPrice,
    apiKey,
    secretKey
  );

  return {
    success: true,
    action,
    order
  };
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

async function executeMarketAction(action: Action, context: ExecutionContext): Promise<ActionResult> {
  const { currentPrice, apiKey, secretKey } = context;

  if (!action.asset) {
    return {
      success: false,
      action,
      error: 'Market order action missing asset'
    };
  }

  if (typeof action.quantity !== 'number' || action.quantity <= 0) {
    return {
      success: false,
      action,
      error: 'Market order action requires positive quantity'
    };
  }

  const symbol = normalizeSymbol(action.asset);
  const side = action.type === 'PLACE_MARKET_BUY' ? 'BUY' : 'SELL';

  const order = await executeMarketOrder(
    symbol,
    side,
    action.quantity,
    currentPrice,
    apiKey,
    secretKey
  );

  return {
    success: true,
    action,
    order
  };
}

async function cancelExistingOrder(action: Action, context: ExecutionContext): Promise<ActionResult> {
  const { apiKey, secretKey } = context;

  if (!action.asset) {
    return {
      success: false,
      action,
      error: 'Cancel action missing asset'
    };
  }

  if (!action.orderId) {
    return {
      success: false,
      action,
      error: 'Cancel action requires orderId'
    };
  }

  const symbol = normalizeSymbol(action.asset);
  const result = await cancelOrder(symbol, action.orderId, apiKey, secretKey);

  return {
    success: true,
    action,
    order: {
      orderId: result.orderId,
      symbol: result.symbol,
      side: 'UNKNOWN',
      type: 'CANCEL',
      price: 0,
      quantity: 0,
      status: result.status,
      executedQty: 0,
      cummulativeQuoteQty: 0,
      transactTime: Date.now()
    }
  };
}

function holdPosition(action: Action): ActionResult {
  return {
    success: true,
    action
  };
}
