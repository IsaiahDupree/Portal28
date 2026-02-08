/**
 * Individual Forum API Route
 * Feature: feat-220 (Discussion Forums)
 *
 * Endpoints:
 * - GET /api/forums/[id] - Get forum details
 * - PATCH /api/forums/[id] - Update forum (admin only)
 * - DELETE /api/forums/[id] - Delete forum (admin only)
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const UpdateForumSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  is_locked: z.boolean().optional(),
  is_archived: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const { data: forum, error } = await supabase
      .from("forums")
      .select(`
        *,
        course:courses(id, title, slug),
        categories:forum_categories(*)
      `)
      .eq("id", params.id)
      .single();

    if (error || !forum) {
      return NextResponse.json({ error: "Forum not found" }, { status: 404 });
    }

    // Get forum stats
    const { data: stats } = await supabase.rpc("get_forum_stats", {
      forum_uuid: forum.id,
    });

    return NextResponse.json({
      ...forum,
      stats: stats?.[0] || {
        thread_count: 0,
        reply_count: 0,
        user_count: 0,
        latest_thread_id: null,
        latest_thread_title: null,
        latest_thread_created_at: null,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/forums/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validation = UpdateForumSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { data: forum, error } = await supabase
      .from("forums")
      .update(validation.data)
      .eq("id", params.id)
      .select()
      .single();

    if (error || !forum) {
      return NextResponse.json({ error: "Forum not found" }, { status: 404 });
    }

    return NextResponse.json(forum);
  } catch (error) {
    console.error("Error in PATCH /api/forums/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase.from("forums").delete().eq("id", params.id);

    if (error) {
      console.error("Error deleting forum:", error);
      return NextResponse.json(
        { error: "Failed to delete forum" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/forums/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
