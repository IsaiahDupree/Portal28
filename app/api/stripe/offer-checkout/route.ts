import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { capiTrack } from "@/lib/meta/capiTrack";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const BodySchema = z.object({
  offerKey: z.string().min(1),
  eventId: z.string().min(8),
  next: z.string().optional(),
  placementKey: z.string().optional(),
  anonSessionId: z.string().optional(),
  meta: z
    .object({
      fbp: z.string().nullable().optional(),
      fbc: z.string().nullable().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { offerKey, eventId, next, placementKey, anonSessionId, meta } = parsed.data;

  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;
  const ua = req.headers.get("user-agent") || null;

  const { data: offer, error: offerErr } = await supabase
    .from("offers")
    .select("*")
    .eq("key", offerKey)
    .eq("is_active", true)
    .single();

  if (offerErr || !offer) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }

  const kind = offer.kind as string;
  const payload = offer.payload as Record<string, unknown>;

  let priceId: string | null = null;
  let mode: Stripe.Checkout.SessionCreateParams.Mode = "payment";
  let successUrl = `${process.env.NEXT_PUBLIC_SITE_URL}${next || "/app"}?success=1`;
  const cancelUrl = `${process.env.NEXT_PUBLIC_SITE_URL}${next || "/"}?canceled=1`;

  if (kind === "membership") {
    const tier = payload.tier as string;
    const interval = payload.interval as string;

    const { data: plan } = await supabase
      .from("membership_plans")
      .select("stripe_price_id_monthly, stripe_price_id_yearly")
      .eq("tier", tier)
      .single();

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    priceId =
      interval === "yearly"
        ? plan.stripe_price_id_yearly
        : plan.stripe_price_id_monthly;
    mode = "subscription";
  } else if (kind === "course") {
    const courseSlug = payload.courseSlug as string;

    const { data: course } = await supabase
      .from("courses")
      .select("stripe_price_id")
      .eq("slug", courseSlug)
      .single();

    if (!course?.stripe_price_id) {
      return NextResponse.json({ error: "Course not purchasable" }, { status: 404 });
    }

    priceId = course.stripe_price_id;
    mode = "payment";
  } else if (kind === "bundle") {
    const courseSlug = payload.courseSlug as string;
    const tier = payload.tier as string;
    const trialDays = (payload.trialDays as number) || 0;

    const { data: course } = await supabase
      .from("courses")
      .select("stripe_price_id")
      .eq("slug", courseSlug)
      .single();

    if (!course?.stripe_price_id) {
      return NextResponse.json({ error: "Course not purchasable" }, { status: 404 });
    }

    priceId = course.stripe_price_id;
    mode = "payment";
  } else {
    return NextResponse.json({ error: "Unknown offer kind" }, { status: 400 });
  }

  if (!priceId) {
    return NextResponse.json({ error: "Price not configured" }, { status: 400 });
  }

  await supabase.from("checkout_attempts").insert({
    offer_key: offerKey,
    event_id: eventId,
    placement_key: placementKey || null,
    anon_session_id: anonSessionId || null,
    user_id: user?.id || null,
    meta_fbp: meta?.fbp || null,
    meta_fbc: meta?.fbc || null,
    client_ip: ip,
    client_ua: ua,
    status: "created",
  });

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      offer_key: offerKey,
      meta_event_id: eventId,
      kind,
      user_id: user?.id || "",
      placement_key: placementKey || "",
    },
  };

  if (mode === "subscription") {
    const trialDays = (payload.trialDays as number) || 0;
    if (trialDays > 0) {
      sessionParams.subscription_data = {
        trial_period_days: trialDays,
      };
    }
  }

  if (user?.email) {
    sessionParams.customer_email = user.email;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  await supabase
    .from("checkout_attempts")
    .update({ stripe_session_id: session.id, status: "redirected" })
    .eq("event_id", eventId);

  await capiTrack({
    eventName: "InitiateCheckout",
    eventId,
    offerKey,
    customData: { content_name: offer.title, content_category: kind },
    userData: {
      email: user?.email ?? undefined,
      fbp: meta?.fbp ?? undefined,
      fbc: meta?.fbc ?? undefined,
    },
    client: { ip, ua },
  });

  return NextResponse.json({ url: session.url });
}
