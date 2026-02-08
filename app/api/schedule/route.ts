import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const scheduleSchema = z.object({
  contentType: z.enum(["course", "lesson", "announcement", "email", "post", "youtube_video"]),
  contentId: z.string().uuid(),
  scheduledFor: z.string().datetime(), // ISO 8601 datetime
  timezone: z.string().default("UTC"),
  autoPublish: z.boolean().default(true),
  publishAction: z.record(z.any()).optional(),
});

/**
 * GET /api/schedule
 * List scheduled content (optionally filtered)
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const contentType = searchParams.get("contentType");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  // Build query
  let query = supabase
    .from("scheduled_content")
    .select("*", { count: "exact" })
    .order("scheduled_for", { ascending: true })
    .range(offset, offset + limit - 1);

  if (contentType) {
    query = query.eq("content_type", contentType);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching scheduled content:", error);
    return NextResponse.json({ error: "Failed to fetch scheduled content" }, { status: 500 });
  }

  return NextResponse.json({
    schedules: data,
    total: count,
    limit,
    offset,
  });
}

/**
 * POST /api/schedule
 * Schedule new content for publishing
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate request body
  const body = await request.json();
  const validation = scheduleSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid request", details: validation.error.issues },
      { status: 400 }
    );
  }

  const { contentType, contentId, scheduledFor, timezone, autoPublish, publishAction } =
    validation.data;

  // Verify content exists and user has permission
  const contentVerification = await verifyContentAccess(
    supabase,
    user.id,
    contentType,
    contentId
  );

  if (!contentVerification.success) {
    return NextResponse.json({ error: contentVerification.error }, { status: 403 });
  }

  // Insert schedule
  const { data, error } = await supabase
    .from("scheduled_content")
    .insert({
      content_type: contentType,
      content_id: contentId,
      scheduled_for: scheduledFor,
      timezone,
      auto_publish: autoPublish,
      publish_action: publishAction || {},
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating schedule:", error);

    // Handle unique constraint violation
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Content is already scheduled" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

/**
 * Verify user has access to schedule content
 */
async function verifyContentAccess(
  supabase: any,
  userId: string,
  contentType: string,
  contentId: string
): Promise<{ success: boolean; error?: string }> {
  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .single();

  if (profile?.role === "admin") {
    return { success: true };
  }

  // Verify ownership based on content type
  switch (contentType) {
    case "course":
      const { data: course } = await supabase
        .from("courses")
        .select("instructor_id")
        .eq("id", contentId)
        .single();

      if (!course) {
        return { success: false, error: "Course not found" };
      }

      if (course.instructor_id !== userId) {
        return { success: false, error: "You don't have permission to schedule this course" };
      }
      break;

    case "lesson":
      const { data: lesson } = await supabase
        .from("lessons")
        .select("courses(instructor_id)")
        .eq("id", contentId)
        .single();

      if (!lesson) {
        return { success: false, error: "Lesson not found" };
      }

      if (lesson.courses?.instructor_id !== userId) {
        return { success: false, error: "You don't have permission to schedule this lesson" };
      }
      break;

    case "announcement":
      const { data: announcement } = await supabase
        .from("announcements")
        .select("author_id")
        .eq("id", contentId)
        .single();

      if (!announcement) {
        return { success: false, error: "Announcement not found" };
      }

      if (announcement.author_id !== userId) {
        return { success: false, error: "You don't have permission to schedule this announcement" };
      }
      break;

    default:
      // For other content types, require admin role
      return { success: false, error: "Only admins can schedule this content type" };
  }

  return { success: true };
}
