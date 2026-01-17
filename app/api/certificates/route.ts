import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/certificates
 * Get user's certificates
 *
 * Query params:
 * - courseId: Optional - filter by specific course
 */
export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");

  let query = supabase
    .from("certificates")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (courseId) {
    query = query.eq("course_id", courseId);
  }

  const { data: certificates, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ certificates });
}
