/**
 * Forum Replies API Route
 * Feature: feat-220 (Discussion Forums)
 *
 * Endpoints:
 * - POST /api/forum-replies - Create a new reply
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CreateReplySchema = z.object({
  thread_id: z.string().uuid(),
  parent_reply_id: z.string().uuid().optional().nullable(),
  content: z.string().min(1),
});

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
    const validation = CreateReplySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    // Check if thread exists and is not locked
    const { data: thread } = await supabase
      .from("forum_threads")
      .select("id, is_locked, is_deleted")
      .eq("id", validation.data.thread_id)
      .single();

    if (!thread || thread.is_deleted) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (thread.is_locked) {
      return NextResponse.json(
        { error: "Thread is locked" },
        { status: 403 }
      );
    }

    // Create reply
    const { data: reply, error } = await supabase
      .from("forum_replies")
      .insert({
        ...validation.data,
        user_id: user.id,
      })
      .select(
        `
        *,
        author:users!forum_replies_user_id_fkey(id, email, full_name)
      `
      )
      .single();

    if (error) {
      console.error("Error creating reply:", error);
      return NextResponse.json(
        { error: "Failed to create reply" },
        { status: 500 }
      );
    }

    return NextResponse.json(reply, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/forum-replies:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
