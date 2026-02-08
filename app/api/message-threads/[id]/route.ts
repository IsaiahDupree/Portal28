/**
 * Individual Message Thread API Route
 * Feature: feat-222 (Instructor Messaging)
 *
 * Endpoints:
 * - GET /api/message-threads/[id] - Get thread with messages
 * - PATCH /api/message-threads/[id] - Update thread status
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const UpdateThreadSchema = z.object({
  status: z.enum(["open", "closed", "archived"]).optional(),
});

export async function GET(
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

    // Get thread
    const { data: thread, error: threadError } = await supabase
      .from("message_threads")
      .select(
        `
        *,
        course:courses(id, title, slug),
        student:users!message_threads_student_id_fkey(id, email, full_name),
        instructor:users!message_threads_instructor_id_fkey(id, email, full_name)
      `
      )
      .eq("id", params.id)
      .or(`student_id.eq.${user.id},instructor_id.eq.${user.id}`)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select(
        `
        *,
        sender:users!messages_sender_id_fkey(id, email, full_name)
      `
      )
      .eq("thread_id", params.id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    // Mark messages as read for current user
    await supabase.rpc("mark_thread_messages_read", {
      p_thread_id: params.id,
      p_user_id: user.id,
    });

    return NextResponse.json({
      ...thread,
      messages: messages || [],
    });
  } catch (error) {
    console.error("Error in GET /api/message-threads/[id]:", error);
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

    // Check if user is participant
    const { data: thread } = await supabase
      .from("message_threads")
      .select("student_id, instructor_id")
      .eq("id", params.id)
      .single();

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (thread.student_id !== user.id && thread.instructor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      .from("message_threads")
      .update(validation.data)
      .eq("id", params.id)
      .select(
        `
        *,
        course:courses(id, title, slug),
        student:users!message_threads_student_id_fkey(id, email, full_name),
        instructor:users!message_threads_instructor_id_fkey(id, email, full_name)
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
    console.error("Error in PATCH /api/message-threads/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
