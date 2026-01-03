import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// POST /api/studio/chapters/reorder - Reorder chapters
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { chapterId, newPosition } = body;

  if (!chapterId || newPosition === undefined) {
    return NextResponse.json(
      { error: "chapterId and newPosition are required" },
      { status: 400 }
    );
  }

  const { data: chapter, error } = await supabase
    .from("chapters")
    .update({
      position: newPosition,
      updated_at: new Date().toISOString(),
    })
    .eq("id", chapterId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ chapter });
}
