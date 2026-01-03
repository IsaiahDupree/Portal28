import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { updateLessonProgress } from "@/lib/progress/lessonProgress";

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { lessonId, courseId, status, progressPercent, videoPosition, videoDuration } = body;

  if (!lessonId || !courseId) {
    return NextResponse.json({ error: "lessonId and courseId required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (status) updates.status = status;
  if (typeof progressPercent === "number") updates.progress_percent = progressPercent;
  if (typeof videoPosition === "number") updates.video_position_seconds = videoPosition;
  if (typeof videoDuration === "number") updates.video_duration_seconds = videoDuration;

  const progress = await updateLessonProgress(auth.user.id, lessonId, courseId, updates);

  if (!progress) {
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, progress });
}

export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const courseId = req.nextUrl.searchParams.get("courseId");

  if (courseId) {
    const { data } = await supabase
      .from("lesson_progress")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("course_id", courseId);

    return NextResponse.json({ progress: data ?? [] });
  }

  const { data } = await supabase
    .from("course_progress")
    .select("*")
    .eq("user_id", auth.user.id);

  return NextResponse.json({ progress: data ?? [] });
}
