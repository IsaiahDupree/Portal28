import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendCapiPurchase } from "@/lib/meta/capi";
import { sendCourseAccessEmail } from "@/lib/email/sendCourseAccessEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const courseId = session.metadata?.course_id;
    const bundleCourseIds = session.metadata?.bundle_course_ids
      ? JSON.parse(session.metadata.bundle_course_ids)
      : null;
    const kind = session.metadata?.kind || null;
    const event_id = session.metadata?.event_id || session.metadata?.meta_event_id;
    const userId = session.metadata?.user_id || null;
    const email = session.customer_details?.email || null;

    // Email attribution tracking (eid = email send ID)
    const emailSendId = session.metadata?.eid || null;
    const emailProgramId = session.metadata?.email_program_id || null;
    const emailCampaign = session.metadata?.utm_campaign || null;

    const amountTotal = (session.amount_total ?? 0) / 100;
    const currency = (session.currency ?? "usd").toUpperCase();

    // Extract promo code information
    let promoCode: string | null = null;
    let discountAmount: number | null = null;
    let discountPercent: number | null = null;
    let amountBeforeDiscount: number | null = null;

    if (session.total_details?.amount_discount && session.total_details.amount_discount > 0) {
      // Fetch full session details to get discount info
      try {
        const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['total_details.breakdown']
        });

        if (fullSession.total_details?.breakdown?.discounts && fullSession.total_details.breakdown.discounts.length > 0) {
          const discount = fullSession.total_details.breakdown.discounts[0];
          discountAmount = discount.amount;

          // Get the promotion code details
          if (discount.discount.promotion_code) {
            const promoCodeObj = await stripe.promotionCodes.retrieve(discount.discount.promotion_code as string);
            promoCode = promoCodeObj.code;
          }

          // Calculate percentage if it's a percentage discount
          if (discount.discount.coupon?.percent_off) {
            discountPercent = discount.discount.coupon.percent_off;
          }

          // Calculate original amount
          amountBeforeDiscount = (session.amount_total ?? 0) + discountAmount;
        }
      } catch (err) {
        console.error("Error fetching discount details:", err);
      }
    }

    // Handle both single course purchases and bundle purchases
    if ((courseId || bundleCourseIds) && event_id) {
      const { data: existing } = await supabaseAdmin
        .from("orders")
        .select("id,status")
        .eq("stripe_session_id", session.id)
        .maybeSingle();

      if (existing?.status !== "paid") {
        await supabaseAdmin
          .from("orders")
          .update({
            status: "paid",
            stripe_payment_intent: (session.payment_intent as string) ?? null,
            amount: session.amount_total ?? null,
            currency: session.currency ?? null,
            email,
            // Email attribution
            email_send_id: emailSendId,
            email_program_id: emailProgramId,
            email_campaign: emailCampaign,
            // Promo code tracking
            promo_code: promoCode,
            discount_amount: discountAmount,
            discount_percent: discountPercent,
            amount_before_discount: amountBeforeDiscount
          })
          .eq("stripe_session_id", session.id);

        // Grant entitlements for all courses (single or bundle)
        const courseIdsToGrant = bundleCourseIds || [courseId];
        const entitlements = courseIdsToGrant.map((cid: string) => ({
          course_id: cid,
          user_id: userId || null,
          email,
          status: "active"
        }));

        await supabaseAdmin.from("entitlements").insert(entitlements);

        // Process affiliate referral if present
        const affiliateCode = session.metadata?.affiliate_code;
        if (affiliateCode) {
          try {
            const { data: order } = await supabaseAdmin
              .from("orders")
              .select("id")
              .eq("stripe_session_id", session.id)
              .single();

            if (order) {
              await supabaseAdmin.rpc("process_affiliate_referral", {
                p_order_id: order.id,
                p_affiliate_code: affiliateCode,
              });
            }
          } catch (affiliateErr) {
            console.error("Error processing affiliate referral:", affiliateErr);
            // Don't fail the entire webhook if affiliate tracking fails
          }
        }

        await sendCapiPurchase({
          event_id,
          value: amountTotal,
          currency: currency.toLowerCase(),
          email: email ?? undefined,
          content_ids: courseIdsToGrant
        });

        // Send course access email(s)
        if (email) {
          if (kind === "bundle" && bundleCourseIds) {
            // For bundles, send a bundle access email with all courses
            const { data: courses } = await supabaseAdmin
              .from("courses")
              .select("title,slug")
              .in("id", bundleCourseIds);

            if (courses && courses.length > 0) {
              try {
                // Send bundle email with first course, mentioning it's a bundle
                await sendCourseAccessEmail({
                  to: email,
                  courseName: `Bundle: ${courses.map(c => c.title).join(", ")}`,
                  courseSlug: courses[0].slug
                });
              } catch (emailErr) {
                console.error("Failed to send bundle access email:", emailErr);
              }
            }
          } else if (courseId) {
            // Single course purchase
            const { data: course } = await supabaseAdmin
              .from("courses")
              .select("title,slug")
              .eq("id", courseId)
              .single();

            if (course) {
              try {
                await sendCourseAccessEmail({
                  to: email,
                  courseName: course.title,
                  courseSlug: course.slug
                });
              } catch (emailErr) {
                console.error("Failed to send course access email:", emailErr);
              }
            }
          }

          // Mark contact as customer
          await supabaseAdmin
            .from("email_contacts")
            .upsert(
              { email, is_customer: true, source: "purchase" },
              { onConflict: "email" }
            );
        }

        // Update email program stats with attributed revenue
        if (emailProgramId) {
          await supabaseAdmin.rpc("attribute_revenue_to_program", {
            p_program_id: emailProgramId,
            p_revenue_cents: session.amount_total ?? 0
          });
        }
      }
    }
  }

  // ==========================================================================
  // SUBSCRIPTION EVENTS (Membership)
  // ==========================================================================
  
  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.user_id;
    const tier = subscription.metadata?.tier || "member";
    const stripeCustomerId = subscription.customer as string;
    
    if (userId) {
      // Extract price details from subscription
      const priceData = subscription.items.data[0]?.price;
      const priceCents = priceData?.unit_amount || 0;
      const interval = priceData?.recurring?.interval || "month"; // 'month' or 'year'

      await supabaseAdmin.from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceData?.id,
        tier,
        status: subscription.status,
        price_cents: priceCents,
        interval: interval,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
      }, { onConflict: "stripe_subscription_id" });

      // Create/update membership entitlement
      if (subscription.status === "active" || subscription.status === "trialing") {
        await supabaseAdmin.from("entitlements").upsert({
          user_id: userId,
          scope_type: "membership_tier",
          scope_id: tier,
          status: "active",
          source: "stripe_membership",
          starts_at: new Date(subscription.current_period_start * 1000).toISOString(),
          ends_at: new Date(subscription.current_period_end * 1000).toISOString()
        }, { onConflict: "user_id,scope_type,scope_id" });

        // Log paywall conversion
        await supabaseAdmin.from("paywall_events").insert({
          user_id: userId,
          event_type: subscription.status === "trialing" ? "start_trial" : "subscribe",
          paywall_type: "membership",
          offer_tier: tier,
          converted: true,
          source: "stripe_webhook"
        });
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.user_id;
    const tier = subscription.metadata?.tier || "member";

    // Update subscription status
    await supabaseAdmin
      .from("subscriptions")
      .update({ 
        status: "canceled",
        canceled_at: new Date().toISOString()
      })
      .eq("stripe_subscription_id", subscription.id);

    // Revoke membership entitlement
    if (userId) {
      await supabaseAdmin
        .from("entitlements")
        .update({ status: "expired", ends_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("scope_type", "membership_tier")
        .eq("scope_id", tier);
    }
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = invoice.subscription as string;

    if (subscriptionId) {
      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "past_due" })
        .eq("stripe_subscription_id", subscriptionId);
    }
  }

  // ==========================================================================
  // REFUND EVENTS
  // ==========================================================================

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntent = charge.payment_intent as string | null;
    if (paymentIntent) {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id,course_id,user_id,email")
        .eq("stripe_payment_intent", paymentIntent)
        .maybeSingle();

      if (order) {
        await supabaseAdmin.from("orders").update({ status: "refunded" }).eq("id", order.id);

        await supabaseAdmin
          .from("entitlements")
          .update({ status: "revoked", revoked_at: new Date().toISOString() })
          .eq("course_id", order.course_id)
          .or(`user_id.eq.${order.user_id},email.eq.${order.email}`);
      }
    }
  }

  return NextResponse.json({ received: true });
}
