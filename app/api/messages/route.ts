/**
 * Messages API Route
 * Feature: feat-222 (Instructor Messaging)
 *
 * Endpoints:
 * - POST /api/messages - Send a new message
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CreateMessageSchema = z.object({
  thread_id: z.string().uuid(),
  content: z.string().min(1),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    size: z.number().optional(),
    type: z.string().optional(),
  })).optional().default([]),
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
    const validation = CreateMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { thread_id, content, attachments } = validation.data;

    // Verify user is participant in thread
    const { data: thread } = await supabase
      .from("message_threads")
      .select("student_id, instructor_id, status")
      .eq("id", thread_id)
      .single();

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (thread.student_id !== user.id && thread.instructor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (thread.status === "archived") {
      return NextResponse.json(
        { error: "Cannot send message to archived thread" },
        { status: 400 }
      );
    }

    // Create message
    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        thread_id,
        sender_id: user.id,
        content,
        attachments: attachments.length > 0 ? attachments : undefined,
      })
      .select(
        `
        *,
        sender:users!messages_sender_id_fkey(id, email, full_name)
      `
      )
      .single();

    if (error) {
      console.error("Error sending message:", error);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
