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
