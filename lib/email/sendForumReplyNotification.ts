import { resend, RESEND_FROM } from "./resend";
import { ForumReplyEmail } from "@/components/emails/ForumReplyEmail";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface ForumReplyNotificationArgs {
  recipientEmail: string;
  recipientName?: string;
  recipientUserId: string;
  replierName: string;
  replyContent: string;
  threadId: string;
  threadTitle: string;
  spaceId: string;
  spaceName: string;
}

/**
 * Send email notification when someone replies to a forum thread
 */
export async function sendForumReplyNotification(args: ForumReplyNotificationArgs) {
  const {
    recipientEmail,
    recipientName,
    recipientUserId,
    replierName,
    replyContent,
    threadId,
    threadTitle,
    spaceId,
    spaceName,
  } = args;

  // Check if recipient has unsubscribed
  const { data: isUnsubscribed } = await supabaseAdmin.rpc("is_unsubscribed", {
    p_user_id: recipientUserId,
    p_email: recipientEmail,
    p_unsubscribe_type: "replies",
    p_space_id: spaceId,
  });

  if (isUnsubscribed) {
    console.log(`User ${recipientEmail} has unsubscribed from reply notifications`);
    return null;
  }

  // Check email preferences
  const { data: preferences } = await supabaseAdmin
    .from("email_preferences")
    .select("replies_enabled")
    .eq("user_id", recipientUserId)
    .eq("space_id", spaceId)
    .single();

  // Default to enabled if no preference set
  const repliesEnabled = preferences?.replies_enabled ?? true;

  if (!repliesEnabled) {
    console.log(`User ${recipientEmail} has disabled reply notifications`);
    return null;
  }

  // Generate URLs
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:2828";
  const threadUrl = `${siteUrl}/app/community/forum/${threadId}`;

  // Generate unsubscribe URL with token
  const unsubscribeToken = Buffer.from(
    JSON.stringify({
      email: recipientEmail,
      userId: recipientUserId,
      spaceId: spaceId,
      type: "replies",
      timestamp: Date.now(),
    })
  ).toString("base64url");

  const unsubscribeUrl = `${siteUrl}/unsubscribe/${unsubscribeToken}`;

  const subject = `${replierName} replied to your post in ${spaceName}`;

  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: [recipientEmail],
      subject,
      react: ForumReplyEmail({
        recipientName,
        replierName,
        replyContent,
        threadTitle,
        threadUrl,
        spaceName,
        unsubscribeUrl,
      }),
    });

    // Log the send attempt
    await supabaseAdmin.from("email_sends").insert({
      email: recipientEmail,
      template: "forum_reply",
      resend_email_id: data?.id ?? null,
      subject,
      status: error ? "failed" : "sent",
      error_message: error ? JSON.stringify(error) : null,
      metadata: {
        thread_id: threadId,
        space_id: spaceId,
        recipient_user_id: recipientUserId,
      },
    });

    if (error) {
      console.error("Error sending forum reply email:", error);
      throw new Error(JSON.stringify(error));
    }

    return data;
  } catch (error) {
    console.error("Failed to send forum reply notification:", error);
    // Don't throw - email sending should not break the main flow
    return null;
  }
}
