/**
 * Custom Audiences API Routes
 * META-007: Configure custom audiences based on user behavior
 *
 * GET - List all custom audiences
 * POST - Create a new custom audience
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createCustomAudience } from "@/lib/meta/customAudiences";
import { z } from "zod";

// Validation schema for creating a new audience
const createAudienceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  audience_type: z.enum([
    "purchasers",
    "course_completers",
    "engaged_users",
    "abandoned_checkouts",
    "high_value",
    "custom",
  ]),
  config: z.record(z.any()).optional(),
});

/**
 * GET /api/admin/custom-audiences
 * List all custom audiences
 */
export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all audiences
  const { data: audiences, error } = await supabase
    .from("custom_audiences")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ audiences });
}

/**
 * POST /api/admin/custom-audiences
 * Create a new custom audience
 */
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = createAudienceSchema.parse(body);

    // Create audience in Meta first
    let metaAudienceId: string | undefined;

    try {
      metaAudienceId = await createCustomAudience({
        name: validated.name,
        description: validated.description,
      });
    } catch (metaError: any) {
      console.error("Failed to create Meta audience:", metaError);
      // Continue anyway - we'll store it locally and sync later
    }

    // Store audience in database
    const { data: audience, error: dbError } = await supabase
      .from("custom_audiences")
      .insert({
        name: validated.name,
        description: validated.description,
        audience_type: validated.audience_type,
        config: validated.config || {},
        meta_audience_id: metaAudienceId,
        meta_pixel_id: process.env.NEXT_PUBLIC_META_PIXEL_ID,
        sync_status: metaAudienceId ? "pending" : "error",
        sync_error: metaAudienceId
          ? null
          : "Failed to create audience in Meta. You can retry syncing later.",
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    return NextResponse.json({ audience }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
