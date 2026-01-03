import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getAttribCookie } from "@/lib/attribution/cookie";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

const Body = z.object({
  courseId: z.string().uuid(),
  event_id: z.string().min(8)
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const { courseId, event_id } = parsed.data;
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  const { data: course } = await supabase
    .from("courses")
    .select("id,title,slug,stripe_price_id")
    .eq("id", courseId)
    .single();

  if (!course?.stripe_price_id) {
    return NextResponse.json({ error: "Course not purchasable" }, { status: 400 });
  }

  const attrib = getAttribCookie();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: course.stripe_price_id, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/app?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/courses/${course.slug}?canceled=1`,
    allow_promotion_codes: true,
    metadata: {
      course_id: course.id,
      event_id,
      user_id: auth.user?.id ?? "",
      utm_source: attrib?.utm_source ?? "",
      utm_campaign: attrib?.utm_campaign ?? "",
      fbclid: attrib?.fbclid ?? ""
    }
  });

  await supabase.from("orders").insert({
    course_id: course.id,
    user_id: auth.user?.id ?? null,
    email: auth.user?.email ?? null,
    stripe_session_id: session.id,
    status: "pending",
    meta_event_id: event_id
  });

  return NextResponse.json({ url: session.url });
}
