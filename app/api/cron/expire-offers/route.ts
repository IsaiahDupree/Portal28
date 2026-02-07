import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/cron/expire-offers
 *
 * Cron endpoint to automatically deactivate expired offers.
 * Should be called periodically (e.g., every 5 minutes) via Vercel Cron or external scheduler.
 *
 * Authorization:
 * - Requires CRON_SECRET header to match CRON_SECRET env variable
 * - Or run from authorized source (Vercel Cron, etc.)
 */
export async function POST(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Call the database function to expire offers
    const { data, error } = await supabaseAdmin.rpc("expire_offers");

    if (error) {
      console.error("Error calling expire_offers function:", error);
      return NextResponse.json(
        { error: "Database function failed", details: error.message },
        { status: 500 }
      );
    }

    const expiredCount = data || 0;

    // Log the result
    console.log(`[Cron] Expired ${expiredCount} offer(s) at ${new Date().toISOString()}`);

    return NextResponse.json({
      success: true,
      expiredCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error in expire-offers cron:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for testing (requires auth)
 */
export async function GET(req: Request) {
  // Only allow in development or with auth
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Use POST for cron execution" },
      { status: 405 }
    );
  }

  // Fetch currently expired offers for debugging
  const { data: expiredOffers } = await supabaseAdmin
    .from("offers")
    .select("key, title, ends_at, is_active")
    .not("ends_at", "is", null)
    .lte("ends_at", new Date().toISOString())
    .eq("is_active", true);

  return NextResponse.json({
    message: "Use POST to trigger expiration",
    currentlyExpired: expiredOffers?.length || 0,
    offers: expiredOffers || []
  });
}
