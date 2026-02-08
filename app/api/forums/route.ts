/**
 * Forums API Route
 * Feature: feat-220 (Discussion Forums)
 * Test ID: NEW-FOR-001
 *
 * Endpoints:
 * - GET /api/forums - List all forums
 * - POST /api/forums - Create a new forum (admin only)
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CreateForumSchema = z.object({
  course_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  icon: z.string().optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("course_id");
    const includeArchived = searchParams.get("include_archived") === "true";

    let query = supabase
      .from("forums")
      .select(`
        *,
        course:courses(id, title, slug)
      `)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (courseId) {
      query = query.eq("course_id", courseId);
    }

    if (!includeArchived) {
      query = query.eq("is_archived", false);
    }

    const { data: forums, error } = await query;

    if (error) {
      console.error("Error fetching forums:", error);
      return NextResponse.json(
        { error: "Failed to fetch forums" },
        { status: 500 }
      );
    }

    // Get stats for each forum
    const forumsWithStats = await Promise.all(
      (forums || []).map(async (forum) => {
        const { data: stats } = await supabase.rpc("get_forum_stats", {
          forum_uuid: forum.id,
        });

        return {
          ...forum,
          stats: stats?.[0] || {
            thread_count: 0,
            reply_count: 0,
            user_count: 0,
            latest_thread_id: null,
            latest_thread_title: null,
            latest_thread_created_at: null,
          },
        };
      })
    );

    return NextResponse.json(forumsWithStats);
  } catch (error) {
    console.error("Error in GET /api/forums:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const validation = CreateForumSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { data: forum, error } = await supabase
      .from("forums")
      .insert(validation.data)
      .select()
      .single();

    if (error) {
      console.error("Error creating forum:", error);

      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Forum with this slug already exists" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to create forum" },
        { status: 500 }
      );
    }

    return NextResponse.json(forum, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/forums:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
