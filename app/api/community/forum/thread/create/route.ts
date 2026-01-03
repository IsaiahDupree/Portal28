import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getPortal28SpaceId } from "@/lib/community/community";

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { widgetKey, categorySlug, title, body } = await req.json();

  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
  }

  const { data: widget } = await supabase
    .from("widgets")
    .select("community_space_id")
    .eq("key", widgetKey)
    .single();

  const spaceId = widget?.community_space_id ?? (await getPortal28SpaceId());

  const { data: category } = await supabase
    .from("forum_categories")
    .select("id")
    .eq("space_id", spaceId)
    .eq("slug", categorySlug)
    .single();

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const { data: thread, error: threadError } = await supabase
    .from("forum_threads")
    .insert({
      space_id: spaceId,
      category_id: category.id,
      title: title.trim(),
      author_user_id: auth.user.id,
    })
    .select("id")
    .single();

  if (threadError) {
    return NextResponse.json({ error: threadError.message }, { status: 400 });
  }

  const { error: postError } = await supabase.from("forum_posts").insert({
    thread_id: thread.id,
    author_user_id: auth.user.id,
    body: body.trim(),
  });

  if (postError) {
    return NextResponse.json({ error: postError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, threadId: thread.id });
}
