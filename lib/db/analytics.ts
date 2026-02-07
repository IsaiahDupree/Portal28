import { supabaseServer } from "@/lib/supabase/server";

/**
 * Analytics Database Queries
 * Server-side functions for analytics dashboard
 */

export type RevenueDataPoint = {
  date: string;
  revenue: number;
  orders: number;
};

export type ConversionFunnelData = {
  step: string;
  count: number;
  percentage: number;
};

export type TopCourse = {
  id: string;
  title: string;
  slug: string;
  revenue: number;
  orders: number;
};

export type OfferAnalytics = {
  offer_key: string;
  offer_title: string;
  impressions: number;
  checkouts: number;
  conversions: number;
  conversion_rate: number;
  revenue: number;
};

export type CohortAnalytics = {
  cohort_date: string;
  cohort_size: number;
  total_revenue: number;
  avg_ltv: number;
  retention_week_1: number;
  retention_week_2: number;
  retention_week_4: number;
  retention_week_8: number;
  retention_week_12: number;
};

export type CohortRetentionPoint = {
  week_number: number;
  retention_rate: number;
  active_users: number;
  total_users: number;
};

export type CohortLTVComparison = {
  cohort_date: string;
  cohort_size: number;
  total_revenue: number;
  avg_ltv: number;
  median_ltv: number;
  max_ltv: number;
};

/**
 * Get revenue over time grouped by day/week/month
 */
export async function getRevenueTimeSeries(
  period: "day" | "week" | "month" = "day",
  days: number = 30
): Promise<RevenueDataPoint[]> {
  const supabase = supabaseServer();

  // Calculate date format based on period
  const dateFormat =
    period === "day"
      ? "YYYY-MM-DD"
      : period === "week"
      ? "IYYY-IW" // ISO week
      : "YYYY-MM"; // month

  const { data, error } = await supabase.rpc("get_revenue_timeseries", {
    p_period: period,
    p_days: days,
  });

  if (error) {
    console.error("Error fetching revenue timeseries:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Get conversion funnel data (Landing → View → Checkout → Purchase)
 */
export async function getConversionFunnel(
  days: number = 30
): Promise<ConversionFunnelData[]> {
  const supabase = supabaseServer();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Count impressions
  const { count: impressions } = await supabase
    .from("offer_impressions")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startDate.toISOString());

  // Count checkouts
  const { count: checkouts } = await supabase
    .from("checkout_attempts")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startDate.toISOString());

  // Count purchases
  const { count: purchases } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed")
    .gte("created_at", startDate.toISOString());

  const total = impressions || 0;
  const funnelData: ConversionFunnelData[] = [
    {
      step: "Impressions",
      count: impressions || 0,
      percentage: 100,
    },
    {
      step: "Checkouts",
      count: checkouts || 0,
      percentage: total > 0 ? (checkouts! / total) * 100 : 0,
    },
    {
      step: "Purchases",
      count: purchases || 0,
      percentage: total > 0 ? (purchases! / total) * 100 : 0,
    },
  ];

  return funnelData;
}

/**
 * Get top courses by revenue
 */
export async function getTopCourses(limit: number = 10): Promise<TopCourse[]> {
  const supabase = supabaseServer();

  const { data, error } = await supabase.rpc("get_top_courses_by_revenue", {
    p_limit: limit,
  });

  if (error) {
    console.error("Error fetching top courses:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Get offer analytics with impressions, checkouts, conversions
 */
export async function getOfferAnalytics(
  days: number = 30
): Promise<OfferAnalytics[]> {
  const supabase = supabaseServer();

  const { data, error } = await supabase.rpc("get_offer_analytics", {
    p_days: days,
  });

  if (error) {
    console.error("Error fetching offer analytics:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Get summary stats for the dashboard
 */
export async function getDashboardStats(days: number = 30) {
  const supabase = supabaseServer();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Total revenue
  const { data: orders } = await supabase
    .from("orders")
    .select("amount")
    .eq("status", "completed")
    .gte("created_at", startDate.toISOString());

  const totalRevenue =
    orders?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0;

  // Total orders
  const totalOrders = orders?.length || 0;

  // Total impressions
  const { count: totalImpressions } = await supabase
    .from("offer_impressions")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startDate.toISOString());

  // Total checkouts
  const { count: totalCheckouts } = await supabase
    .from("checkout_attempts")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startDate.toISOString());

  // Conversion rate
  const conversionRate =
    totalCheckouts && totalOrders
      ? (totalOrders / totalCheckouts) * 100
      : 0;

  return {
    totalRevenue,
    totalOrders,
    totalImpressions: totalImpressions || 0,
    totalCheckouts: totalCheckouts || 0,
    conversionRate: Math.round(conversionRate * 100) / 100,
  };
}

/**
 * Get cohort analytics data with retention and LTV metrics
 */
export async function getCohortAnalytics(
  cohortPeriod: "week" | "month" = "month",
  limit: number = 12
): Promise<CohortAnalytics[]> {
  const supabase = supabaseServer();

  const { data, error } = await supabase.rpc("get_cohort_analytics", {
    p_cohort_period: cohortPeriod,
    p_limit: limit,
  });

  if (error) {
    console.error("Error fetching cohort analytics:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Get retention curve for a specific cohort
 */
export async function getCohortRetentionCurve(
  cohortDate: string,
  cohortPeriod: "week" | "month" = "month"
): Promise<CohortRetentionPoint[]> {
  const supabase = supabaseServer();

  const { data, error } = await supabase.rpc("get_cohort_retention_curve", {
    p_cohort_date: cohortDate,
    p_cohort_period: cohortPeriod,
  });

  if (error) {
    console.error("Error fetching cohort retention curve:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Get LTV comparison across cohorts
 */
export async function getCohortLTVComparison(
  cohortPeriod: "week" | "month" = "month",
  limit: number = 6
): Promise<CohortLTVComparison[]> {
  const supabase = supabaseServer();

  const { data, error } = await supabase.rpc("get_cohort_ltv_comparison", {
    p_cohort_period: cohortPeriod,
    p_limit: limit,
  });

  if (error) {
    console.error("Error fetching cohort LTV comparison:", error);
    return [];
  }

  return data ?? [];
}
