import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sendCommentNotification } from "@/lib/email/sendCommentNotification";
import { createNotification } from "@/lib/notifications/createNotification";

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
      parent_comment_id,
      reply_count,
      users!inner(email, full_name, avatar_url)
    `)
    .eq("lesson_id", lessonId)
    .is("parent_comment_id", null)
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
      parentCommentId: comment.parent_comment_id,
      replyCount: comment.reply_count,
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

  const { lessonId, content, parentCommentId } = await req.json();

  if (!lessonId || !content?.trim()) {
    return NextResponse.json({ error: "lessonId and content required" }, { status: 400 });
  }

  // If it's a reply, verify the parent comment exists and belongs to the same lesson
  if (parentCommentId) {
    const { data: parentComment, error: parentError } = await supabase
      .from("lesson_comments")
      .select("lesson_id")
      .eq("id", parentCommentId)
      .single();

    if (parentError || !parentComment) {
      return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
    }

    if (parentComment.lesson_id !== lessonId) {
      return NextResponse.json({ error: "Parent comment not in the same lesson" }, { status: 400 });
    }
  }

  // Insert comment
  const { data: comment, error } = await supabase
    .from("lesson_comments")
    .insert({
      user_id: user.id,
      lesson_id: lessonId,
      content: content.trim(),
      parent_comment_id: parentCommentId || null,
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

  // Send notification if this is a reply
  if (parentCommentId) {
    // Get parent comment author info
    const { data: parentCommentData } = await supabase
      .from("lesson_comments")
      .select(`
        user_id,
        lesson_id,
        lessons!inner(title)
      `)
      .eq("id", parentCommentId)
      .single();

    if (parentCommentData && parentCommentData.user_id !== user.id) {
      // Don't notify yourself
      const { data: parentAuthor } = await supabase
        .from("users")
        .select("email, full_name")
        .eq("id", parentCommentData.user_id)
        .single();

      if (parentAuthor?.email) {
        const lessonData = parentCommentData.lessons as any;
        const lessonTitle = lessonData?.title || "the lesson";
        const lessonUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/app/lesson/${parentCommentData.lesson_id}`;
        const commenterName = userData?.full_name || userData?.email?.split("@")[0] || "Someone";

        // Create in-app notification
        createNotification({
          userId: parentCommentData.user_id,
          type: "reply",
          title: "New reply to your comment",
          message: `${commenterName} replied to your comment: "${content.trim().substring(0, 100)}${content.trim().length > 100 ? "..." : ""}"`,
          link: lessonUrl,
          metadata: {
            lessonId: parentCommentData.lesson_id,
            commentId: comment.id,
            parentCommentId,
          },
        }).catch(err => console.error("Failed to create notification:", err));

        // Send email notification (fire and forget - don't await)
        sendCommentNotification({
          recipientEmail: parentAuthor.email,
          recipientName: parentAuthor.full_name || "User",
          commenterName,
          commentContent: content.trim(),
          lessonTitle,
          lessonUrl,
          isReply: true,
        }).catch(err => console.error("Failed to send notification:", err));
      }
    }
  }

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
      parentCommentId: comment.parent_comment_id,
      replyCount: 0,
    },
  });
}
