/**
 * Forum Threads API Route
 * Feature: feat-220 (Discussion Forums)
 *
 * Endpoints:
 * - GET /api/forum-threads - List threads (with filtering)
 * - POST /api/forum-threads - Create a new thread
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CreateThreadSchema = z.object({
  forum_id: z.string().uuid(),
  category_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(300),
  content: z.string().min(1),
  slug: z.string().min(1).max(150).regex(/^[a-z0-9-]+$/),
  tags: z.array(z.string().uuid()).optional().default([]),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const forumId = searchParams.get("forum_id");
    const categoryId = searchParams.get("category_id");
    const userId = searchParams.get("user_id");
    const tagId = searchParams.get("tag_id");
    const solved = searchParams.get("solved");
    const sortBy = searchParams.get("sort") || "recent";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    let query = supabase
      .from("forum_threads")
      .select(
        `
        *,
        forum:forums(id, title, slug),
        category:forum_categories(id, name, slug, color),
        author:users!forum_threads_user_id_fkey(id, email, full_name),
        tags:forum_thread_tags(tag:forum_tags(*))
      `,
        { count: "exact" }
      )
      .eq("is_deleted", false);

    // Apply filters
    if (forumId) query = query.eq("forum_id", forumId);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (userId) query = query.eq("user_id", userId);
    if (solved === "true") query = query.eq("is_solved", true);
    if (solved === "false") query = query.eq("is_solved", false);

    // Apply sorting
    switch (sortBy) {
      case "popular":
        query = query.order("upvote_count", { ascending: false });
        break;
      case "active":
        query = query.order("last_reply_at", {
          ascending: false,
          nullsFirst: false,
        });
        break;
      case "unanswered":
        query = query.eq("reply_count", 0).order("created_at", { ascending: false });
        break;
      case "solved":
        query = query.eq("is_solved", true).order("created_at", { ascending: false });
        break;
      case "recent":
      default:
        query = query.order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
        break;
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: threads, error, count } = await query;

    if (error) {
      console.error("Error fetching threads:", error);
      return NextResponse.json(
        { error: "Failed to fetch threads" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      threads,
      pagination: {
        total: count || 0,
        page,
        limit,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error in GET /api/forum-threads:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = CreateThreadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { tags, ...threadData } = validation.data;

    // Check if forum exists and is not locked
    const { data: forum } = await supabase
      .from("forums")
      .select("id, is_locked")
      .eq("id", threadData.forum_id)
      .single();

    if (!forum) {
      return NextResponse.json({ error: "Forum not found" }, { status: 404 });
    }

    if (forum.is_locked) {
      return NextResponse.json(
        { error: "Forum is locked" },
        { status: 403 }
      );
    }

    // Create thread
    const { data: thread, error } = await supabase
      .from("forum_threads")
      .insert({
        ...threadData,
        user_id: user.id,
      })
      .select(
        `
        *,
        forum:forums(id, title, slug),
        category:forum_categories(id, name, slug, color),
        author:users!forum_threads_user_id_fkey(id, email, full_name)
      `
      )
      .single();

    if (error) {
      console.error("Error creating thread:", error);

      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Thread with this slug already exists in this forum" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to create thread" },
        { status: 500 }
      );
    }

    // Add tags if provided
    if (tags.length > 0 && thread) {
      const tagInserts = tags.map((tagId) => ({
        thread_id: thread.id,
        tag_id: tagId,
      }));

      await supabase.from("forum_thread_tags").insert(tagInserts);
    }

    return NextResponse.json(thread, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/forum-threads:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
