import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const commentId = params.id;

  if (!commentId) {
    return NextResponse.json({ error: "commentId required" }, { status: 400 });
  }

  // Get replies to this comment
  const { data: replies, error } = await supabase
    .from("lesson_comments")
    .select(`
      id,
      content,
      created_at,
      user_id,
      parent_comment_id,
      reply_count,
      users!inner(email, full_name, avatar_url)
    `)
    .eq("parent_comment_id", commentId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get likes for each reply
  const replyIds = replies?.map(r => r.id) || [];
  const { data: likes } = await supabase
    .from("comment_likes")
    .select("comment_id, user_id")
    .in("comment_id", replyIds);

  // Format replies with like info
  const formattedReplies = replies?.map(reply => {
    const replyLikes = likes?.filter(l => l.comment_id === reply.id) || [];
    const userData = reply.users as any;

    return {
      id: reply.id,
      userId: reply.user_id,
      userName: userData?.full_name || userData?.email?.split("@")[0] || "User",
      userAvatar: userData?.avatar_url,
      content: reply.content,
      likes: replyLikes.length,
      likedByMe: user ? replyLikes.some(l => l.user_id === user.id) : false,
      createdAt: reply.created_at,
      isOwner: user ? reply.user_id === user.id : false,
      parentCommentId: reply.parent_comment_id,
      replyCount: reply.reply_count,
    };
  }) || [];

  return NextResponse.json({ replies: formattedReplies });
}
