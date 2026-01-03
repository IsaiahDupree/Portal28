import { supabaseServer } from "@/lib/supabase/server";

export async function userHasCourseAccess(userId: string, courseId: string) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("entitlements")
    .select("id,status")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .eq("status", "active")
    .maybeSingle();

  if (error) return false;
  return !!data;
}
