import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const RedeemSchema = z.object({
  code: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = RedeemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const { code } = parsed.data;

  // Call the redeem function
  const { data: result, error } = await supabase
    .rpc('redeem_gift_code', {
      gift_code_input: code.toUpperCase(),
      user_id_input: user.id,
    });

  if (error) {
    console.error("Error redeeming gift code:", error);
    return NextResponse.json({ error: "Failed to redeem gift" }, { status: 500 });
  }

  const redemptionResult = result as { success: boolean; error?: string; course_id?: string };

  if (!redemptionResult.success) {
    return NextResponse.json(
      { error: redemptionResult.error || "Failed to redeem gift" },
      { status: 400 }
    );
  }

  // Get course details
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, slug")
    .eq("id", redemptionResult.course_id)
    .single();

  return NextResponse.json({
    success: true,
    course: {
      id: course?.id,
      title: course?.title,
      slug: course?.slug,
    },
  });
}

// GET endpoint to check a gift code's details
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Code required" }, { status: 400 });
  }

  const supabase = supabaseServer();

  // Get gift code details
  const { data: gift, error } = await supabase
    .from("gift_codes")
    .select(`
      id,
      code,
      course_id,
      recipient_email,
      recipient_name,
      personal_message,
      status,
      expires_at,
      courses (
        id,
        title,
        description,
        slug
      )
    `)
    .eq("code", code.toUpperCase())
    .single();

  if (error || !gift) {
    return NextResponse.json({ error: "Gift code not found" }, { status: 404 });
  }

  // Check if expired
  if (gift.expires_at && new Date(gift.expires_at) < new Date()) {
    return NextResponse.json({ error: "Gift code has expired" }, { status: 400 });
  }

  // Check if already redeemed
  if (gift.status === 'redeemed') {
    return NextResponse.json({ error: "Gift code already redeemed" }, { status: 400 });
  }

  // Check if not yet sent
  if (gift.status === 'pending') {
    return NextResponse.json({ error: "Gift is still being processed" }, { status: 400 });
  }

  return NextResponse.json({
    gift: {
      code: gift.code,
      course: gift.courses,
      recipientName: gift.recipient_name,
      personalMessage: gift.personal_message,
      expiresAt: gift.expires_at,
    },
  });
}
