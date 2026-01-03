import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId, body } = await req.json();

  if (!threadId || !body?.trim()) {
    return NextResponse.json({ error: "Thread ID and body are required" }, { status: 400 });
  }

  const { data: thread } = await supabase
    .from("forum_threads")
    .select("id,is_locked")
    .eq("id", threadId)
    .single();

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  if (thread.is_locked) {
    return NextResponse.json({ error: "Thread is locked" }, { status: 403 });
  }

  const { error } = await supabase.from("forum_posts").insert({
    thread_id: threadId,
    author_user_id: auth.user.id,
    body: body.trim(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase
    .from("forum_threads")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", threadId);

  return NextResponse.json({ ok: true });
}
