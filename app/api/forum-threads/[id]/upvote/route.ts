/**
 * Thread Upvote API Route
 * Feature: feat-220 (Discussion Forums)
 *
 * Endpoints:
 * - POST /api/forum-threads/[id]/upvote - Upvote a thread
 * - DELETE /api/forum-threads/[id]/upvote - Remove upvote
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
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

    // Check if thread exists
    const { data: thread } = await supabase
      .from("forum_threads")
      .select("id")
      .eq("id", params.id)
      .single();

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Add upvote (trigger will update upvote_count)
    const { error } = await supabase
      .from("forum_thread_upvotes")
      .insert({
        thread_id: params.id,
        user_id: user.id,
      });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Already upvoted" },
          { status: 409 }
        );
      }

      console.error("Error upvoting thread:", error);
      return NextResponse.json(
        { error: "Failed to upvote thread" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/forum-threads/[id]/upvote:", error);
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

    const { error } = await supabase
      .from("forum_thread_upvotes")
      .delete()
      .eq("thread_id", params.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error removing thread upvote:", error);
      return NextResponse.json(
        { error: "Failed to remove upvote" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/forum-threads/[id]/upvote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
