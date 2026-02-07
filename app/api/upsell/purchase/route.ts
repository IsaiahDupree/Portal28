import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendCapiPurchase } from "@/lib/meta/capi";
import { sendCourseAccessEmail } from "@/lib/email/sendCourseAccessEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

/**
 * POST /api/upsell/purchase
 *
 * Process one-click upsell purchase using saved payment method from original order.
 * Uses Stripe Payment Intents to charge the customer without them re-entering card details.
 *
 * Body:
 * - orderId: UUID of original order (required)
 * - upsellOfferKey: Key of upsell offer (required)
 * - eventId: Meta Pixel event ID for deduplication (optional)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, upsellOfferKey, eventId } = body;

    if (!orderId || !upsellOfferKey) {
      return NextResponse.json(
        { error: "Missing required fields: orderId, upsellOfferKey" },
        { status: 400 }
      );
    }

    // Fetch the original order
    const { data: originalOrder, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !originalOrder) {
      return NextResponse.json(
        { error: "Original order not found" },
        { status: 404 }
      );
    }

    // Verify order is paid
    if (originalOrder.status !== "paid") {
      return NextResponse.json(
        { error: "Original order is not paid" },
        { status: 400 }
      );
    }

    // Fetch the upsell offer
    const { data: upsellOffer, error: offerError } = await supabaseAdmin
      .from("offers")
      .select("*")
      .eq("key", upsellOfferKey)
      .eq("kind", "upsell")
      .eq("is_active", true)
      .single();

    if (offerError || !upsellOffer) {
      return NextResponse.json(
        { error: "Upsell offer not found or inactive" },
        { status: 404 }
      );
    }

    // Check if user already purchased this upsell
    const { data: existingPurchase } = await supabaseAdmin
      .from("upsell_purchases")
      .select("id, status")
      .eq("original_order_id", orderId)
      .eq("upsell_offer_key", upsellOfferKey)
      .maybeSingle();

    if (existingPurchase?.status === "paid") {
      return NextResponse.json(
        { error: "This upsell has already been purchased" },
        { status: 400 }
      );
    }

    // Get course details from upsell offer payload
    const courseSlug = upsellOffer.payload?.courseSlug;
    if (!courseSlug) {
      return NextResponse.json(
        { error: "Upsell offer missing course information" },
        { status: 500 }
      );
    }

    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("id, title, slug, stripe_price_id")
      .eq("slug", courseSlug)
      .single();

    if (!course?.stripe_price_id) {
      return NextResponse.json(
        { error: "Course or Stripe price not found" },
        { status: 500 }
      );
    }

    // Get the Stripe customer and payment method from original session
    const originalSession = await stripe.checkout.sessions.retrieve(
      originalOrder.stripe_session_id,
      { expand: ['customer', 'payment_intent'] }
    );

    if (!originalSession.customer || typeof originalSession.customer === 'string') {
      return NextResponse.json(
        { error: "Customer information not found" },
        { status: 400 }
      );
    }

    const customerId = typeof originalSession.customer === 'string'
      ? originalSession.customer
      : originalSession.customer.id;

    // Get the payment method from the original payment intent
    let paymentMethodId: string | undefined;
    if (originalSession.payment_intent) {
      const paymentIntent = typeof originalSession.payment_intent === 'string'
        ? await stripe.paymentIntents.retrieve(originalSession.payment_intent)
        : originalSession.payment_intent;

      paymentMethodId = typeof paymentIntent.payment_method === 'string'
        ? paymentIntent.payment_method
        : paymentIntent.payment_method?.id;
    }

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 400 }
      );
    }

    // Get price details from Stripe
    const priceInfo = await stripe.prices.retrieve(course.stripe_price_id);
    const amount = priceInfo.unit_amount || 0;
    const currency = priceInfo.currency;

    // Create upsell purchase record
    const { data: upsellPurchase, error: purchaseError } = await supabaseAdmin
      .from("upsell_purchases")
      .insert({
        original_order_id: orderId,
        upsell_offer_key: upsellOfferKey,
        user_id: originalOrder.user_id,
        email: originalOrder.email,
        status: "pending",
        amount,
        currency,
        course_id: course.id,
        accepted_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + (upsellOffer.expires_minutes || 30) * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (purchaseError || !upsellPurchase) {
      console.error("Error creating upsell purchase:", purchaseError);
      return NextResponse.json(
        { error: "Failed to create upsell purchase" },
        { status: 500 }
      );
    }

    try {
      // Create one-click payment using saved payment method
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        description: `Upsell: ${course.title}`,
        metadata: {
          upsell_purchase_id: upsellPurchase.id,
          original_order_id: orderId,
          upsell_offer_key: upsellOfferKey,
          course_id: course.id,
          type: "upsell"
        }
      });

      // Update purchase record with payment intent
      await supabaseAdmin
        .from("upsell_purchases")
        .update({
          stripe_payment_intent: paymentIntent.id,
          status: paymentIntent.status === "succeeded" ? "paid" : "pending"
        })
        .eq("id", upsellPurchase.id);

      if (paymentIntent.status === "succeeded") {
        // Grant course entitlement
        await supabaseAdmin
          .from("entitlements")
          .insert({
            course_id: course.id,
            user_id: originalOrder.user_id,
            email: originalOrder.email,
            status: "active"
          });

        // Send course access email
        if (originalOrder.email) {
          await sendCourseAccessEmail({
            to: originalOrder.email,
            courseName: course.title,
            courseSlug: course.slug
          });
        }

        // Send CAPI purchase event
        if (eventId) {
          await sendCapiPurchase({
            event_id: eventId,
            value: amount / 100,
            currency,
            email: originalOrder.email || undefined,
            content_ids: [course.id]
          });
        }

        // Track analytics event
        await supabaseAdmin
          .from("paywall_events")
          .insert({
            event_type: "upsell_purchased",
            offer_key: upsellOfferKey,
            user_id: originalOrder.user_id,
            email: originalOrder.email,
            metadata: {
              orderId,
              courseId: course.id,
              amount: amount / 100,
              currency
            }
          });

        return NextResponse.json({
          success: true,
          purchaseId: upsellPurchase.id,
          status: "paid",
          course: {
            id: course.id,
            title: course.title,
            slug: course.slug
          }
        });
      } else {
        // Payment requires additional action (unlikely with off_session)
        return NextResponse.json({
          success: false,
          error: "Payment requires additional authentication",
          status: paymentIntent.status
        }, { status: 402 });
      }

    } catch (stripeError: any) {
      console.error("Stripe payment error:", stripeError);

      // Update purchase record to failed
      await supabaseAdmin
        .from("upsell_purchases")
        .update({ status: "failed" })
        .eq("id", upsellPurchase.id);

      return NextResponse.json(
        {
          error: "Payment failed",
          message: stripeError.message || "Unknown error"
        },
        { status: 402 }
      );
    }

  } catch (error) {
    console.error("Error in upsell purchase:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
