import { redirect, notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { CourseBuilder } from "./CourseBuilder";

export default async function CourseBuilderPage({ 
  params 
}: { 
  params: { courseId: string } 
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

  // Fetch course with chapters and lessons
  const { data: course, error } = await supabase
    .from("courses")
    .select(`
      *,
      chapters:chapters(
        id,
        title,
        description,
        position,
        is_published,
        lessons:lessons(
          id,
          title,
          lesson_type,
          position,
          is_published,
          is_preview,
          drip_type,
          drip_value,
          duration_minutes,
          video_url
        )
      )
    `)
    .eq("id", params.courseId)
    .single();

  if (error || !course) {
    notFound();
  }

  // Sort chapters and lessons by position
  if (course.chapters) {
    course.chapters.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
    course.chapters.forEach((chapter: any) => {
      if (chapter.lessons) {
        chapter.lessons.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
      }
    });
  }

  return <CourseBuilder initialCourse={course} />;
}
