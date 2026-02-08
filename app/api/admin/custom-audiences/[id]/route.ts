/**
 * Custom Audience Individual Routes
 * META-007: Manage individual custom audiences
 *
 * GET - Get audience details
 * DELETE - Delete an audience
 * PUT - Update audience configuration
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { deleteCustomAudience, getAudienceDetails } from "@/lib/meta/customAudiences";
import { z } from "zod";

const updateAudienceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  config: z.record(z.any()).optional(),
  is_active: z.boolean().optional(),
});

/**
 * GET /api/admin/custom-audiences/[id]
 * Get audience details including sync history
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const audienceId = params.id;

  // Fetch audience with sync history
  const { data: audience, error: audienceError } = await supabase
    .from("custom_audiences")
    .select("*")
    .eq("id", audienceId)
    .single();

  if (audienceError || !audience) {
    return NextResponse.json({ error: "Audience not found" }, { status: 404 });
  }

  // Fetch sync history
  const { data: syncHistory } = await supabase
    .from("custom_audience_sync_history")
    .select("*")
    .eq("audience_id", audienceId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Optionally fetch live count from Meta
  let metaDetails = null;
  if (audience.meta_audience_id) {
    try {
      metaDetails = await getAudienceDetails(audience.meta_audience_id);
    } catch (error) {
      console.error("Failed to fetch Meta details:", error);
    }
  }

  return NextResponse.json({
    audience,
    syncHistory: syncHistory || [],
    metaDetails,
  });
}

/**
 * PUT /api/admin/custom-audiences/[id]
 * Update audience configuration
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const audienceId = params.id;

  try {
    const body = await req.json();
    const validated = updateAudienceSchema.parse(body);

    const { data: audience, error: updateError } = await supabase
      .from("custom_audiences")
      .update(validated)
      .eq("id", audienceId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ audience });
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

/**
 * DELETE /api/admin/custom-audiences/[id]
 * Delete an audience from both database and Meta
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const audienceId = params.id;

  try {
    // Get audience to find Meta ID
    const { data: audience, error: fetchError } = await supabase
      .from("custom_audiences")
      .select("meta_audience_id")
      .eq("id", audienceId)
      .single();

    if (fetchError || !audience) {
      return NextResponse.json(
        { error: "Audience not found" },
        { status: 404 }
      );
    }

    // Delete from Meta first (if exists)
    if (audience.meta_audience_id) {
      try {
        await deleteCustomAudience(audience.meta_audience_id);
      } catch (metaError) {
        console.error("Failed to delete from Meta:", metaError);
        // Continue with local deletion even if Meta deletion fails
      }
    }

    // Delete from database (cascade will handle related tables)
    const { error: deleteError } = await supabase
      .from("custom_audiences")
      .delete()
      .eq("id", audienceId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Audience deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
