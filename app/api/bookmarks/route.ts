import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lessonId = req.nextUrl.searchParams.get("lessonId");

  // If lessonId is provided, check if that lesson is bookmarked
  if (lessonId) {
    const { data: bookmark, error } = await supabase
      .from("lesson_bookmarks")
      .select("*")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bookmarked: !!bookmark });
  }

  // Otherwise, fetch all bookmarks with lesson details
  const { data: bookmarks, error } = await supabase
    .from("lesson_bookmarks")
    .select(`
      id,
      lesson_id,
      created_at,
      lessons (
        id,
        title,
        description,
        module_id,
        modules (
          title,
          course_id,
          courses (
            id,
            title,
            slug
          )
        )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bookmarks: bookmarks || [] });
}

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lessonId } = await req.json();

  if (!lessonId) {
    return NextResponse.json({ error: "lessonId required" }, { status: 400 });
  }

  // Insert the bookmark
  const { data: bookmark, error } = await supabase
    .from("lesson_bookmarks")
    .insert({
      user_id: user.id,
      lesson_id: lessonId,
    })
    .select()
    .single();

  if (error) {
    // Check for unique constraint violation (already bookmarked)
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already bookmarked" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bookmark });
}

export async function DELETE(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lessonId = req.nextUrl.searchParams.get("lessonId");

  if (!lessonId) {
    return NextResponse.json({ error: "lessonId required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("lesson_bookmarks")
    .delete()
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
