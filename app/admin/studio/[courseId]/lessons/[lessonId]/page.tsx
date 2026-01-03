import { redirect, notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { LessonEditor } from "./LessonEditor";

export default async function LessonEditorPage({ 
  params 
}: { 
  params: { courseId: string; lessonId: string } 
}) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/studio");
  }

  // Check if admin
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin") {
    redirect("/app");
  }

  // Fetch lesson
  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", params.lessonId)
    .single();

  if (error || !lesson) {
    notFound();
  }

  // Fetch course info for breadcrumb
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, slug")
    .eq("id", params.courseId)
    .single();

  if (!course) {
    notFound();
  }

  return <LessonEditor lesson={lesson} course={course} />;
}
