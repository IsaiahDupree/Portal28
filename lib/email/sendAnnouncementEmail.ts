import { resend, RESEND_FROM } from "./resend";
import { AnnouncementEmail } from "@/components/emails/AnnouncementEmail";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface AnnouncementEmailArgs {
  announcementId: string;
  to: string;
  recipientName?: string;
  recipientUserId?: string;
}

export async function sendAnnouncementEmail(args: AnnouncementEmailArgs) {
  const { announcementId, to, recipientName, recipientUserId } = args;

  // Fetch announcement details
  const { data: announcement, error: fetchError } = await supabaseAdmin
    .from("announcements")
    .select(`
      id,
      title,
      content,
      excerpt,
      author_id,
      space_id,
      community_spaces!inner(name)
    `)
    .eq("id", announcementId)
    .single();

  if (fetchError || !announcement) {
    throw new Error(`Failed to fetch announcement: ${fetchError?.message}`);
  }

  // Fetch author details
  const { data: author } = await supabaseAdmin
    .from("users")
    .select("email, id")
    .eq("id", announcement.author_id)
    .single();

  const authorName = author?.email?.split("@")[0] || "Community Admin";
  const spaceName = (announcement.community_spaces as any)?.name || "Community";

  // Generate URLs
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:2828";
  const announcementUrl = `${siteUrl}/app/community/announcements/${announcement.id}`;

  // Generate unsubscribe URL with token
  const unsubscribeToken = Buffer.from(
    JSON.stringify({
      email: to,
      userId: recipientUserId,
      spaceId: announcement.space_id,
      type: "announcements",
      timestamp: Date.now(),
    })
  ).toString("base64url");

  const unsubscribeUrl = `${siteUrl}/unsubscribe/${unsubscribeToken}`;

  const subject = `${spaceName}: ${announcement.title}`;

  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: [to],
      subject,
      react: AnnouncementEmail({
        recipientName,
        announcementTitle: announcement.title,
        announcementContent: announcement.content,
        announcementExcerpt: announcement.excerpt || undefined,
        authorName,
        spaceName,
        announcementUrl,
        unsubscribeUrl,
      }),
    });

    // Log the send attempt
    await supabaseAdmin.from("email_sends").insert({
      email: to,
      template: "announcement",
      resend_email_id: data?.id ?? null,
      subject,
      status: error ? "failed" : "sent",
      error_message: error ? JSON.stringify(error) : null,
      metadata: {
        announcement_id: announcementId,
        space_id: announcement.space_id,
        recipient_user_id: recipientUserId,
      },
    });

    if (error) {
      console.error("Error sending announcement email:", error);
      throw new Error(JSON.stringify(error));
    }

    return data;
  } catch (error) {
    console.error("Failed to send announcement email:", error);
    throw error;
  }
}

// Function to send announcement to all recipients
export async function sendAnnouncementToAll(announcementId: string) {
  // Get all recipients
  const { data: recipients, error } = await supabaseAdmin.rpc(
    "get_announcement_email_recipients",
    { p_announcement_id: announcementId }
  );

  if (error) {
    console.error("Error fetching recipients:", error);
    throw new Error(`Failed to fetch recipients: ${error.message}`);
  }

  if (!recipients || recipients.length === 0) {
    console.log("No recipients found for announcement:", announcementId);
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  // Send emails in batches of 10 to avoid rate limiting
  const batchSize = 10;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    const promises = batch.map(async (recipient: any) => {
      try {
        await sendAnnouncementEmail({
          announcementId,
          to: recipient.email,
          recipientName: recipient.name,
          recipientUserId: recipient.user_id,
        });
        sent++;
      } catch (error) {
        console.error(`Failed to send to ${recipient.email}:`, error);
        failed++;
      }
    });

    await Promise.allSettled(promises);

    // Small delay between batches
    if (i + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Update announcement with email sent status
  await supabaseAdmin
    .from("announcements")
    .update({
      email_sent_at: new Date().toISOString(),
      email_recipients_count: sent,
    })
    .eq("id", announcementId);

  return { sent, failed, total: recipients.length };
}
