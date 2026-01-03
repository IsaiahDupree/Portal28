import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// GET /api/studio/courses/[id]/chapters - List chapters
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: chapters, error } = await supabase
    .from("chapters")
    .select(`
      *,
      lessons:lessons(id, title, lesson_type, position, is_published)
    `)
    .eq("course_id", params.id)
    .order("position", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sort lessons within each chapter
  chapters?.forEach((chapter: any) => {
    if (chapter.lessons) {
      chapter.lessons.sort((a: any, b: any) => a.position - b.position);
    }
  });

  return NextResponse.json({ chapters });
}

// POST /api/studio/courses/[id]/chapters - Create chapter
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
  const { title } = body;

  // Get max position
  const { data: existing } = await supabase
    .from("chapters")
    .select("position")
    .eq("course_id", params.id)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const position = (existing?.position || 0) + 1000;

  const { data: chapter, error } = await supabase
    .from("chapters")
    .insert({
      course_id: params.id,
      title: title || "New Chapter",
      position,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ chapter }, { status: 201 });
}
