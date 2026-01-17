import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lessonId = req.nextUrl.searchParams.get("lessonId");

  if (!lessonId) {
    return NextResponse.json({ error: "lessonId required" }, { status: 400 });
  }

  const { data: note, error } = await supabase
    .from("lesson_notes")
    .select("*")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ note: note || null });
}

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lessonId, content } = await req.json();

  if (!lessonId) {
    return NextResponse.json({ error: "lessonId required" }, { status: 400 });
  }

  // Upsert the note
  const { data: note, error } = await supabase
    .from("lesson_notes")
    .upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        content: content || "",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,lesson_id",
      }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ note });
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
    .from("lesson_notes")
    .delete()
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
