import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// GET /api/studio/courses/[id] - Get course with chapters and lessons
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
          duration_minutes
        )
      )
    `)
    .eq("id", params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Sort chapters and lessons by position
  if (course.chapters) {
    course.chapters.sort((a: any, b: any) => a.position - b.position);
    course.chapters.forEach((chapter: any) => {
      if (chapter.lessons) {
        chapter.lessons.sort((a: any, b: any) => a.position - b.position);
      }
    });
  }

  return NextResponse.json({ course });
}

// PATCH /api/studio/courses/[id] - Update course
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const allowedFields = [
    "title",
    "description",
    "hero_image_url",
    "status",
    "visibility",
    "settings",
  ];

  const updates: Record<string, any> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  updates.updated_at = new Date().toISOString();

  const { data: course, error } = await supabase
    .from("courses")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ course });
}

// DELETE /api/studio/courses/[id] - Delete course
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
