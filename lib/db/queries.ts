import { createClient } from "@supabase/supabase-js";

// Create a static Supabase client for cached queries (no cookies needed)
function getStaticSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function getPublishedCourses() {
  const supabase = getStaticSupabase();
  const { data, error } = await supabase
    .from("courses")
    .select("id,title,slug,description,hero_image")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCourseBySlug(slug: string) {
  const supabase = getStaticSupabase();
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data;
}

export async function getCourseOutline(courseId: string) {
  const supabase = getStaticSupabase();
  const { data: modules, error: mErr } = await supabase
    .from("modules")
    .select("id,title,sort_order")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  if (mErr) throw new Error(mErr.message);

  const moduleIds = (modules ?? []).map((m) => m.id);
  const { data: lessons, error: lErr } = await supabase
    .from("lessons")
    .select("id,module_id,title,sort_order,drip_type,drip_value")
    .in("module_id", moduleIds.length ? moduleIds : ["00000000-0000-0000-0000-000000000000"])
    .order("sort_order", { ascending: true });

  if (lErr) throw new Error(lErr.message);

  return (modules ?? []).map((m) => ({
    ...m,
    lessons: (lessons ?? []).filter((l) => l.module_id === m.id)
  }));
}

export async function getAdjacentLessons(courseId: string, currentLessonId: string) {
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
