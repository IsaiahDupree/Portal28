import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const PurchaseGiftSchema = z.object({
  courseId: z.string().uuid(),
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  personalMessage: z.string().optional(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'BRL']).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = PurchaseGiftSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { courseId, recipientEmail, recipientName, personalMessage, currency = 'USD' } = parsed.data;

  // Prevent gifting to yourself
  if (recipientEmail.toLowerCase() === user.email?.toLowerCase()) {
    return NextResponse.json(
      { error: "You cannot gift a course to yourself" },
      { status: 400 }
    );
  }

  // Get course details
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, title, slug, stripe_price_id")
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Get course price (this would need to be enhanced for multi-currency)
  const { data: coursePrice } = await supabase
    .from("course_prices")
    .select("price_cents, currency")
    .eq("course_id", courseId)
    .eq("currency", currency)
    .eq("is_active", true)
    .single();

  const priceCents = coursePrice?.price_cents || 9900; // Default $99

  // Generate unique gift code
  const { data: codeData, error: codeError } = await supabase
    .rpc('generate_gift_code');

  if (codeError || !codeData) {
    console.error("Error generating gift code:", codeError);
    return NextResponse.json({ error: "Failed to generate gift code" }, { status: 500 });
  }

  const giftCode = codeData as string;

  // Create gift code record
  const { data: giftRecord, error: giftError } = await supabase
    .from("gift_codes")
    .insert({
      code: giftCode,
      course_id: courseId,
      purchaser_user_id: user.id,
      purchaser_email: user.email,
      recipient_email: recipientEmail,
      recipient_name: recipientName || null,
      personal_message: personalMessage || null,
      amount_cents: priceCents,
      currency: currency,
      status: 'pending',
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
    })
    .select()
    .single();

  if (giftError) {
    console.error("Error creating gift code:", giftError);
    return NextResponse.json({ error: "Failed to create gift" }, { status: 500 });
  }

  // TODO: In production, integrate with Stripe to actually charge the purchaser
  // For now, we'll mark it as 'sent' immediately

  // Update status to 'sent' and send email notification
  const { error: updateError } = await supabase
    .from("gift_codes")
    .update({ status: 'sent' })
    .eq("id", giftRecord.id);

  if (updateError) {
    console.error("Error updating gift status:", updateError);
  }

  // TODO: Send email to recipient with redemption link
  // For now, return the gift details

  return NextResponse.json({
    success: true,
    gift: {
      id: giftRecord.id,
      code: giftCode,
      courseTitle: course.title,
      recipientEmail,
      recipientName,
    },
  });
}
