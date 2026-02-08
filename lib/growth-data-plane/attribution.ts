/**
 * Growth Data Plane - Attribution Tracking
 * GDP-006: Email → Click → Session → Conversion attribution spine
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

const ATTRIBUTION_COOKIE_NAME = "p28_attribution";
const ATTRIBUTION_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export interface AttributionData {
  anonymous_id: string;
  session_id: string;
  email_message_id?: string;
  link_url?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  first_landing_page?: string;
  first_referrer?: string;
  last_touch_at: string;
}

/**
 * Get or create attribution data from cookie
 */
export function getAttributionData(): AttributionData {
  const cookieStore = cookies();
  const existingCookie = cookieStore.get(ATTRIBUTION_COOKIE_NAME);

  if (existingCookie?.value) {
    try {
      return JSON.parse(existingCookie.value) as AttributionData;
    } catch (e) {
      console.error("Failed to parse attribution cookie:", e);
    }
  }

  // Create new attribution
  return {
    anonymous_id: uuidv4(),
    session_id: uuidv4(),
    last_touch_at: new Date().toISOString(),
  };
}

/**
 * Set attribution cookie
 */
export function setAttributionCookie(data: AttributionData): void {
  const cookieStore = cookies();
  cookieStore.set(ATTRIBUTION_COOKIE_NAME, JSON.stringify(data), {
    maxAge: ATTRIBUTION_COOKIE_MAX_AGE,
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}

/**
 * Update attribution with new touch point
 */
export function updateAttribution(updates: Partial<AttributionData>): AttributionData {
  const current = getAttributionData();

  const updated: AttributionData = {
    ...current,
    ...updates,
    last_touch_at: new Date().toISOString(),
  };

  setAttributionCookie(updated);
  return updated;
}

/**
 * Track email click attribution
 * Called when user clicks email link
 */
export async function trackEmailClickAttribution(
  emailMessageId: string,
  linkUrl: string,
  personId?: string
): Promise<void> {
  const attribution = getAttributionData();

  // Update attribution with email click
  const updated = updateAttribution({
    email_message_id: emailMessageId,
    link_url: linkUrl,
  });

  // Track click event
  await supabaseAdmin.rpc("track_event", {
    p_event_name: "attribution.email_click",
    p_person_id: personId || null,
    p_anonymous_id: updated.anonymous_id,
    p_session_id: updated.session_id,
    p_source: "email",
    p_properties: {
      email_message_id: emailMessageId,
      link_url: linkUrl,
    },
    p_context: {},
  });
}

/**
 * Track page view with attribution
 * Called on landing pages
 */
export async function trackPageViewAttribution(
  url: string,
  referrer: string | null,
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  }
): Promise<void> {
  const attribution = getAttributionData();

  const updates: Partial<AttributionData> = {};

  // Set first-touch attribution
  if (!attribution.first_landing_page) {
    updates.first_landing_page = url;
  }

  if (!attribution.first_referrer && referrer) {
    updates.first_referrer = referrer;
  }

  // Update UTM parameters (last-touch)
  if (utmParams) {
    if (utmParams.source) updates.utm_source = utmParams.source;
    if (utmParams.medium) updates.utm_medium = utmParams.medium;
    if (utmParams.campaign) updates.utm_campaign = utmParams.campaign;
    if (utmParams.content) updates.utm_content = utmParams.content;
    if (utmParams.term) updates.utm_term = utmParams.term;
  }

  const updated = updateAttribution(updates);

  // Track page view event
  await supabaseAdmin.rpc("track_event", {
    p_event_name: "landing_view",
    p_anonymous_id: updated.anonymous_id,
    p_session_id: updated.session_id,
    p_source: "web",
    p_properties: {
      url,
      referrer,
      ...utmParams,
    },
    p_context: {
      first_landing_page: updated.first_landing_page,
      first_referrer: updated.first_referrer,
      utm_source: updated.utm_source,
      utm_medium: updated.utm_medium,
      utm_campaign: updated.utm_campaign,
    },
  });
}

/**
 * Track conversion with full attribution
 * Called when user completes a conversion (purchase, signup, etc.)
 */
export async function trackConversionAttribution(
  eventName: string,
  personId: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const attribution = getAttributionData();

  // Track conversion event with full attribution chain
  await supabaseAdmin.rpc("track_event", {
    p_event_name: eventName,
    p_person_id: personId,
    p_anonymous_id: attribution.anonymous_id,
    p_session_id: attribution.session_id,
    p_source: "web",
    p_properties: {
      ...properties,
      // Attribution properties
      email_message_id: attribution.email_message_id,
      link_url: attribution.link_url,
    },
    p_context: {
      // First-touch attribution
      first_landing_page: attribution.first_landing_page,
      first_referrer: attribution.first_referrer,
      // Last-touch attribution
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      utm_content: attribution.utm_content,
      utm_term: attribution.utm_term,
    },
  });

  // Link anonymous_id to person
  if (attribution.anonymous_id) {
    await supabaseAdmin.rpc("link_identity", {
      p_person_id: personId,
      p_identity_type: "anonymous_id",
      p_identity_value: attribution.anonymous_id,
    });
  }

  // Update person features with attribution data
  await supabaseAdmin
    .from("person_features")
    .update({
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      first_landing_page: attribution.first_landing_page,
      first_referrer: attribution.first_referrer,
      updated_at: new Date().toISOString(),
    })
    .eq("person_id", personId);
}

/**
 * Stitch anonymous session to identified person
 * Called on login/signup to connect pre-auth events to person
 */
export async function stitchAnonymousTouch(
  personId: string,
  userId: string
): Promise<void> {
  const attribution = getAttributionData();

  if (!attribution.anonymous_id) {
    return;
  }

  try {
    // Update all events with this anonymous_id to link to person
    await supabaseAdmin
      .from("event")
      .update({
        person_id: personId,
        user_id: userId,
      })
      .eq("anonymous_id", attribution.anonymous_id)
      .is("person_id", null);

    // Link the anonymous_id to person
    await supabaseAdmin.rpc("link_identity", {
      p_person_id: personId,
      p_identity_type: "anonymous_id",
      p_identity_value: attribution.anonymous_id,
    });

    // Link session_id to person
    if (attribution.session_id) {
      await supabaseAdmin.rpc("link_identity", {
        p_person_id: personId,
        p_identity_type: "session_id",
        p_identity_value: attribution.session_id,
      });
    }

    console.log(
      `Stitched anonymous ${attribution.anonymous_id} to person ${personId}`
    );
  } catch (error) {
    console.error("Failed to stitch anonymous touch:", error);
  }
}

/**
 * Get attribution report for a person
 * Shows the full attribution journey
 */
export async function getPersonAttribution(personId: string): Promise<{
  person_features: {
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    first_landing_page: string | null;
    first_referrer: string | null;
  } | null;
  touch_points: Array<{
    event_name: string;
    timestamp: string;
    source: string;
    properties: Record<string, unknown>;
  }>;
  email_attribution: {
    email_message_id: string | null;
    link_url: string | null;
  } | null;
}> {
  // Get person features with attribution
  const { data: features } = await supabaseAdmin
    .from("person_features")
    .select(
      "utm_source, utm_medium, utm_campaign, first_landing_page, first_referrer"
    )
    .eq("person_id", personId)
    .maybeSingle();

  // Get all touch points
  const { data: events } = await supabaseAdmin
    .from("event")
    .select("event_name, timestamp, source, properties")
    .eq("person_id", personId)
    .order("timestamp", { ascending: true })
    .limit(100);

  // Find email attribution
  const emailAttribution = events?.find((e) =>
    e.event_name.startsWith("attribution.email_click")
  );

  return {
    person_features: features || null,
    touch_points: events || [],
    email_attribution: emailAttribution
      ? {
          email_message_id: emailAttribution.properties.email_message_id || null,
          link_url: emailAttribution.properties.link_url || null,
        }
      : null,
  };
}

/**
 * Get conversion path analysis
 * Shows common paths from email → conversion
 */
export async function getConversionPaths(
  eventName: string,
  limit = 100
): Promise<
  Array<{
    person_id: string;
    path: Array<{
      event_name: string;
      timestamp: string;
    }>;
    time_to_convert_seconds: number;
  }>
> {
  // Get people who completed the conversion event
  const { data: conversions } = await supabaseAdmin
    .from("event")
    .select("person_id, timestamp")
    .eq("event_name", eventName)
    .not("person_id", "is", null)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (!conversions) {
    return [];
  }

  const paths: Array<{
    person_id: string;
    path: Array<{
      event_name: string;
      timestamp: string;
    }>;
    time_to_convert_seconds: number;
  }> = [];

  for (const conversion of conversions) {
    // Get all events for this person leading up to conversion
    const { data: personEvents } = await supabaseAdmin
      .from("event")
      .select("event_name, timestamp")
      .eq("person_id", conversion.person_id)
      .lte("timestamp", conversion.timestamp)
      .order("timestamp", { ascending: true });

    if (personEvents && personEvents.length > 0) {
      const firstEvent = personEvents[0];
      const timeToConvert =
        (new Date(conversion.timestamp).getTime() -
          new Date(firstEvent.timestamp).getTime()) /
        1000;

      paths.push({
        person_id: conversion.person_id!,
        path: personEvents,
        time_to_convert_seconds: timeToConvert,
      });
    }
  }

  return paths;
}
