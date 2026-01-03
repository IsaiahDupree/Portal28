import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const updateProgressSchema = z.object({
  lessonId: z.string().uuid(),
  progressPercent: z.number().min(0).max(100).optional(),
  status: z.enum(["not_started", "in_progress", "completed"]).optional(),
});

// POST - Update lesson progress
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateProgressSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { lessonId, progressPercent, status } = parsed.data;

  // Get the course_id for this lesson
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, chapter:chapters(course_id)")
    .eq("id", lessonId)
    .single();

  const courseId = (lesson?.chapter as any)?.course_id;

  const updates: Record<string, any> = {
    user_id: user.id,
    lesson_id: lessonId,
    course_id: courseId,
    updated_at: new Date().toISOString(),
  };

  if (progressPercent !== undefined) {
    updates.progress_percent = progressPercent;
  }

  if (status !== undefined) {
    updates.status = status;
    if (status === "completed") {
      updates.completed_at = new Date().toISOString();
      updates.progress_percent = 100;
    }
  }

  const { data: progress, error } = await supabase
    .from("lesson_progress")
    .upsert(updates, { onConflict: "user_id,lesson_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ progress });
}

// GET - Get progress for a course or lesson
export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  const lessonId = searchParams.get("lessonId");

  if (lessonId) {
    // Get single lesson progress
    const { data: progress, error } = await supabase
      .from("lesson_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      progress: progress || { 
        status: "not_started", 
        progress_percent: 0 
      } 
    });
  }

  if (courseId) {
    // Get all lesson progress for a course
    const { data: progress, error } = await supabase
      .from("lesson_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("course_id", courseId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate overall course progress
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id, chapter:chapters!inner(course_id)")
      .eq("chapters.course_id", courseId);

    const totalLessons = lessons?.length || 0;
    const completedLessons = progress?.filter(p => p.status === "completed").length || 0;
    const courseProgressPercent = totalLessons > 0 
      ? Math.round((completedLessons / totalLessons) * 100) 
      : 0;

    return NextResponse.json({ 
      progress,
      summary: {
        totalLessons,
        completedLessons,
        courseProgressPercent,
      }
    });
  }

  return NextResponse.json({ error: "courseId or lessonId required" }, { status: 400 });
}

// PATCH - Mark lesson complete
export async function PATCH(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { lessonId } = body;

  if (!lessonId) {
    return NextResponse.json({ error: "lessonId required" }, { status: 400 });
  }

  // Get the course_id for this lesson
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, chapter:chapters(course_id)")
    .eq("id", lessonId)
    .single();

  const courseId = (lesson?.chapter as any)?.course_id;

  const { data: progress, error } = await supabase
    .from("lesson_progress")
    .upsert({
      user_id: user.id,
      lesson_id: lessonId,
      course_id: courseId,
      status: "completed",
      progress_percent: 100,
      completed_at: new Date().toISOString(),
    }, { onConflict: "user_id,lesson_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ progress, completed: true });
}
