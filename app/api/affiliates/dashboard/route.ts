import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * GET /api/affiliates/dashboard
 * Get affiliate dashboard data for current user
 */
export async function GET(req: Request) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get affiliate record
    const { data: affiliate, error: affiliateError } = await supabase
      .from("affiliates")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (affiliateError || !affiliate) {
      return NextResponse.json(
        { error: "Not registered as affiliate" },
        { status: 404 }
      );
    }

    // Get referral stats
    const { data: referralStats, error: statsError } = await supabase
      .from("affiliate_referrals")
      .select("status")
      .eq("affiliate_id", affiliate.id);

    if (statsError) {
      console.error("Error fetching referral stats:", statsError);
    }

    const totalClicks = referralStats?.length || 0;
    const totalConverted =
      referralStats?.filter((r) => r.status === "converted").length || 0;
    const conversionRate =
      totalClicks > 0 ? (totalConverted / totalClicks) * 100 : 0;

    // Get recent referrals
    const { data: recentReferrals, error: referralsError } = await supabase
      .from("affiliate_referrals")
      .select(
        `
        *,
        orders:order_id (
          amount,
          created_at,
          status
        )
      `
      )
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (referralsError) {
      console.error("Error fetching recent referrals:", referralsError);
    }

    // Get commission stats
    const { data: commissions, error: commissionsError } = await supabase
      .from("affiliate_commissions")
      .select("amount, status")
      .eq("affiliate_id", affiliate.id);

    if (commissionsError) {
      console.error("Error fetching commissions:", commissionsError);
    }

    const pendingEarnings =
      commissions
        ?.filter((c) => c.status === "pending" || c.status === "approved")
        .reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0) || 0;

    const paidEarnings =
      commissions
        ?.filter((c) => c.status === "paid")
        .reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0) || 0;

    // Get recent commissions
    const { data: recentCommissions, error: recentCommissionsError } =
      await supabase
        .from("affiliate_commissions")
        .select(
          `
        *,
        orders:order_id (
          amount,
          created_at
        )
      `
        )
        .eq("affiliate_id", affiliate.id)
        .order("created_at", { ascending: false })
        .limit(10);

    if (recentCommissionsError) {
      console.error("Error fetching recent commissions:", recentCommissionsError);
    }

    return NextResponse.json({
      affiliate: {
        id: affiliate.id,
        affiliate_code: affiliate.affiliate_code,
        status: affiliate.status,
        commission_rate: affiliate.commission_rate,
        total_referrals: affiliate.total_referrals,
        total_earnings: affiliate.total_earnings,
        payout_email: affiliate.payout_email,
        payout_method: affiliate.payout_method,
        created_at: affiliate.created_at,
      },
      stats: {
        totalClicks,
        totalConverted,
        conversionRate: Math.round(conversionRate * 100) / 100,
        pendingEarnings,
        paidEarnings,
      },
      recentReferrals: recentReferrals || [],
      recentCommissions: recentCommissions || [],
    });
  } catch (error) {
    console.error("Affiliate dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
