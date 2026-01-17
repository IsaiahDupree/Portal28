import { supabaseServer } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";

export const getPublishedCourses = unstable_cache(
  async () => {
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("courses")
      .select("id,title,slug,description,hero_image")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ["published-courses"],
  {
    revalidate: 3600, // Revalidate every hour
    tags: ["courses"],
  }
);

export const getCourseBySlug = unstable_cache(
  async (slug: string) => {
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) return null;
    return data;
  },
  ["course-by-slug"],
  {
    revalidate: 1800, // Revalidate every 30 minutes
    tags: ["courses"],
  }
);

export const getCourseOutline = unstable_cache(
  async (courseId: string) => {
    const supabase = supabaseServer();
    const { data: modules, error: mErr } = await supabase
      .from("modules")
      .select("id,title,sort_order")
      .eq("course_id", courseId)
      .order("sort_order", { ascending: true });

    if (mErr) throw new Error(mErr.message);

    const moduleIds = (modules ?? []).map((m) => m.id);
    const { data: lessons, error: lErr } = await supabase
      .from("lessons")
      .select("id,module_id,title,sort_order")
      .in("module_id", moduleIds.length ? moduleIds : ["00000000-0000-0000-0000-000000000000"])
      .order("sort_order", { ascending: true });

    if (lErr) throw new Error(lErr.message);

    return (modules ?? []).map((m) => ({
      ...m,
      lessons: (lessons ?? []).filter((l) => l.module_id === m.id)
    }));
  },
  ["course-outline"],
  {
    revalidate: 1800, // Revalidate every 30 minutes
    tags: ["courses", "modules", "lessons"],
  }
);

export async function getAdjacentLessons(courseId: string, currentLessonId: string) {
  const supabase = supabaseServer();

  // Get all modules and lessons for the course, sorted correctly
  const outline = await getCourseOutline(courseId);

  // Flatten lessons into a single ordered array
  const allLessons: { id: string; title: string }[] = [];
  for (const module of outline) {
    for (const lesson of module.lessons) {
      allLessons.push({ id: lesson.id, title: lesson.title });
    }
  }

  // Find current lesson index
  const currentIndex = allLessons.findIndex((l) => l.id === currentLessonId);

  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  return {
    prev: currentIndex > 0 ? allLessons[currentIndex - 1] : null,
    next: currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null,
  };
}
