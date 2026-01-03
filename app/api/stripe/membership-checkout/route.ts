// app/api/stripe/membership-checkout/route.ts
// Subscription membership checkout

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { priceId, tier, billingPeriod = "monthly", successUrl, cancelUrl } = body;

    if (!priceId || !tier) {
      return NextResponse.json({ error: "Missing priceId or tier" }, { status: 400 });
    }

    // Get or create Stripe customer
    let stripeCustomerId: string;

    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingSub?.stripe_customer_id) {
      stripeCustomerId = existingSub.stripe_customer_id;
    } else {
      // Check if customer exists by email
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      
      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id;
      } else {
        // Create new customer
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            user_id: user.id,
            source: "portal28_membership"
          }
        });
        stripeCustomerId = customer.id;
      }
    }

    // Generate event_id for Meta tracking
    const event_id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/app?membership=success`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        tier,
        billing_period: billingPeriod,
        event_id,
        source: "membership_checkout"
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          tier
        }
      },
      allow_promotion_codes: true
    });

    // Log paywall event
    await supabase.from("paywall_events").insert({
      user_id: user.id,
      email: user.email,
      event_type: "start_checkout",
      paywall_type: "membership",
      offer_tier: tier,
      offer_price_id: priceId,
      source: body.source || "pricing_page"
    });

    return NextResponse.json({ 
      url: session.url,
      sessionId: session.id 
    });

  } catch (error) {
    console.error("Membership checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
