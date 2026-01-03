import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// POST /api/studio/chapters/[id]/lessons - Create lesson
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, lesson_type = "multimedia" } = body;

  // Get chapter to find course_id (for module_id backward compat)
  const { data: chapter } = await supabase
    .from("chapters")
    .select("course_id")
    .eq("id", params.id)
    .single();

  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  // Get max position in chapter
  const { data: existing } = await supabase
    .from("lessons")
    .select("position")
    .eq("chapter_id", params.id)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const position = (existing?.position || 0) + 1000;

  const { data: lesson, error } = await supabase
    .from("lessons")
    .insert({
      chapter_id: params.id,
      module_id: chapter.course_id, // backward compat
      title: title || "New Lesson",
      lesson_type,
      position,
      drip_type: "immediate",
      content_doc: {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lesson }, { status: 201 });
}
