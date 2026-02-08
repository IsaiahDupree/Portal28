import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { updateTimeSpent } from "@/lib/progress/lessonProgress";

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { lessonId, courseId, secondsToAdd } = body;

  if (!lessonId || !courseId || typeof secondsToAdd !== "number") {
    return NextResponse.json(
      { error: "lessonId, courseId, and secondsToAdd required" },
      { status: 400 }
    );
  }

  if (secondsToAdd < 0 || secondsToAdd > 3600) {
    return NextResponse.json(
      { error: "secondsToAdd must be between 0 and 3600" },
      { status: 400 }
    );
  }

  await updateTimeSpent(auth.user.id, lessonId, courseId, secondsToAdd);

  return NextResponse.json({ ok: true });
}
