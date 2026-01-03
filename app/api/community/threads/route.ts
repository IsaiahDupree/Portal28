import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, body: content, categoryId, widgetKey } = body;

  if (!title || !content) {
    return NextResponse.json({ error: "Title and body required" }, { status: 400 });
  }

  const { data: thread, error } = await supabase
    .from("forum_threads")
    .insert({
      title,
      body: content,
      category_id: categoryId,
      widget_key: widgetKey || "forums",
      author_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ thread });
}

export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const widgetKey = searchParams.get("widgetKey") || "forums";

  let query = supabase
    .from("forum_threads")
    .select(`
      *,
      author:users(id, email, full_name),
      replies_count:forum_replies(count)
    `)
    .eq("widget_key", widgetKey)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data: threads, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ threads });
}
