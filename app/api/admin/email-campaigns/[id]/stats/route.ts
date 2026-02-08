import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

// GET - Get campaign statistics
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  // Get send statistics
  const { data: sends, error: sendsError } = await supabaseAdmin
    .from("email_campaign_sends")
    .select("status, opened_at, clicked_at, open_count, click_count")
    .eq("campaign_id", params.id);

  if (sendsError) {
    return NextResponse.json(
      { error: sendsError.message },
      { status: 500 }
    );
  }

  // Calculate statistics
  const total_sent = sends?.filter(s => s.status === "sent" || s.status === "delivered").length || 0;
  const total_delivered = sends?.filter(s => s.status === "delivered").length || 0;
  const total_bounced = sends?.filter(s => s.status === "bounced").length || 0;
  const total_failed = sends?.filter(s => s.status === "failed").length || 0;

  const unique_opens = sends?.filter(s => s.opened_at).length || 0;
  const total_opens = sends?.reduce((sum, s) => sum + (s.open_count || 0), 0) || 0;

  const unique_clicks = sends?.filter(s => s.clicked_at).length || 0;
  const total_clicks = sends?.reduce((sum, s) => sum + (s.click_count || 0), 0) || 0;

  // Calculate rates
  const delivery_rate = total_sent > 0 ? (total_delivered / total_sent) * 100 : 0;
  const open_rate = total_delivered > 0 ? (unique_opens / total_delivered) * 100 : 0;
  const click_rate = total_delivered > 0 ? (unique_clicks / total_delivered) * 100 : 0;
  const click_to_open_rate = unique_opens > 0 ? (unique_clicks / unique_opens) * 100 : 0;

  // Update campaign stats
  await supabaseAdmin
    .from("email_campaigns")
    .update({
      total_sent,
      total_delivered,
      total_bounced,
      total_failed,
      total_opens,
      unique_opens,
      total_clicks,
      unique_clicks
    })
    .eq("id", params.id);

  const stats = {
    campaign_id: params.id,
    campaign_name: campaign.name,
    status: campaign.status,

    // Send stats
    total_recipients: campaign.total_recipients || 0,
    total_sent,
    total_delivered,
    total_bounced,
    total_failed,

    // Engagement stats
    unique_opens,
    total_opens,
    unique_clicks,
    total_clicks,

    // Rates
    delivery_rate: Math.round(delivery_rate * 100) / 100,
    open_rate: Math.round(open_rate * 100) / 100,
    click_rate: Math.round(click_rate * 100) / 100,
    click_to_open_rate: Math.round(click_to_open_rate * 100) / 100,

    // Timestamps
    sent_at: campaign.sent_at,
    created_at: campaign.created_at
  };

  return NextResponse.json({ stats });
}
