/**
 * Conversion Optimization Utilities
 * META-008: Set up conversion optimization for key events
 *
 * Provides utilities for tracking and optimizing conversions:
 * - Conversion value calculation
 * - Customer lifetime value (LTV) prediction
 * - ROAS (Return on Ad Spend) tracking
 * - Conversion funnel tracking
 */

/**
 * Calculate predicted customer lifetime value
 * Used for Subscribe events to help Meta optimize for high-value customers
 */
export function calculatePredictedLTV(params: {
  subscriptionAmount: number; // Monthly/annual amount in cents
  interval: "monthly" | "yearly";
  averageRetentionMonths?: number; // Default: 12 months
}): number {
  const { subscriptionAmount, interval, averageRetentionMonths = 12 } = params;

  // Convert to monthly value
  const monthlyValue =
    interval === "yearly" ? subscriptionAmount / 12 : subscriptionAmount;

  // Calculate LTV: monthly value * retention months
  const ltv = (monthlyValue / 100) * averageRetentionMonths; // Convert cents to dollars

  return Math.round(ltv * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate order value including upsells and order bumps
 * Used for Purchase events to track total order value
 */
export function calculateOrderValue(params: {
  baseAmount: number; // Base product price in cents
  orderBumps?: Array<{ amount: number }>; // Additional order bumps
  upsells?: Array<{ amount: number }>; // Post-purchase upsells
  currency?: string;
}): {
  value: number; // Total in dollars
  currency: string;
  breakdown: {
    base: number;
    bumps: number;
    upsells: number;
    total: number;
  };
} {
  const { baseAmount, orderBumps = [], upsells = [], currency = "USD" } = params;

  const bumpsTotal = orderBumps.reduce((sum, bump) => sum + bump.amount, 0);
  const upsellsTotal = upsells.reduce((sum, upsell) => sum + upsell.amount, 0);
  const totalCents = baseAmount + bumpsTotal + upsellsTotal;

  return {
    value: totalCents / 100, // Convert to dollars
    currency,
    breakdown: {
      base: baseAmount / 100,
      bumps: bumpsTotal / 100,
      upsells: upsellsTotal / 100,
      total: totalCents / 100,
    },
  };
}

/**
 * Track conversion funnel step
 * Helps identify drop-off points in conversion funnel
 */
export interface FunnelStep {
  step: string;
  stepNumber: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export function createFunnelStep(
  step: string,
  stepNumber: number,
  metadata?: Record<string, any>
): FunnelStep {
  return {
    step,
    stepNumber,
    timestamp: Date.now(),
    metadata,
  };
}

/**
 * Calculate conversion rate between funnel steps
 */
export function calculateConversionRate(
  startCount: number,
  endCount: number
): number {
  if (startCount === 0) return 0;
  return Math.round((endCount / startCount) * 10000) / 100; // Round to 2 decimals
}

/**
 * Calculate ROAS (Return on Ad Spend)
 * Used to measure effectiveness of ad campaigns
 */
export function calculateROAS(params: {
  revenue: number; // Total revenue generated
  adSpend: number; // Total ad spend
}): {
  roas: number; // Return on ad spend (e.g., 3.5 = $3.50 return per $1 spent)
  roi: number; // Return on investment percentage (e.g., 250%)
  profit: number; // Net profit (revenue - ad spend)
} {
  const { revenue, adSpend } = params;

  if (adSpend === 0) {
    return {
      roas: 0,
      roi: 0,
      profit: revenue,
    };
  }

  const roas = Math.round((revenue / adSpend) * 100) / 100;
  const profit = revenue - adSpend;
  const roi = Math.round((profit / adSpend) * 10000) / 100;

  return {
    roas,
    roi,
    profit: Math.round(profit * 100) / 100,
  };
}

/**
 * Conversion event types and their standard values
 * Used for consistent tracking across the platform
 */
export const ConversionEvents = {
  PURCHASE: {
    name: "Purchase",
    category: "transaction",
    isMonetized: true,
  },
  SUBSCRIBE: {
    name: "Subscribe",
    category: "transaction",
    isMonetized: true,
  },
  INITIATE_CHECKOUT: {
    name: "InitiateCheckout",
    category: "consideration",
    isMonetized: false,
  },
  ADD_TO_CART: {
    name: "AddToCart",
    category: "consideration",
    isMonetized: false,
  },
  VIEW_CONTENT: {
    name: "ViewContent",
    category: "awareness",
    isMonetized: false,
  },
  LEAD: {
    name: "Lead",
    category: "consideration",
    isMonetized: false,
  },
  COMPLETE_REGISTRATION: {
    name: "CompleteRegistration",
    category: "transaction",
    isMonetized: false,
  },
} as const;

/**
 * Standard conversion funnel for course purchases
 */
export const CoursePurchaseFunnel = [
  { step: "landing_view", label: "Landing Page View", stepNumber: 1 },
  { step: "course_preview", label: "Course Preview", stepNumber: 2 },
  { step: "pricing_view", label: "Pricing View", stepNumber: 3 },
  { step: "checkout_started", label: "Checkout Started", stepNumber: 4 },
  { step: "checkout_completed", label: "Checkout Completed", stepNumber: 5 },
  { step: "purchase_completed", label: "Purchase Completed", stepNumber: 6 },
] as const;

/**
 * Standard conversion funnel for subscriptions
 */
export const SubscriptionFunnel = [
  { step: "landing_view", label: "Landing Page View", stepNumber: 1 },
  { step: "pricing_view", label: "Pricing View", stepNumber: 2 },
  { step: "checkout_started", label: "Checkout Started", stepNumber: 3 },
  { step: "subscription_started", label: "Subscription Started", stepNumber: 4 },
] as const;

/**
 * Get conversion event metadata for tracking
 */
export function getConversionEventMetadata(eventName: string): {
  category: string;
  isMonetized: boolean;
  requiresValue: boolean;
} {
  const event = Object.values(ConversionEvents).find(
    (e) => e.name === eventName
  );

  if (!event) {
    return {
      category: "other",
      isMonetized: false,
      requiresValue: false,
    };
  }

  return {
    category: event.category,
    isMonetized: event.isMonetized,
    requiresValue: event.isMonetized, // Monetized events should include value
  };
}

/**
 * Validate conversion event parameters
 * Ensures required parameters are present for optimization
 */
export function validateConversionEvent(
  eventName: string,
  params: Record<string, any>
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const metadata = getConversionEventMetadata(eventName);

  // Check required value for monetized events
  if (metadata.requiresValue && !params.value) {
    errors.push(`${eventName} requires a 'value' parameter for optimization`);
  }

  // Check currency for monetized events
  if (metadata.requiresValue && !params.currency) {
    warnings.push(`${eventName} should include 'currency' parameter`);
  }

  // Check content_ids for better tracking
  if (
    !params.content_ids ||
    !Array.isArray(params.content_ids) ||
    params.content_ids.length === 0
  ) {
    warnings.push(
      `${eventName} should include 'content_ids' for better attribution`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
