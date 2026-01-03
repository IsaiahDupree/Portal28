import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");
  return new Resend(apiKey);
}

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, body } = await req.json();

  if (!title || !body) {
    return NextResponse.json({ error: "Title and body required" }, { status: 400 });
  }

  const { data: members } = await supabase
    .from("entitlements")
    .select("user_id")
    .eq("scope_type", "membership_tier")
    .eq("status", "active");

  if (!members?.length) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const userIds = Array.from(new Set(members.map((m) => m.user_id)));

  const { data: users } = await supabase
    .from("users")
    .select("email")
    .in("id", userIds);

  const emails = users?.map((u) => u.email).filter(Boolean) ?? [];

  if (!emails.length) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://portal28.io";
  const fromEmail = process.env.RESEND_FROM ?? "Portal28 Academy <hello@updates.portal28.academy>";

  let sent = 0;

  const resend = getResend();
  
  for (const email of emails) {
    try {
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `📢 ${title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="font-size: 24px;">${title}</h1>
            <div style="white-space: pre-wrap; line-height: 1.6;">${body}</div>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
            <p style="font-size: 14px; color: #666;">
              <a href="${siteUrl}/app/community" style="color: #000;">View in Community</a>
            </p>
          </div>
        `,
      });
      sent++;
    } catch (e) {
      console.error(`Failed to send to ${email}:`, e);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
