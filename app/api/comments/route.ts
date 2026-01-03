import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const lessonId = req.nextUrl.searchParams.get("lessonId");

  if (!lessonId) {
    return NextResponse.json({ error: "lessonId required" }, { status: 400 });
  }

  // Get comments with user info and like counts
  const { data: comments, error } = await supabase
    .from("lesson_comments")
    .select(`
      id,
      content,
      created_at,
      user_id,
      users!inner(email, full_name, avatar_url)
    `)
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get likes for each comment
  const commentIds = comments?.map(c => c.id) || [];
  const { data: likes } = await supabase
    .from("comment_likes")
    .select("comment_id, user_id")
    .in("comment_id", commentIds);

  // Format comments with like info
  const formattedComments = comments?.map(comment => {
    const commentLikes = likes?.filter(l => l.comment_id === comment.id) || [];
    const userData = comment.users as any;
    
    return {
      id: comment.id,
      userId: comment.user_id,
      userName: userData?.full_name || userData?.email?.split("@")[0] || "User",
      userAvatar: userData?.avatar_url,
      content: comment.content,
      likes: commentLikes.length,
      likedByMe: user ? commentLikes.some(l => l.user_id === user.id) : false,
      createdAt: comment.created_at,
      isOwner: user ? comment.user_id === user.id : false,
    };
  }) || [];

  return NextResponse.json({ comments: formattedComments });
}

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lessonId, content } = await req.json();

  if (!lessonId || !content?.trim()) {
    return NextResponse.json({ error: "lessonId and content required" }, { status: 400 });
  }

  // Insert comment
  const { data: comment, error } = await supabase
    .from("lesson_comments")
    .insert({
      user_id: user.id,
      lesson_id: lessonId,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get user info
  const { data: userData } = await supabase
    .from("users")
    .select("email, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    comment: {
      id: comment.id,
      userId: comment.user_id,
      userName: userData?.full_name || userData?.email?.split("@")[0] || "User",
      userAvatar: userData?.avatar_url,
      content: comment.content,
      likes: 0,
      likedByMe: false,
      createdAt: comment.created_at,
      isOwner: true,
    },
  });
}
