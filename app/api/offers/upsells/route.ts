import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/offers/upsells
 *
 * Fetch active upsell offers for a specific purchase.
 *
 * Query params:
 * - orderId: UUID of the original order (required)
 * - offerKey: Optional - filter by specific parent offer key
 *
 * Returns:
 * - Array of upsell offers with full details
 * - Filters by kind='upsell' and is_active=true
 * - Matches parent_offer_key to the purchased offer or returns generic upsells
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const offerKey = searchParams.get("offerKey");

  if (!orderId) {
    return NextResponse.json(
      { error: "Missing required parameter: orderId" },
      { status: 400 }
    );
  }

  try {
    // Fetch the original order to determine what was purchased
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("offer_key, course_id, metadata")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Build query for upsell offers
    let query = supabaseAdmin
      .from("offers")
      .select("*")
      .eq("kind", "upsell")
      .eq("is_active", true);

    // Filter by parent offer key if specified
    if (offerKey) {
      query = query.eq("parent_offer_key", offerKey);
    } else if (order.offer_key) {
      // Match upsells for the specific purchased offer OR generic upsells (null parent)
      query = query.or(`parent_offer_key.eq.${order.offer_key},parent_offer_key.is.null`);
    } else {
      // No offer key on order, return generic upsells only
      query = query.is("parent_offer_key", null);
    }

    const { data: upsells, error: upsellsError } = await query;

    if (upsellsError) {
      console.error("Error fetching upsell offers:", upsellsError);
      return NextResponse.json(
        { error: "Failed to fetch upsell offers" },
        { status: 500 }
      );
    }

    // Check if user has already seen/purchased any of these upsells
    const { data: existingPurchases } = await supabaseAdmin
      .from("upsell_purchases")
      .select("upsell_offer_key, status")
      .eq("original_order_id", orderId);

    const purchasedKeys = new Set(
      existingPurchases
        ?.filter(p => p.status === "paid")
        .map(p => p.upsell_offer_key) || []
    );

    const viewedKeys = new Set(
      existingPurchases?.map(p => p.upsell_offer_key) || []
    );

    // Filter out already purchased/viewed upsells and add metadata
    const availableUpsells = (upsells || [])
      .filter(u => !purchasedKeys.has(u.key) && !viewedKeys.has(u.key))
      .map(u => ({
        ...u,
        expiresAt: new Date(Date.now() + (u.expires_minutes || 30) * 60 * 1000).toISOString()
      }));

    return NextResponse.json({
      upsells: availableUpsells,
      orderId,
      purchasedOfferKey: order.offer_key
    });

  } catch (error) {
    console.error("Error in upsells API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
