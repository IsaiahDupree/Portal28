import { supabaseAdmin } from "@/lib/supabase/admin";

// Bot detection heuristics
const BOT_USER_AGENTS = [
  "barracuda",
  "proofpoint",
  "mimecast",
  "messagelabs",
  "ironport",
  "fortigate",
  "fireeye",
  "symantec",
  "mcafee",
  "sophos",
  "kaspersky",
  "norton",
  "eset",
  "bitdefender",
  "trend micro",
  "avira",
  "avg",
  "f-secure",
  "webroot",
  "malwarebytes"
];

const CLICK_BOT_THRESHOLD_MS = 2000; // Clicks within 2 seconds of delivery = suspected bot

export interface EmailEvent {
  event_type: string;
  email: string;
  resend_email_id?: string;
  clicked_link?: string;
  user_agent?: string;
  ip_address?: string;
  bounce_type?: string;
  bounce_reason?: string;
  raw_payload?: Record<string, unknown>;
  timestamp?: Date;
}

export function detectBot(event: EmailEvent, deliveredAt?: Date): {
  isSuspectedBot: boolean;
  reason?: string;
} {
  // Check user agent for known security scanners
  if (event.user_agent) {
    const ua = event.user_agent.toLowerCase();
    for (const botPattern of BOT_USER_AGENTS) {
      if (ua.includes(botPattern)) {
        return { isSuspectedBot: true, reason: `security_scanner:${botPattern}` };
      }
    }
  }

  // Check if click happened too fast after delivery
  if (event.event_type === "clicked" && deliveredAt && event.timestamp) {
    const timeSinceDelivery = event.timestamp.getTime() - deliveredAt.getTime();
    if (timeSinceDelivery < CLICK_BOT_THRESHOLD_MS) {
      return { isSuspectedBot: true, reason: `fast_click:${timeSinceDelivery}ms` };
    }
  }

  return { isSuspectedBot: false };
}

export async function processEmailEvent(event: EmailEvent): Promise<void> {
  const now = new Date();

  // Find the send record by resend_email_id
  let sendRecord = null;
  if (event.resend_email_id) {
    const { data } = await supabaseAdmin
      .from("email_sends")
      .select("id, status, created_at")
      .eq("resend_email_id", event.resend_email_id)
      .maybeSingle();
    sendRecord = data;
  }

  // Detect bot clicks
  const botDetection = detectBot(
    { ...event, timestamp: now },
    sendRecord?.created_at ? new Date(sendRecord.created_at) : undefined
  );

  // Insert event record
  await supabaseAdmin.from("email_events").insert({
    send_id: sendRecord?.id,
    email: event.email,
    event_type: event.event_type,
    resend_email_id: event.resend_email_id,
    clicked_link: event.clicked_link,
    user_agent: event.user_agent,
    ip_address: event.ip_address,
    is_suspected_bot: botDetection.isSuspectedBot,
    bot_detection_reason: botDetection.reason,
    bounce_type: event.bounce_type,
    bounce_reason: event.bounce_reason,
    raw_payload: event.raw_payload
  });

  // Update send record based on event type
  if (sendRecord) {
    const updates: Record<string, unknown> = {};

    switch (event.event_type) {
      case "delivered":
        updates.status = "delivered";
        break;

      case "opened":
        if (!sendRecord.status || sendRecord.status === "delivered") {
          updates.opened_at = now.toISOString();
        }
        // Increment open count using raw SQL
        await supabaseAdmin.rpc("increment_send_opens", { send_id: sendRecord.id });
        break;

      case "clicked":
        if (!sendRecord.status || ["delivered", "opened"].includes(sendRecord.status)) {
          updates.clicked_at = now.toISOString();
        }
        // Increment click counts
        await supabaseAdmin.rpc("increment_send_clicks", {
          send_id: sendRecord.id,
          is_human: !botDetection.isSuspectedBot
        });
        break;

      case "bounced":
        updates.status = "bounced";
        break;

      case "complained":
        updates.status = "complained";
        break;
    }

    if (Object.keys(updates).length > 0) {
      await supabaseAdmin
        .from("email_sends")
        .update(updates)
        .eq("id", sendRecord.id);
    }
  }

  // Update contact engagement
  await updateContactEngagement(event.email, event.event_type, botDetection.isSuspectedBot);

  // Handle suppression for bounces/complaints
  if (["bounced", "complained"].includes(event.event_type)) {
    await supabaseAdmin
      .from("email_contacts")
      .update({ suppressed: true, unsubscribed: true })
      .eq("email", event.email);
  }
}

async function updateContactEngagement(
  email: string,
  eventType: string,
  isBotClick: boolean
): Promise<void> {
  const now = new Date().toISOString();

  // Upsert contact engagement record
  const { data: existing } = await supabaseAdmin
    .from("contact_engagement")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  const updates: Record<string, unknown> = { updated_at: now };

  switch (eventType) {
    case "sent":
      updates.total_sends = (existing?.total_sends || 0) + 1;
      if (!existing?.first_send_at) updates.first_send_at = now;
      updates.last_send_at = now;
      break;

    case "delivered":
      updates.total_delivered = (existing?.total_delivered || 0) + 1;
      break;

    case "opened":
      updates.total_opens = (existing?.total_opens || 0) + 1;
      if (!existing?.first_open_at) updates.first_open_at = now;
      updates.last_open_at = now;
      updates.last_engaged_at = now;
      updates.engagement_score = (existing?.engagement_score || 0) + 1; // +1 for open
      break;

    case "clicked":
      updates.total_clicks = (existing?.total_clicks || 0) + 1;
      if (!isBotClick) {
        updates.total_human_clicks = (existing?.total_human_clicks || 0) + 1;
        updates.engagement_score = (existing?.engagement_score || 0) + 3; // +3 for human click
      }
      if (!existing?.first_click_at) updates.first_click_at = now;
      updates.last_click_at = now;
      updates.last_engaged_at = now;
      break;

    case "replied":
      updates.total_replies = (existing?.total_replies || 0) + 1;
      if (!existing?.first_reply_at) updates.first_reply_at = now;
      updates.last_reply_at = now;
      updates.last_engaged_at = now;
      updates.engagement_score = (existing?.engagement_score || 0) + 5; // +5 for reply
      break;

    case "unsubscribed":
      updates.total_unsubscribes = (existing?.total_unsubscribes || 0) + 1;
      break;

    case "bounced":
      updates.total_bounces = (existing?.total_bounces || 0) + 1;
      break;

    case "complained":
      updates.total_complaints = (existing?.total_complaints || 0) + 1;
      break;
  }

  if (existing) {
    await supabaseAdmin
      .from("contact_engagement")
      .update(updates)
      .eq("email", email);
  } else {
    await supabaseAdmin
      .from("contact_engagement")
      .insert({ email, ...updates });
  }
}

export async function computeProgramStats(programId: string): Promise<void> {
  // Get all sends for this program
  const { data: sends } = await supabaseAdmin
    .from("email_sends")
    .select("id, status, open_count, click_count, human_click_count, is_replied")
    .eq("program_id", programId);

  if (!sends || sends.length === 0) return;

  const stats = {
    total_sends: sends.length,
    total_delivered: 0,
    total_opened: 0,
    total_clicked: 0,
    total_human_clicked: 0,
    total_replied: 0,
    total_bounced: 0,
    total_complained: 0,
    total_unsubscribed: 0,
    suspected_bot_clicks: 0
  };

  for (const send of sends) {
    if (send.status === "delivered") stats.total_delivered++;
    if (send.status === "bounced") stats.total_bounced++;
    if (send.status === "complained") stats.total_complained++;
    if (send.open_count > 0) stats.total_opened++;
    if (send.click_count > 0) stats.total_clicked++;
    if (send.human_click_count > 0) stats.total_human_clicked++;
    if (send.is_replied) stats.total_replied++;
    
    // Bot clicks = total clicks - human clicks
    stats.suspected_bot_clicks += (send.click_count || 0) - (send.human_click_count || 0);
  }

  // Calculate rates
  const delivered = stats.total_delivered || 1; // Avoid division by zero
  const rates = {
    delivery_rate: stats.total_delivered / stats.total_sends,
    open_rate: stats.total_opened / delivered,
    click_rate: stats.total_clicked / delivered,
    human_click_rate: stats.total_human_clicked / delivered,
    reply_rate: stats.total_replied / delivered,
    bounce_rate: stats.total_bounced / stats.total_sends,
    complaint_rate: stats.total_complained / stats.total_sends,
    unsubscribe_rate: stats.total_unsubscribed / delivered
  };

  // Upsert stats
  await supabaseAdmin
    .from("email_program_stats")
    .upsert({
      program_id: programId,
      ...stats,
      ...rates,
      computed_at: new Date().toISOString()
    });
}

export async function getContactTimeline(email: string, limit = 50): Promise<{
  events: Array<{
    id: string;
    event_type: string;
    clicked_link?: string;
    is_suspected_bot: boolean;
    created_at: string;
  }>;
  engagement: {
    score: number;
    lastEngaged: string | null;
  } | null;
}> {
  const [eventsResult, engagementResult] = await Promise.all([
    supabaseAdmin
      .from("email_events")
      .select("id, event_type, clicked_link, is_suspected_bot, created_at")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabaseAdmin
      .from("contact_engagement")
      .select("engagement_score, last_engaged_at")
      .eq("email", email)
      .maybeSingle()
  ]);

  return {
    events: eventsResult.data || [],
    engagement: engagementResult.data ? {
      score: engagementResult.data.engagement_score,
      lastEngaged: engagementResult.data.last_engaged_at
    } : null
  };
}
