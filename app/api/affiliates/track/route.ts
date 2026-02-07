import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";

const TrackSchema = z.object({
  affiliate_code: z.string().min(1),
  landing_page: z.string().optional(),
  utm_params: z.record(z.string()).optional(),
});

/**
 * POST /api/affiliates/track
 * Track an affiliate referral click
 */
export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();

    // Parse and validate request body
    const body = await req.json();
    const validatedData = TrackSchema.parse(body);

    // Get affiliate by code
    const { data: affiliate, error: affiliateError } = await supabase
      .from("affiliates")
      .select("id, status")
      .eq("affiliate_code", validatedData.affiliate_code)
      .single();

    if (affiliateError || !affiliate) {
      return NextResponse.json(
        { error: "Invalid affiliate code" },
        { status: 404 }
      );
    }

    if (affiliate.status !== "active") {
      return NextResponse.json(
        { error: "Affiliate not active" },
        { status: 400 }
      );
    }

    // Get user if authenticated (optional)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Prepare click data
    const clickData = {
      landing_page: validatedData.landing_page,
      utm_params: validatedData.utm_params,
      user_agent: req.headers.get("user-agent"),
      referer: req.headers.get("referer"),
      tracked_at: new Date().toISOString(),
    };

    // Create referral tracking record
    const { data: referral, error: referralError } = await supabase
      .from("affiliate_referrals")
      .insert({
        affiliate_id: affiliate.id,
        referred_user_id: user?.id || null,
        referred_email: user?.email || null,
        click_data: clickData,
        status: "pending",
      })
      .select()
      .single();

    if (referralError) {
      console.error("Error creating referral record:", referralError);
      return NextResponse.json(
        { error: "Failed to track referral" },
        { status: 500 }
      );
    }

    // Store affiliate code in cookie for attribution
    const res = NextResponse.json({
      success: true,
      referral_id: referral.id,
    });

    res.cookies.set("p28_affiliate", validatedData.affiliate_code, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch (error) {
    console.error("Affiliate tracking error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
