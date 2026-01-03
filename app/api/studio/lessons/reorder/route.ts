import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// POST /api/studio/lessons/reorder - Reorder lessons
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { lessonId, newChapterId, newPosition } = body;

  if (!lessonId || newPosition === undefined) {
    return NextResponse.json(
      { error: "lessonId and newPosition are required" },
      { status: 400 }
    );
  }

  const updates: Record<string, any> = {
    position: newPosition,
    updated_at: new Date().toISOString(),
  };

  if (newChapterId) {
    updates.chapter_id = newChapterId;
  }

  const { data: lesson, error } = await supabase
    .from("lessons")
    .update(updates)
    .eq("id", lessonId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lesson });
}
