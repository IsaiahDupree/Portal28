// app/api/stripe/course-checkout/route.ts
// One-time course purchase checkout

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseServer } from "@/lib/supabase/server";
import { trackServerEvent } from "@/lib/tracking/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { courseSlug, priceId, userId, metaEventId, source } = body;

    if (!courseSlug || !priceId) {
      return NextResponse.json(
        { error: "Missing courseSlug or priceId" },
        { status: 400 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://portal28.academy";

    // Get affiliate code from cookie if present
    const affiliateCode = req.cookies.get("p28_affiliate")?.value;

    const metadata: Record<string, string> = {
      kind: "course",
      course_slug: courseSlug,
      user_id: userId ?? "",
      meta_event_id: metaEventId ?? "",
      source: source ?? "course_page",
    };

    // Add affiliate code to metadata if present
    if (affiliateCode) {
      metadata.affiliate_code = affiliateCode;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/thanks/course?session_id={CHECKOUT_SESSION_ID}&course=${courseSlug}`,
      cancel_url: `${siteUrl}/courses/${courseSlug}`,
      metadata,
      allow_promotion_codes: true
    });

    // Log paywall event if user is known
    if (userId) {
      const supabase = supabaseServer();
      await supabase.from("paywall_events").insert({
        user_id: userId,
        event_type: "start_checkout",
        paywall_type: "course",
        offer_course_slug: courseSlug,
        source: source ?? "course_page"
      });
    }

    // TRACK-005: Track checkout started event
    // Get price amount from Stripe
    const price = await stripe.prices.retrieve(priceId);
    await trackServerEvent('checkout_started', {
      course_id: courseSlug,
      product_id: courseSlug,
      amount: price.unit_amount ? price.unit_amount / 100 : 0,
      currency: price.currency || 'usd',
      source: source ?? "course_page",
    }, userId ?? undefined);

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Course checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
