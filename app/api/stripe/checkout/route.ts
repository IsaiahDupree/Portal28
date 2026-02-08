import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getAttribCookie } from "@/lib/attribution/cookie";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

const Body = z.object({
  courseId: z.string().uuid(),
  event_id: z.string().min(8),
  bumpKeys: z.array(z.string()).optional(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'BRL']).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const { courseId, event_id, bumpKeys = [], currency = 'USD' } = parsed.data;
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  // If no currency provided, get user's preference
  let userCurrency = currency;
  if (!currency && auth.user) {
    const { data: pref } = await supabase
      .from("user_currency_preferences")
      .select("currency_code")
      .eq("user_id", auth.user.id)
      .single();
    userCurrency = pref?.currency_code || 'USD';
  }

  const { data: course } = await supabase
    .from("courses")
    .select("id,title,slug,stripe_price_id")
    .eq("id", courseId)
    .single();

  if (!course?.stripe_price_id) {
    return NextResponse.json({ error: "Course not purchasable" }, { status: 400 });
  }

  // Try to find a price in the user's preferred currency
  // First check if there's a course_prices entry for this currency
  const { data: coursePrice } = await supabase
    .from("course_prices")
    .select("stripe_price_id, currency")
    .eq("course_id", courseId)
    .eq("currency", userCurrency)
    .eq("is_active", true)
    .single();

  // Use currency-specific price if available, otherwise fall back to default
  const stripePriceId = coursePrice?.stripe_price_id || course.stripe_price_id;

  // Build line items array starting with the main course
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: stripePriceId, quantity: 1 }
  ];

  // Fetch and add order bump products if any were selected
  let bumpProducts: any[] = [];
  if (bumpKeys.length > 0) {
    const { data: bumps } = await supabase
      .from("offers")
      .select("key, title, payload")
      .in("key", bumpKeys)
      .eq("kind", "order_bump")
      .eq("is_active", true);

    if (bumps && bumps.length > 0) {
      bumpProducts = bumps;

      // Add bump products as line items
      // Note: Bumps should have stripe_price_id in their payload
      for (const bump of bumps) {
        const stripePriceId = bump.payload?.stripe_price_id;
        if (stripePriceId) {
          lineItems.push({ price: stripePriceId, quantity: 1 });
        }
      }
    }
  }

  const attrib = getAttribCookie();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/app?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/courses/${course.slug}?canceled=1`,
    allow_promotion_codes: true,
    metadata: {
      course_id: course.id,
      event_id,
      user_id: auth.user?.id ?? "",
      utm_source: attrib?.utm_source ?? "",
      utm_campaign: attrib?.utm_campaign ?? "",
      fbclid: attrib?.fbclid ?? "",
      bump_keys: bumpKeys.join(","), // Store selected bump keys for webhook processing
    }
  });

  await supabase.from("orders").insert({
    course_id: course.id,
    user_id: auth.user?.id ?? null,
    email: auth.user?.email ?? null,
    stripe_session_id: session.id,
    status: "pending",
    meta_event_id: event_id,
    currency: userCurrency
  });

  return NextResponse.json({ url: session.url });
}
