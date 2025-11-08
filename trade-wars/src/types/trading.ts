import { z } from 'zod';
import type { CouncilMetadata } from '@/lib/council/types';

// Zod schema for trading decisions with structured outputs
// Note: quantity can be 0 for HOLD (since nothing is traded), but must be > 0 for BUY/SELL
const ActionSchema = z
  .object({
    type: z.enum([
      'PLACE_LIMIT_BUY',
      'PLACE_LIMIT_SELL',
      'PLACE_MARKET_BUY',
      'PLACE_MARKET_SELL',
      'CANCEL_ORDER',
      'HOLD'
    ]),
    orderId: z.string().nullable().optional(),
    price: z.number().nullable().optional(),
    quantity: z.number().nullable().optional(),
    asset: z.string().nullable().optional(),
    reasoning: z.string().min(1) // Made required - every action needs explanation
  })
  .superRefine((action, ctx) => {
    const isPlaceAction = action.type.startsWith('PLACE_');
    const isLimitAction = action.type === 'PLACE_LIMIT_BUY' || action.type === 'PLACE_LIMIT_SELL';
    const isCancelAction = action.type === 'CANCEL_ORDER';

    if (isPlaceAction) {
      if (typeof action.quantity !== 'number' || action.quantity <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PLACE actions require quantity greater than 0',
          path: ['quantity']
        });
      }

      if (!action.asset) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PLACE actions require an asset',
          path: ['asset']
        });
      }
    }

    if (isLimitAction && typeof action.price !== 'number') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'PLACE_LIMIT actions require a price',
        path: ['price']
      });
    }

    if (isCancelAction) {
      if (!action.orderId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CANCEL_ORDER actions require orderId',
          path: ['orderId']
        });
      }

      if (!action.asset) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CANCEL_ORDER actions require an asset',
          path: ['asset']
        });
      }
    }
  });

export const TradingDecisionSchema = z.object({
  actions: z.array(ActionSchema).min(1),
  plan: z.string().min(1), // Removed max(500) to allow detailed plans
  reasoning: z.string().min(1)
});

// TypeScript type inferred from Zod schema
export type TradingDecision = z.infer<typeof TradingDecisionSchema>;

// Market data types for LLM consumption
export interface MarketData {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
}

export interface Action {
  type:
    | 'PLACE_LIMIT_BUY'
    | 'PLACE_LIMIT_SELL'
    | 'PLACE_MARKET_BUY'
    | 'PLACE_MARKET_SELL'
    | 'CANCEL_ORDER'
    | 'HOLD';
  orderId?: string;
  price?: number;
  quantity?: number;
  asset?: string;
  reasoning: string; // Made required - every action needs explanation
}

// Account balance types
export interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

// Trade record for history tracking
export interface TradeRecord {
  id: string;
  timestamp: string;
  aiModel?: 'openai' | 'grok' | 'gemini' | 'council'; // Track which AI made the decision
  marketData: {
    symbol: string;
    ticker: any;
    balances: Balance[];
  };
  decision: TradingDecision;
  executedOrder?: {
    orderId: string;
    orderType: 'MARKET' | 'LIMIT';
    limitPrice?: number;
    executedPrice: number;
    priceImprovement?: number;
    quantity: number;
    status: string;
  };
  plan: string;
  portfolioValueBefore: number;
  portfolioValueAfter: number;
  success: boolean;
  error?: string;

  /**
   * Council debate metadata - stores the collaborative decision-making process
   * Only present for trades made by the council agent
   * Contains individual model proposals, vote breakdown, selected model, consensus type, etc.
   * This field is optional to maintain backwards compatibility with existing trade records
   */
  councilMetadata?: CouncilMetadata;
}

export interface OpenOrder {
  orderId: string;
  symbol: string;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  status: string;
  time: number;
  ageMs: number;
}
