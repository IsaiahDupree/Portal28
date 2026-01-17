import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { body } = await req.json();

  if (!body?.trim()) {
    return NextResponse.json({ error: "Body is required" }, { status: 400 });
  }

  // Check if post exists and user is the author
  const { data: post } = await supabase
    .from("forum_posts")
    .select("id, author_user_id, thread_id")
    .eq("id", params.postId)
    .single();

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.author_user_id !== auth.user.id) {
    return NextResponse.json(
      { error: "You can only edit your own posts" },
      { status: 403 }
    );
  }

  // Update the post
  const { error } = await supabase
    .from("forum_posts")
    .update({
      body: body.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.postId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if post exists and user is the author
  const { data: post } = await supabase
    .from("forum_posts")
    .select("id, author_user_id, thread_id")
    .eq("id", params.postId)
    .single();

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.author_user_id !== auth.user.id) {
    return NextResponse.json(
      { error: "You can only delete your own posts" },
      { status: 403 }
    );
  }

  // Delete the post (this will auto-decrement reply_count via trigger)
  const { error } = await supabase
    .from("forum_posts")
    .delete()
    .eq("id", params.postId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
