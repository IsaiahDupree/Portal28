/**
 * Individual Thread API Route
 * Feature: feat-220 (Discussion Forums)
 *
 * Endpoints:
 * - GET /api/forum-threads/[id] - Get thread details with replies
 * - PATCH /api/forum-threads/[id] - Update thread
 * - DELETE /api/forum-threads/[id] - Delete thread (soft delete)
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const UpdateThreadSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  content: z.string().min(1).optional(),
  category_id: z.string().uuid().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get thread
    const { data: thread, error: threadError } = await supabase
      .from("forum_threads")
      .select(
        `
        *,
        forum:forums(id, title, slug),
        category:forum_categories(id, name, slug, color),
        author:users!forum_threads_user_id_fkey(id, email, full_name),
        tags:forum_thread_tags(tag:forum_tags(*))
      `
      )
      .eq("id", params.id)
      .eq("is_deleted", false)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Get replies
    const { data: replies } = await supabase
      .from("forum_replies")
      .select(
        `
        *,
        author:users!forum_replies_user_id_fkey(id, email, full_name)
      `
      )
      .eq("thread_id", params.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true });

    // Increment view count
    await supabase.rpc("increment_thread_view_count", {
      thread_uuid: params.id,
    });

    // Check if current user has upvoted
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let has_upvoted = false;
    if (user) {
      const { data: upvote } = await supabase
        .from("forum_thread_upvotes")
        .select("*")
        .eq("thread_id", params.id)
        .eq("user_id", user.id)
        .single();

      has_upvoted = !!upvote;
    }

    return NextResponse.json({
      ...thread,
      replies: replies || [],
      has_upvoted,
    });
  } catch (error) {
    console.error("Error in GET /api/forum-threads/[id]:", error);
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check ownership
    const { data: thread } = await supabase
      .from("forum_threads")
      .select("user_id")
      .eq("id", params.id)
      .single();

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (thread.user_id !== user.id) {
      // Check if admin
      const { data: userData } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!userData?.is_admin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json();
    const validation = UpdateThreadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { data: updatedThread, error } = await supabase
      .from("forum_threads")
      .update(validation.data)
      .eq("id", params.id)
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
      console.error("Error updating thread:", error);
      return NextResponse.json(
        { error: "Failed to update thread" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedThread);
  } catch (error) {
    console.error("Error in PATCH /api/forum-threads/[id]:", error);
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check ownership
    const { data: thread } = await supabase
      .from("forum_threads")
      .select("user_id")
      .eq("id", params.id)
      .single();

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (thread.user_id !== user.id) {
      // Check if admin
      const { data: userData } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!userData?.is_admin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Soft delete
    const { error } = await supabase
      .from("forum_threads")
      .update({ is_deleted: true })
      .eq("id", params.id);

    if (error) {
      console.error("Error deleting thread:", error);
      return NextResponse.json(
        { error: "Failed to delete thread" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/forum-threads/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
