/**
 * Admin API: Widget Management
 * Handles widget enable/disable and configuration updates
 * Test ID: PLT-WDG-006
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

// Validation schema for widget updates
const WidgetUpdateSchema = z.object({
  key: z.string(),
  status: z.enum(["active", "hidden", "coming_soon"]).optional(),
  display_order: z.number().int().min(0).optional(),
  saleswall_type: z.enum(["none", "membership", "course", "hybrid"]).optional(),
  saleswall_config: z.record(z.any()).optional(),
  access_policy_json: z.record(z.any()).optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  route: z.string().optional(),
  category: z.string().optional(),
});

/**
 * GET /api/admin/widgets
 * Returns all widgets (including hidden ones) for admin management
 */
export async function GET(req: NextRequest) {
  const supabase = supabaseServer();

  // Check authentication
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all widgets (including hidden)
  const { data: widgets, error } = await supabase
    .from("widgets")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ widgets });
}

/**
 * PATCH /api/admin/widgets
 * Updates widget configuration (status, display order, saleswall settings, etc.)
 */
export async function PATCH(req: NextRequest) {
  const supabase = supabaseServer();

  // Check authentication
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse and validate request body
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = WidgetUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { key, ...updates } = validation.data;

  // Update widget
  const { data: widget, error } = await supabase
    .from("widgets")
    .update(updates)
    .eq("key", key)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!widget) {
    return NextResponse.json({ error: "Widget not found" }, { status: 404 });
  }

  return NextResponse.json({ widget, ok: true });
}

/**
 * POST /api/admin/widgets/toggle
 * Quick toggle for widget active/hidden status
 */
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();

  // Check authentication
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse request
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { key, status } = body;

  if (!key || !status) {
    return NextResponse.json(
      { error: "Missing required fields: key, status" },
      { status: 400 }
    );
  }

  if (!["active", "hidden", "coming_soon"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid status. Must be: active, hidden, or coming_soon" },
      { status: 400 }
    );
  }

  // Update widget status
  const { data: widget, error } = await supabase
    .from("widgets")
    .update({ status })
    .eq("key", key)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!widget) {
    return NextResponse.json({ error: "Widget not found" }, { status: 404 });
  }

  return NextResponse.json({ widget, ok: true });
}
