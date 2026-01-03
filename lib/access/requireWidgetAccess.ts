// lib/access/requireWidgetAccess.ts
// Main function to check if a user can access a widget

import { supabaseServer } from "@/lib/supabase/server";
import { getUserEntitlements, evaluatePolicy } from "./entitlements";
import { AccessDecision, Widget } from "./types";

interface RequireWidgetAccessArgs {
  widgetKey: string;
  user: null | { id: string };
}

interface RequireWidgetAccessResult {
  widget: Widget;
  decision: AccessDecision;
}

/**
 * Check if a user can access a specific widget
 * Returns the widget data and an access decision
 */
export async function requireWidgetAccess(
  args: RequireWidgetAccessArgs
): Promise<RequireWidgetAccessResult> {
  const supabase = supabaseServer();

  // Fetch the widget
  const { data: widget, error } = await supabase
    .from("widgets")
    .select("*")
    .eq("key", args.widgetKey)
    .eq("status", "active")
    .single();

  if (error || !widget) {
    throw new Error(`Widget not found: ${args.widgetKey}`);
  }

  const isAuthed = !!args.user;
  const entSet = isAuthed 
    ? await getUserEntitlements(args.user!.id) 
    : new Set<string>();

  const decision = evaluatePolicy({
    policy: widget.access_policy_json,
    isAuthed,
    entSet,
    saleswallType: widget.saleswall_type,
    saleswallConfig: widget.saleswall_config ?? {},
  });

  return { widget: widget as Widget, decision };
}

/**
 * Get all widgets with their access status for a user
 * Used for the dashboard to show locked/unlocked tiles
 */
export async function getWidgetsWithAccess(
  user: null | { id: string }
): Promise<Array<Widget & { decision: AccessDecision }>> {
  const supabase = supabaseServer();

  const { data: widgets, error } = await supabase
    .from("widgets")
    .select("*")
    .eq("status", "active")
    .order("display_order");

  if (error) {
    console.error("Error fetching widgets:", error);
    throw error;
  }

  const isAuthed = !!user;
  const entSet = isAuthed 
    ? await getUserEntitlements(user!.id) 
    : new Set<string>();

  return (widgets ?? []).map((widget: Widget) => {
    const decision = evaluatePolicy({
      policy: widget.access_policy_json,
      isAuthed,
      entSet,
      saleswallType: widget.saleswall_type,
      saleswallConfig: widget.saleswall_config ?? {},
    });

    return { ...widget, decision } as Widget & { decision: AccessDecision };
  });
}

/**
 * Log a paywall view event (for analytics)
 */
export async function logPaywallEvent(args: {
  userId?: string;
  email?: string;
  eventType: "view" | "click_upgrade" | "start_checkout" | "complete";
  widgetKey?: string;
  paywallType?: string;
  offerTier?: string;
  offerPriceId?: string;
  offerCourseSlug?: string;
  converted?: boolean;
  source?: string;
}) {
  const supabase = supabaseServer();
  
  await supabase.from("paywall_events").insert({
    user_id: args.userId,
    email: args.email,
    event_type: args.eventType,
    widget_key: args.widgetKey,
    paywall_type: args.paywallType,
    offer_tier: args.offerTier,
    offer_price_id: args.offerPriceId,
    offer_course_slug: args.offerCourseSlug,
    converted: args.converted ?? false,
    source: args.source
  });
}
