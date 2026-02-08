import { supabaseServer } from "@/lib/supabase/server";

export type LessonProgressStatus = "not_started" | "in_progress" | "completed";

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  course_id: string;
  status: LessonProgressStatus;
  progress_percent: number;
  video_position_seconds: number | null;
  video_duration_seconds: number | null;
  time_spent_seconds: number;
  last_activity_timestamp: string | null;
  started_at: string | null;
  completed_at: string | null;
  last_accessed_at: string;
}

export interface CourseProgress {
  user_id: string;
  course_id: string;
  lessons_started: number;
  lessons_completed: number;
  total_lessons: number;
  completion_percent: number;
  last_accessed_at: string | null;
  total_time_spent_seconds: number | null;
  avg_quiz_score_percent: number | null;
  quizzes_attempted: number | null;
  quizzes_passed: number | null;
}

export async function getLessonProgress(
  userId: string,
  lessonId: string
): Promise<LessonProgress | null> {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  return data;
}

export async function getCourseProgress(
  userId: string,
  courseId: string
): Promise<CourseProgress | null> {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("course_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  return data;
}

export async function getAllCourseProgress(
  userId: string
): Promise<CourseProgress[]> {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("course_progress")
    .select("*")
    .eq("user_id", userId);

  return data ?? [];
}

export async function updateLessonProgress(
  userId: string,
  lessonId: string,
  courseId: string,
  updates: {
    status?: LessonProgressStatus;
    progress_percent?: number;
    video_position_seconds?: number;
    video_duration_seconds?: number;
  }
): Promise<LessonProgress | null> {
  const supabase = supabaseServer();

  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    user_id: userId,
    lesson_id: lessonId,
    course_id: courseId,
    last_accessed_at: now,
    ...updates,
  };

  if (updates.status === "in_progress" && !payload.started_at) {
    payload.started_at = now;
  }

  if (updates.status === "completed") {
    payload.completed_at = now;
    payload.progress_percent = 100;
  }

  const { data, error } = await supabase
    .from("lesson_progress")
    .upsert(payload, { onConflict: "user_id,lesson_id" })
    .select()
    .single();

  if (error) {
    console.error("Failed to update lesson progress:", error);
    return null;
  }

  return data;
}

export async function markLessonComplete(
  userId: string,
  lessonId: string,
  courseId: string
): Promise<LessonProgress | null> {
  return updateLessonProgress(userId, lessonId, courseId, {
    status: "completed",
    progress_percent: 100,
  });
}

export async function markLessonStarted(
  userId: string,
  lessonId: string,
  courseId: string
): Promise<LessonProgress | null> {
  return updateLessonProgress(userId, lessonId, courseId, {
    status: "in_progress",
  });
}

export async function updateTimeSpent(
  userId: string,
  lessonId: string,
  courseId: string,
  secondsToAdd: number
): Promise<void> {
  const supabase = supabaseServer();

  const { error } = await supabase.rpc("update_lesson_time_spent", {
    p_user_id: userId,
    p_lesson_id: lessonId,
    p_course_id: courseId,
    p_seconds_to_add: secondsToAdd,
  });

  if (error) {
    console.error("Failed to update time spent:", error);
  }
}
