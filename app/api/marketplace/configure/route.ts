/**
 * User API: App Marketplace - Configure Apps
 * Handles app configuration updates
 * Test ID: EXP-MKT-003
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const ConfigureSchema = z.object({
  widget_key: z.string(),
  config: z.record(z.any()),
});

/**
 * PATCH /api/marketplace/configure
 * Updates app configuration for the authenticated user
 */
export async function PATCH(req: NextRequest) {
  const supabase = supabaseServer();

  // Check authentication
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate request
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = ConfigureSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { widget_key, config } = validation.data;

  // Check if app is installed
  const { data: installation, error: fetchError } = await supabase
    .from("app_installations")
    .select("id, status")
    .eq("user_id", auth.user.id)
    .eq("widget_key", widget_key)
    .single();

  if (fetchError || !installation) {
    return NextResponse.json({ error: "App not installed" }, { status: 404 });
  }

  if (installation.status !== "active") {
    return NextResponse.json(
      { error: "App is not active" },
      { status: 400 }
    );
  }

  // Update configuration
  const { data: updated, error: updateError } = await supabase
    .from("app_installations")
    .update({
      config,
      updated_at: new Date().toISOString(),
    })
    .eq("id", installation.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Track configuration event
  await supabase.from("app_usage_events").insert({
    user_id: auth.user.id,
    widget_key,
    event_type: "configured",
    event_data: { config },
  });

  return NextResponse.json({ installation: updated, ok: true });
}

/**
 * GET /api/marketplace/configure?widget_key=XXX
 * Gets current app configuration for the authenticated user
 */
export async function GET(req: NextRequest) {
  const supabase = supabaseServer();

  // Check authentication
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const widget_key = searchParams.get("widget_key");

  if (!widget_key) {
    return NextResponse.json(
      { error: "Missing widget_key parameter" },
      { status: 400 }
    );
  }

  // Fetch installation and config
  const { data: installation, error } = await supabase
    .from("app_installations")
    .select("id, widget_key, config, status, installed_at, last_used_at")
    .eq("user_id", auth.user.id)
    .eq("widget_key", widget_key)
    .single();

  if (error || !installation) {
    return NextResponse.json({ error: "App not installed" }, { status: 404 });
  }

  return NextResponse.json({ installation });
}
