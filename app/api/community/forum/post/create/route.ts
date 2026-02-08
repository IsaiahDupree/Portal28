import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/createNotification";
import { sendForumReplyNotification } from "@/lib/email/sendForumReplyNotification";

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
    .select("id,is_locked,author_user_id,title,space_id")
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

  // Send notification to thread author if they're not the one replying
  if (thread.author_user_id && thread.author_user_id !== auth.user.id) {
    try {
      // Get replier name
      const replierName =
        auth.user.user_metadata?.full_name ||
        auth.user.email?.split("@")[0] ||
        "A user";

      // Get thread author details
      const { data: threadAuthor } = await supabaseAdmin.auth.admin.getUserById(
        thread.author_user_id
      );

      if (threadAuthor?.user) {
        const recipientEmail = threadAuthor.user.email;
        const recipientName =
          threadAuthor.user.user_metadata?.full_name ||
          recipientEmail?.split("@")[0];

        // Get space details
        const { data: space } = await supabaseAdmin
          .from("community_spaces")
          .select("name")
          .eq("id", thread.space_id)
          .single();

        const spaceName = space?.name || "Community";

        // Create in-app notification
        await createNotification({
          userId: thread.author_user_id,
          type: "reply",
          title: "New reply to your post",
          message: `${replierName} replied to your post in "${thread.title}"`,
          link: `/app/community/forum/${threadId}`,
          metadata: {
            threadId,
            spaceId: thread.space_id,
            replierId: auth.user.id,
          },
        });

        // Send email notification (fire and forget - don't break main flow if fails)
        if (recipientEmail) {
          sendForumReplyNotification({
            recipientEmail,
            recipientName,
            recipientUserId: thread.author_user_id,
            replierName,
            replyContent: body.trim(),
            threadId,
            threadTitle: thread.title,
            spaceId: thread.space_id,
            spaceName,
          }).catch((err) => {
            console.error("Failed to send forum reply email:", err);
          });
        }
      }
    } catch (notificationError) {
      // Log but don't fail the request
      console.error("Error sending reply notification:", notificationError);
    }
  }

  return NextResponse.json({ ok: true });
}
