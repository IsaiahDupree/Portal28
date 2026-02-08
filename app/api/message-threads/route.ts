/**
 * Message Threads API Route
 * Feature: feat-222 (Instructor Messaging)
 * Test ID: NEW-INS-001
 *
 * Endpoints:
 * - GET /api/message-threads - List message threads for current user
 * - POST /api/message-threads - Create or get existing thread
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CreateThreadSchema = z.object({
  instructor_id: z.string().uuid(),
  course_id: z.string().uuid().optional().nullable(),
  subject: z.string().min(1).max(200).default("Course Question"),
  initial_message: z.string().min(1).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "open";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    let query = supabase
      .from("message_threads")
      .select(
        `
        *,
        course:courses(id, title, slug),
        student:users!message_threads_student_id_fkey(id, email, full_name),
        instructor:users!message_threads_instructor_id_fkey(id, email, full_name),
        last_message_user:users!message_threads_last_message_by_fkey(id, email, full_name)
      `,
        { count: "exact" }
      );

    // Filter by user (student or instructor)
    query = query.or(`student_id.eq.${user.id},instructor_id.eq.${user.id}`);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    query = query.order("last_message_at", {
      ascending: false,
      nullsFirst: false,
    });

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: threads, error, count } = await query;

    if (error) {
      console.error("Error fetching message threads:", error);
      return NextResponse.json(
        { error: "Failed to fetch message threads" },
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
    console.error("Error in GET /api/message-threads:", error);
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

    const { instructor_id, course_id, subject, initial_message } =
      validation.data;

    // Verify instructor exists and is an instructor/admin
    const { data: instructor } = await supabase
      .from("users")
      .select("id, is_instructor, is_admin")
      .eq("id", instructor_id)
      .single();

    if (!instructor || (!instructor.is_instructor && !instructor.is_admin)) {
      return NextResponse.json(
        { error: "Invalid instructor" },
        { status: 400 }
      );
    }

    // Get or create thread using database function
    const { data: threadId, error: threadError } = await supabase.rpc(
      "get_or_create_message_thread",
      {
        p_student_id: user.id,
        p_instructor_id: instructor_id,
        p_course_id: course_id,
        p_subject: subject,
      }
    );

    if (threadError) {
      console.error("Error creating thread:", threadError);
      return NextResponse.json(
        { error: "Failed to create thread" },
        { status: 500 }
      );
    }

    // Send initial message if provided
    if (initial_message) {
      const { error: messageError } = await supabase.from("messages").insert({
        thread_id: threadId,
        sender_id: user.id,
        content: initial_message,
      });

      if (messageError) {
        console.error("Error sending initial message:", messageError);
      }
    }

    // Fetch the thread with related data
    const { data: thread } = await supabase
      .from("message_threads")
      .select(
        `
        *,
        course:courses(id, title, slug),
        student:users!message_threads_student_id_fkey(id, email, full_name),
        instructor:users!message_threads_instructor_id_fkey(id, email, full_name)
      `
      )
      .eq("id", threadId)
      .single();

    return NextResponse.json(thread, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/message-threads:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
