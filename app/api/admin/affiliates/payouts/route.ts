import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
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

    // Check admin role
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userError || !userData || userData.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // pending, approved, completed, rejected, failed

    // Build query
    let query = supabase
      .from("affiliate_payout_requests")
      .select(
        `
        *,
        affiliates:affiliate_id (
          id,
          affiliate_code,
          payout_email,
          payout_method,
          users:user_id (
            id,
            email
          )
        )
      `
      )
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data: payoutRequests, error: requestsError } = await query;

    if (requestsError) {
      console.error("Error fetching payout requests:", requestsError);
      return NextResponse.json(
        { error: "Failed to fetch payout requests" },
        { status: 500 }
      );
    }

    // Get summary stats
    const { data: stats, error: statsError } = await supabase
      .from("affiliate_payout_requests")
      .select("status, amount");

    if (statsError) {
      console.error("Error fetching payout stats:", statsError);
    }

    // Calculate stats
    const summary = {
      pending: {
        count: 0,
        total: 0,
      },
      approved: {
        count: 0,
        total: 0,
      },
      completed: {
        count: 0,
        total: 0,
      },
      rejected: {
        count: 0,
        total: 0,
      },
    };

    if (stats) {
      stats.forEach((item: any) => {
        if (summary[item.status as keyof typeof summary]) {
          summary[item.status as keyof typeof summary].count++;
          summary[item.status as keyof typeof summary].total += Number(item.amount);
        }
      });
    }

    return NextResponse.json({
      payoutRequests: payoutRequests || [],
      summary,
    });
  } catch (error) {
    console.error("Error fetching payout requests:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
