/**
 * User API: App Marketplace - Install/Uninstall Apps
 * Handles app installation and uninstallation
 * Test ID: EXP-MKT-002
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const InstallSchema = z.object({
  widget_key: z.string(),
  config: z.record(z.any()).optional(),
});

const UninstallSchema = z.object({
  widget_key: z.string(),
});

/**
 * POST /api/marketplace/install
 * Installs an app for the authenticated user
 */
export async function POST(req: NextRequest) {
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

  const validation = InstallSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { widget_key, config = {} } = validation.data;

  // Check if app exists and is available
  const { data: app, error: appError } = await supabase
    .from("widgets")
    .select("key, name, version, status")
    .eq("key", widget_key)
    .single();

  if (appError || !app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  if (app.status !== "active") {
    return NextResponse.json(
      { error: "App is not available for installation" },
      { status: 400 }
    );
  }

  // Check if already installed
  const { data: existing } = await supabase
    .from("app_installations")
    .select("id, status")
    .eq("user_id", auth.user.id)
    .eq("widget_key", widget_key)
    .single();

  if (existing) {
    if (existing.status === "active") {
      return NextResponse.json(
        { error: "App already installed" },
        { status: 400 }
      );
    }

    // Reactivate if previously uninstalled
    const { data: installation, error: updateError } = await supabase
      .from("app_installations")
      .update({
        status: "active",
        version_at_install: app.version,
        config,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Track installation event
    await supabase.from("app_usage_events").insert({
      user_id: auth.user.id,
      widget_key,
      event_type: "installed",
      event_data: { reinstall: true },
    });

    return NextResponse.json({ installation, ok: true });
  }

  // Create new installation
  const { data: installation, error: installError } = await supabase
    .from("app_installations")
    .insert({
      user_id: auth.user.id,
      widget_key,
      version_at_install: app.version,
      config,
      status: "active",
    })
    .select()
    .single();

  if (installError) {
    return NextResponse.json({ error: installError.message }, { status: 500 });
  }

  // Track installation event
  await supabase.from("app_usage_events").insert({
    user_id: auth.user.id,
    widget_key,
    event_type: "installed",
    event_data: { version: app.version },
  });

  return NextResponse.json({ installation, ok: true });
}

/**
 * DELETE /api/marketplace/install
 * Uninstalls an app for the authenticated user
 */
export async function DELETE(req: NextRequest) {
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

  const validation = UninstallSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { widget_key } = validation.data;

  // Check if app is installed
  const { data: installation } = await supabase
    .from("app_installations")
    .select("id, status")
    .eq("user_id", auth.user.id)
    .eq("widget_key", widget_key)
    .single();

  if (!installation || installation.status !== "active") {
    return NextResponse.json({ error: "App not installed" }, { status: 400 });
  }

  // Update status to uninstalled
  const { error: updateError } = await supabase
    .from("app_installations")
    .update({
      status: "uninstalled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", installation.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Track uninstallation event
  await supabase.from("app_usage_events").insert({
    user_id: auth.user.id,
    widget_key,
    event_type: "uninstalled",
  });

  return NextResponse.json({ ok: true });
}
