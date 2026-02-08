import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Cron job to auto-publish scheduled content
 *
 * This endpoint should be called by Vercel Cron every minute:
 * vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/publish-scheduled",
 *     "schedule": "* * * * *"
 *   }]
 * }
 *
 * Or use an external cron service to call this endpoint
 */
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  try {
    // Find all pending content that should be published now
    const { data: scheduledItems, error } = await supabase
      .from("scheduled_content")
      .select("*")
      .eq("status", "pending")
      .eq("auto_publish", true)
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(10); // Process up to 10 items per run

    if (error) {
      console.error("Error fetching scheduled content:", error);
      return NextResponse.json({ error: "Failed to fetch scheduled content" }, { status: 500 });
    }

    if (!scheduledItems || scheduledItems.length === 0) {
      return NextResponse.json({ message: "No content to publish", published: 0 });
    }

    const results = [];

    // Process each scheduled item
    for (const item of scheduledItems) {
      // Mark as publishing
      await supabase
        .from("scheduled_content")
        .update({ status: "publishing" })
        .eq("id", item.id);

      try {
        // Publish the content based on type
        const publishResult = await publishContent(supabase, item);

        if (publishResult.success) {
          // Mark as published
          await supabase
            .from("scheduled_content")
            .update({
              status: "published",
              published_at: new Date().toISOString(),
            })
            .eq("id", item.id);

          results.push({
            id: item.id,
            contentType: item.content_type,
            contentId: item.content_id,
            status: "published",
          });
        } else {
          throw new Error(publishResult.error);
        }
      } catch (error: any) {
        console.error(`Error publishing ${item.content_type} ${item.content_id}:`, error);

        // Check if we should retry
        const shouldRetry = item.retry_count < item.max_retries;

        await supabase
          .from("scheduled_content")
          .update({
            status: shouldRetry ? "pending" : "failed",
            error_message: error.message,
            retry_count: item.retry_count + 1,
          })
          .eq("id", item.id);

        results.push({
          id: item.id,
          contentType: item.content_type,
          contentId: item.content_id,
          status: "failed",
          error: error.message,
          willRetry: shouldRetry,
        });
      }
    }

    return NextResponse.json({
      message: "Scheduled content processed",
      processed: results.length,
      results,
    });
  } catch (error: any) {
    console.error("Cron job error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Publish content based on type
 */
async function publishContent(
  supabase: any,
  scheduleItem: any
): Promise<{ success: boolean; error?: string }> {
  const { content_type, content_id, publish_action } = scheduleItem;

  try {
    switch (content_type) {
      case "course":
        // Update course to published
        const { error: courseError } = await supabase
          .from("courses")
          .update({
            published: true,
            published_at: new Date().toISOString(),
          })
          .eq("id", content_id);

        if (courseError) throw courseError;

        // Execute additional publish actions
        if (publish_action?.sendNotification) {
          // TODO: Send notification to students/subscribers
        }

        return { success: true };

      case "lesson":
        // Update lesson visibility
        const { error: lessonError } = await supabase
          .from("lessons")
          .update({
            is_preview: false,
            published_at: new Date().toISOString(),
          })
          .eq("id", content_id);

        if (lessonError) throw lessonError;
        return { success: true };

      case "announcement":
        // Update announcement published_at
        const { error: announcementError } = await supabase
          .from("announcements")
          .update({
            published_at: new Date().toISOString(),
          })
          .eq("id", content_id);

        if (announcementError) throw announcementError;

        // Send notification if configured
        if (publish_action?.sendNotification) {
          // TODO: Send announcement notification
        }

        return { success: true };

      case "youtube_video":
        // Update YouTube video status
        const { error: youtubeError } = await supabase
          .from("youtube_uploads")
          .update({
            status: "published",
            published_at: new Date().toISOString(),
            privacy_status: "public",
          })
          .eq("id", content_id);

        if (youtubeError) throw youtubeError;
        return { success: true };

      case "email":
        // Trigger email send
        const { data: emailProgram } = await supabase
          .from("email_programs")
          .select("*")
          .eq("id", content_id)
          .single();

        if (!emailProgram) {
          return { success: false, error: "Email program not found" };
        }

        // TODO: Trigger email send via Resend
        return { success: true };

      default:
        return { success: false, error: `Unsupported content type: ${content_type}` };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
