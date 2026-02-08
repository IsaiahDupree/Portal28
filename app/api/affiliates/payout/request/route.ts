import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

// Request schema
const payoutRequestSchema = z.object({
  amount: z.number().min(5000, "Minimum payout is $50.00"), // cents
});

export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json();
    const validated = payoutRequestSchema.parse(body);

    // Get affiliate record
    const { data: affiliate, error: affiliateError } = await supabase
      .from("affiliates")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (affiliateError || !affiliate) {
      return NextResponse.json(
        { error: "Affiliate account not found" },
        { status: 404 }
      );
    }

    // Check if affiliate is active
    if (affiliate.status !== "active") {
      return NextResponse.json(
        { error: "Affiliate account must be active to request payouts" },
        { status: 403 }
      );
    }

    // Check payout method is configured
    if (!affiliate.payout_email || !affiliate.payout_method) {
      return NextResponse.json(
        { error: "Please configure your payout method first" },
        { status: 400 }
      );
    }

    // Check for pending payout requests
    const { data: pendingRequests, error: pendingError } = await supabase
      .from("affiliate_payout_requests")
      .select("id")
      .eq("affiliate_id", affiliate.id)
      .in("status", ["pending", "approved", "processing"])
      .limit(1);

    if (pendingError) {
      console.error("Error checking pending requests:", pendingError);
      return NextResponse.json(
        { error: "Failed to check pending requests" },
        { status: 500 }
      );
    }

    if (pendingRequests && pendingRequests.length > 0) {
      return NextResponse.json(
        { error: "You already have a pending payout request" },
        { status: 400 }
      );
    }

    // Calculate available balance
    const { data: balanceData, error: balanceError } = await supabase.rpc(
      "get_affiliate_available_balance",
      {
        p_affiliate_id: affiliate.id,
      }
    );

    if (balanceError) {
      console.error("Error calculating balance:", balanceError);
      return NextResponse.json(
        { error: "Failed to calculate available balance" },
        { status: 500 }
      );
    }

    const availableBalance = Number(balanceData) || 0;

    // Check if requested amount is available
    if (validated.amount > availableBalance) {
      return NextResponse.json(
        {
          error: `Insufficient balance. Available: $${(availableBalance / 100).toFixed(2)}`,
          availableBalance,
        },
        { status: 400 }
      );
    }

    // Create payout request
    const { data: payoutRequest, error: createError } = await supabase
      .from("affiliate_payout_requests")
      .insert({
        affiliate_id: affiliate.id,
        amount: validated.amount,
        status: "pending",
        payout_method: affiliate.payout_method,
        payout_email: affiliate.payout_email,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating payout request:", createError);
      return NextResponse.json(
        { error: "Failed to create payout request" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      payoutRequest,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Error processing payout request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch payout request history
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

    // Get affiliate record
    const { data: affiliate, error: affiliateError } = await supabase
      .from("affiliates")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (affiliateError || !affiliate) {
      return NextResponse.json(
        { error: "Affiliate account not found" },
        { status: 404 }
      );
    }

    // Get payout requests
    const { data: payoutRequests, error: requestsError } = await supabase
      .from("affiliate_payout_requests")
      .select("*")
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false });

    if (requestsError) {
      console.error("Error fetching payout requests:", requestsError);
      return NextResponse.json(
        { error: "Failed to fetch payout requests" },
        { status: 500 }
      );
    }

    // Get available balance
    const { data: balanceData, error: balanceError } = await supabase.rpc(
      "get_affiliate_available_balance",
      {
        p_affiliate_id: affiliate.id,
      }
    );

    const availableBalance = balanceError ? 0 : Number(balanceData) || 0;

    return NextResponse.json({
      payoutRequests: payoutRequests || [],
      availableBalance,
    });
  } catch (error) {
    console.error("Error fetching payout requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
