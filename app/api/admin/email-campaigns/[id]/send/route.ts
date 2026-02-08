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

// POST - Send campaign (immediately or schedule)
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
  const { send_now = true, scheduled_for } = body;

  // Get campaign
  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from("email_campaigns")
    .select("*")
    .eq("id", params.id)
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Validate campaign can be sent
  if (campaign.status === "sent") {
    return NextResponse.json(
      { error: "Campaign has already been sent" },
      { status: 400 }
    );
  }

  if (campaign.status === "sending") {
    return NextResponse.json(
      { error: "Campaign is already sending" },
      { status: 400 }
    );
  }

  if (!send_now && !scheduled_for) {
    return NextResponse.json(
      { error: "Must specify send_now or scheduled_for" },
      { status: 400 }
    );
  }

  // Get recipients from segment
  const { data: recipients, error: recipientsError } = await supabaseAdmin
    .rpc("get_campaign_recipients", { p_campaign_id: params.id });

  if (recipientsError) {
    return NextResponse.json(
      { error: `Failed to get recipients: ${recipientsError.message}` },
      { status: 500 }
    );
  }

  if (!recipients || recipients.length === 0) {
    return NextResponse.json(
      { error: "No recipients found for this segment" },
      { status: 400 }
    );
  }

  // If scheduling for later, just update status
  if (!send_now) {
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("email_campaigns")
      .update({
        status: "scheduled",
        scheduled_for,
        total_recipients: recipients.length
      })
      .eq("id", params.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      campaign: updated,
      message: `Campaign scheduled for ${scheduled_for} with ${recipients.length} recipients`
    });
  }

  // Send immediately
  try {
    // Update campaign status
    await supabaseAdmin
      .from("email_campaigns")
      .update({
        status: "sending",
        started_sending_at: new Date().toISOString(),
        total_recipients: recipients.length
      })
      .eq("id", params.id);

    // Create send records
    const sendRecords = recipients.map((recipient: any) => ({
      campaign_id: params.id,
      email: recipient.email,
      user_id: recipient.user_id,
      status: "queued"
    }));

    await supabaseAdmin
      .from("email_campaign_sends")
      .insert(sendRecords);

    // Send emails using Resend batch API
    const emailBatch = recipients.map((recipient: any) => ({
      from: RESEND_FROM,
      to: recipient.email,
      subject: campaign.subject,
      html: campaign.html_content,
      text: campaign.plain_text,
      tags: [
        { name: "campaign_id", value: params.id },
        { name: "campaign_name", value: campaign.name }
      ]
    }));

    const batchResponse = await resend.batch.send(emailBatch);

    // Update campaign with batch ID and status
    await supabaseAdmin
      .from("email_campaigns")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        completed_sending_at: new Date().toISOString(),
        resend_batch_id: batchResponse.data?.id || null,
        total_sent: recipients.length
      })
      .eq("id", params.id);

    // Update send records with Resend IDs if available
    if (batchResponse.data?.data) {
      const updates = batchResponse.data.data.map((item: any, index: number) => ({
        campaign_id: params.id,
        email: recipients[index].email,
        resend_email_id: item.id,
        status: "sent",
        sent_at: new Date().toISOString()
      }));

      // Update each send record
      for (const update of updates) {
        await supabaseAdmin
          .from("email_campaign_sends")
          .update({
            resend_email_id: update.resend_email_id,
            status: update.status,
            sent_at: update.sent_at
          })
          .eq("campaign_id", update.campaign_id)
          .eq("email", update.email);
      }
    }

    return NextResponse.json({
      success: true,
      sent_count: recipients.length,
      batch_id: batchResponse.data?.id
    });

  } catch (error: any) {
    // Update campaign with error
    await supabaseAdmin
      .from("email_campaigns")
      .update({
        status: "failed",
        error_message: error.message
      })
      .eq("id", params.id);

    return NextResponse.json(
      { error: `Failed to send campaign: ${error.message}` },
      { status: 500 }
    );
  }
}
