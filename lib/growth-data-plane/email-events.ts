/**
 * Growth Data Plane - Email Event Integration
 * Integrates Resend webhook events with the Growth Data Plane schema
 */

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface GDPEmailEvent {
  email: string;
  event_type: "delivered" | "opened" | "clicked" | "bounced" | "complained";
  resend_email_id: string;
  subject?: string;
  from_email?: string;
  link_url?: string;
  tags?: string[];
  user_agent?: string;
  ip_address?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Processes an email event from Resend webhooks into the Growth Data Plane
 * Implements GDP-004 and GDP-005
 */
export async function processGDPEmailEvent(event: GDPEmailEvent): Promise<void> {
  try {
    // Step 1: Upsert person from email (GDP-002)
    const { data: person, error: personError } = await supabaseAdmin
      .rpc("upsert_person_from_email", {
        p_email: event.email.toLowerCase().trim(),
      })
      .single();

    if (personError) {
      console.error("Failed to upsert person:", personError);
      throw personError;
    }

    const personId = person as unknown as string;

    // Step 2: Find or create email_message record
    let emailMessage;
    const { data: existingMessage } = await supabaseAdmin
      .from("email_message")
      .select("id")
      .eq("resend_id", event.resend_email_id)
      .maybeSingle();

    if (existingMessage) {
      emailMessage = existingMessage;
    } else {
      // Create new email_message record
      const { data: newMessage, error: messageError } = await supabaseAdmin
        .from("email_message")
        .insert({
          person_id: personId,
          email: event.email.toLowerCase().trim(),
          subject: event.subject,
          from_email: event.from_email,
          resend_id: event.resend_email_id,
          tags: event.tags ? JSON.stringify(event.tags) : "[]",
          metadata: event.metadata || {},
        })
        .select("id")
        .single();

      if (messageError) {
        console.error("Failed to create email_message:", messageError);
        throw messageError;
      }

      emailMessage = newMessage;
    }

    // Step 3: Record email_event (GDP-005)
    const { error: eventError } = await supabaseAdmin
      .from("email_event")
      .insert({
        email_message_id: emailMessage.id,
        person_id: personId,
        event_type: event.event_type,
        link_url: event.link_url,
        metadata: {
          user_agent: event.user_agent,
          ip_address: event.ip_address,
          ...event.metadata,
        },
      });

    if (eventError) {
      console.error("Failed to create email_event:", eventError);
      throw eventError;
    }

    // Step 4: Track unified event (GDP-003)
    await supabaseAdmin.rpc("track_event", {
      p_event_name: `email.${event.event_type}`,
      p_person_id: personId,
      p_source: "email",
      p_properties: {
        resend_email_id: event.resend_email_id,
        subject: event.subject,
        link_url: event.link_url,
      },
      p_context: {
        user_agent: event.user_agent,
        ip_address: event.ip_address,
      },
    });

    // Step 5: Link identity for Resend tracking
    await supabaseAdmin.rpc("link_identity", {
      p_person_id: personId,
      p_identity_type: "resend",
      p_identity_value: event.resend_email_id,
    });

    console.log(
      `GDP: Processed ${event.event_type} event for ${event.email} (person_id: ${personId})`
    );
  } catch (error) {
    console.error("Failed to process GDP email event:", error);
    throw error;
  }
}

/**
 * Recompute person features after email events
 * Called periodically or after significant events
 */
export async function recomputePersonFeaturesForEmail(
  email: string
): Promise<void> {
  const { data: person } = await supabaseAdmin
    .from("person")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (person) {
    await supabaseAdmin.rpc("compute_person_features", {
      p_person_id: person.id,
    });
  }
}

/**
 * Get email engagement stats for a person
 */
export async function getPersonEmailStats(personId: string) {
  const { data: features } = await supabaseAdmin
    .from("person_features")
    .select(
      "email_opens_30d, email_clicks_30d, last_email_opened_at, last_email_clicked_at"
    )
    .eq("person_id", personId)
    .maybeSingle();

  const { data: events } = await supabaseAdmin
    .from("email_event")
    .select("event_type, timestamp")
    .eq("person_id", personId)
    .order("timestamp", { ascending: false })
    .limit(10);

  return {
    features: features || {
      email_opens_30d: 0,
      email_clicks_30d: 0,
      last_email_opened_at: null,
      last_email_clicked_at: null,
    },
    recent_events: events || [],
  };
}

/**
 * Get all email messages sent to a person
 */
export async function getPersonEmailMessages(
  personId: string,
  limit = 50
): Promise<
  Array<{
    id: string;
    subject: string | null;
    sent_at: string;
    resend_id: string | null;
    events: Array<{
      event_type: string;
      timestamp: string;
    }>;
  }>
> {
  const { data: messages } = await supabaseAdmin
    .from("email_message")
    .select(
      `
      id,
      subject,
      sent_at,
      resend_id,
      email_event (
        event_type,
        timestamp
      )
    `
    )
    .eq("person_id", personId)
    .order("sent_at", { ascending: false })
    .limit(limit);

  return (
    messages?.map((m) => ({
      id: m.id,
      subject: m.subject,
      sent_at: m.sent_at,
      resend_id: m.resend_id,
      events: Array.isArray(m.email_event) ? m.email_event : [],
    })) || []
  );
}

/**
 * Find all people who clicked a specific link
 */
export async function getPeopleWhoClickedLink(
  linkUrl: string,
  limit = 100
): Promise<
  Array<{
    person_id: string;
    email: string;
    clicked_at: string;
  }>
> {
  const { data } = await supabaseAdmin
    .from("email_event")
    .select(
      `
      person_id,
      timestamp,
      person (
        email
      )
    `
    )
    .eq("event_type", "clicked")
    .eq("link_url", linkUrl)
    .order("timestamp", { ascending: false })
    .limit(limit);

  return (
    data?.map((e) => ({
      person_id: e.person_id!,
      email: (e.person as any)?.email || "",
      clicked_at: e.timestamp,
    })) || []
  );
}

/**
 * Trigger segment evaluation for person after email engagement
 */
export async function evaluateSegmentsAfterEmailEvent(
  personId: string
): Promise<void> {
  // This will be implemented with GDP-012 (Segment Engine)
  // For now, just log
  console.log(`TODO: Evaluate segments for person ${personId}`);
}
