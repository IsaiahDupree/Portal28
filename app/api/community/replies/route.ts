import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { threadId, body: content, parentId } = body;

  if (!threadId || !content) {
    return NextResponse.json({ error: "threadId and body required" }, { status: 400 });
  }

  const { data: reply, error } = await supabase
    .from("forum_replies")
    .insert({
      thread_id: threadId,
      body: content,
      parent_id: parentId || null,
      author_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update thread's last_activity_at
  await supabase
    .from("forum_threads")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", threadId);

  return NextResponse.json({ reply });
}

export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get("threadId");

  if (!threadId) {
    return NextResponse.json({ error: "threadId required" }, { status: 400 });
  }

  const { data: replies, error } = await supabase
    .from("forum_replies")
    .select(`
      *,
      author:users(id, email, full_name)
    `)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ replies });
}
