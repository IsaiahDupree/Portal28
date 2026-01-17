import { resend } from "./resend";

interface CommentNotificationParams {
  recipientEmail: string;
  recipientName: string;
  commenterName: string;
  commentContent: string;
  lessonTitle: string;
  lessonUrl: string;
  isReply: boolean;
}

export async function sendCommentNotification({
  recipientEmail,
  recipientName,
  commenterName,
  commentContent,
  lessonTitle,
  lessonUrl,
  isReply
}: CommentNotificationParams) {
  const subject = isReply
    ? `${commenterName} replied to your comment on "${lessonTitle}"`
    : `${commenterName} commented on "${lessonTitle}"`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #1a1a1a;">
            ${isReply ? 'New Reply to Your Comment' : 'New Comment on Lesson'}
          </h2>
          <p style="margin: 0 0 8px 0; color: #666;">Hi ${recipientName},</p>
          <p style="margin: 0; color: #666;">
            <strong>${commenterName}</strong> ${isReply ? 'replied to your comment' : 'commented'} on <strong>${lessonTitle}</strong>
          </p>
        </div>

        <div style="background-color: #fff; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="margin: 0; color: #333;">${commentContent}</p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${lessonUrl}" style="display: inline-block; background-color: #3b82f6; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">
            View ${isReply ? 'Reply' : 'Comment'}
          </a>
        </div>

        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 14px;">
          <p style="margin: 0 0 8px 0;">Portal28 Academy</p>
          <p style="margin: 0; font-size: 12px;">
            You received this email because you're participating in lesson discussions.
          </p>
        </div>
      </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: "Portal28 <notifications@portal28.academy>",
      to: recipientEmail,
      subject,
      html,
    });
  } catch (error) {
    console.error("Failed to send comment notification:", error);
    // Don't throw - notifications should be best-effort and not break the main flow
  }
}
