import { supabaseServer } from "@/lib/supabase/server";

/**
 * MRR & Subscription Metrics
 * Server-side functions for subscription analytics
 */

export type MRRData = {
  current_mrr: number;
  subscriber_count: number;
  growth_rate: number;
};

export type MRRByPlan = {
  tier: string;
  billing_interval: string;
  subscriber_count: number;
  monthly_revenue: number;
  annual_revenue: number;
  total_mrr: number;
};

export type ChurnData = {
  churn_rate: number;
  churned_count: number;
  period_days: number;
};

export type Subscriber = {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  tier: string;
  status: string;
  price_cents: number;
  billing_interval: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  trial_start: string | null;
  trial_end: string | null;
};

export type MRRHistoryPoint = {
  date: string;
  mrr: number;
  subscriber_count: number;
};

export type SubscriptionHistory = {
  id: string;
  event_type: string;
  old_tier: string | null;
  new_tier: string | null;
  old_price_cents: number | null;
  new_price_cents: number | null;
  old_status: string | null;
  new_status: string | null;
  created_at: string;
};

/**
 * Calculate current MRR from all active/trialing subscriptions
 */
export async function getCurrentMRR(): Promise<MRRData> {
  const supabase = supabaseServer();

  // Get current MRR using database function
  const { data: mrrData, error: mrrError } = await supabase.rpc(
    "calculate_current_mrr"
  );

  if (mrrError) {
    console.error("Error calculating MRR:", mrrError);
    return { current_mrr: 0, subscriber_count: 0, growth_rate: 0 };
  }

  // Get subscriber count
  const { count: subscriberCount } = await supabase
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .in("status", ["active", "trialing"]);

  // Calculate growth rate (compare to 30 days ago)
  const { data: historyData } = await supabase.rpc("get_mrr_history", {
    p_days: 30,
  });

  let growthRate = 0;
  if (historyData && historyData.length >= 2) {
    const oldMRR = historyData[0]?.mrr || 0;
    const currentMRR = mrrData || 0;
    if (oldMRR > 0) {
      growthRate = ((currentMRR - oldMRR) / oldMRR) * 100;
    }
  }

  return {
    current_mrr: mrrData || 0,
    subscriber_count: subscriberCount || 0,
    growth_rate: Math.round(growthRate * 100) / 100,
  };
}

/**
 * Get MRR breakdown by plan (tier + interval)
 */
export async function getMRRByPlan(): Promise<MRRByPlan[]> {
  const supabase = supabaseServer();

  const { data, error } = await supabase.rpc("get_mrr_by_plan");

  if (error) {
    console.error("Error getting MRR by plan:", error);
    return [];
  }

  return data || [];
}

/**
 * Calculate churn rate for a given period
 */
export async function getChurnRate(days: number = 30): Promise<ChurnData> {
  const supabase = supabaseServer();

  const { data: churnRate, error } = await supabase.rpc("calculate_churn_rate", {
    p_days: days,
  });

  if (error) {
    console.error("Error calculating churn rate:", error);
    return { churn_rate: 0, churned_count: 0, period_days: days };
  }

  // Get count of churned subscriptions in period
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { count: churnedCount } = await supabase
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("status", "canceled")
    .gte("canceled_at", startDate.toISOString());

  return {
    churn_rate: churnRate || 0,
    churned_count: churnedCount || 0,
    period_days: days,
  };
}

/**
 * Get list of subscribers with details
 */
export async function getSubscriberList(
  status: string = "active",
  limit: number = 50,
  offset: number = 0
): Promise<Subscriber[]> {
  const supabase = supabaseServer();

  const { data, error } = await supabase.rpc("get_subscriber_list", {
    p_status: status,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error("Error getting subscriber list:", error);
    return [];
  }

  return data || [];
}

/**
 * Get MRR history over time for charting
 */
export async function getMRRHistory(days: number = 90): Promise<MRRHistoryPoint[]> {
  const supabase = supabaseServer();

  const { data, error } = await supabase.rpc("get_mrr_history", {
    p_days: days,
  });

  if (error) {
    console.error("Error getting MRR history:", error);
    return [];
  }

  return data || [];
}

/**
 * Get subscription history for a user
 */
export async function getSubscriptionHistory(
  userId: string,
  limit: number = 50
): Promise<SubscriptionHistory[]> {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("subscription_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error getting subscription history:", error);
    return [];
  }

  return data || [];
}

/**
 * Get total subscriber count by status
 */
export async function getSubscriberCountByStatus() {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("status")
    .not("status", "is", null);

  if (error) {
    console.error("Error getting subscriber counts:", error);
    return {
      active: 0,
      trialing: 0,
      canceled: 0,
      past_due: 0,
      total: 0,
    };
  }

  const counts = {
    active: 0,
    trialing: 0,
    canceled: 0,
    past_due: 0,
    total: data.length,
  };

  data.forEach((sub) => {
    const status = sub.status as keyof typeof counts;
    if (status in counts) {
      counts[status]++;
    }
  });

  return counts;
}

/**
 * Get revenue metrics for subscriptions
 */
export async function getSubscriptionRevenue(days: number = 30) {
  const supabase = supabaseServer();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get new subscriptions in period
  const { count: newSubscriptions } = await supabase
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startDate.toISOString());

  // Get MRR data
  const mrrData = await getCurrentMRR();
  const churnData = await getChurnRate(days);

  // Calculate ARR (Annual Recurring Revenue)
  const arr = mrrData.current_mrr * 12;

  return {
    mrr: mrrData.current_mrr,
    arr,
    subscriber_count: mrrData.subscriber_count,
    new_subscribers: newSubscriptions || 0,
    churn_rate: churnData.churn_rate,
    growth_rate: mrrData.growth_rate,
  };
}
