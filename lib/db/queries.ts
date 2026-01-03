import { supabaseServer } from "@/lib/supabase/server";

export async function getPublishedCourses() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("courses")
    .select("id,title,slug,description,hero_image")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCourseBySlug(slug: string) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data;
}

export async function getCourseOutline(courseId: string) {
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
}
