import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resend, RESEND_FROM } from "@/lib/email/resend";

async function checkAdmin(supabase: ReturnType<typeof supabaseServer>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return user;
}

// POST - Send test email
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { to_email } = body;

  if (!to_email) {
    return NextResponse.json(
      { error: "to_email is required" },
      { status: 400 }
    );
  }

  // Get campaign
  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from("email_campaigns")
    .select("*")
    .eq("id", params.id)
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  try {
    // Send test email
    const result = await resend.emails.send({
      from: RESEND_FROM,
      to: to_email,
      subject: `[TEST] ${campaign.subject}`,
      html: campaign.html_content,
      text: campaign.plain_text,
      tags: [
        { name: "type", value: "test" },
        { name: "campaign_id", value: params.id }
      ]
    });

    return NextResponse.json({
      success: true,
      email_id: result.data?.id,
      message: `Test email sent to ${to_email}`
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to send test email: ${error.message}` },
      { status: 500 }
    );
  }
}
