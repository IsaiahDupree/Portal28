import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { updateVideoMetadata, refreshAccessToken } from "@/lib/youtube/client";
import { z } from "zod";

const PublishSchema = z.object({
  privacyStatus: z.enum(["public", "unlisted"]),
  scheduledAt: z.string().datetime().optional(),
});

// POST /api/youtube/upload/[id]/publish
// Publish or schedule video publication
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uploadId = params.id;

  try {
    const body = await request.json();
    const validated = PublishSchema.parse(body);

    // Fetch upload record
    const { data: upload, error: uploadError } = await supabase
      .from("youtube_uploads")
      .select("*")
      .eq("id", uploadId)
      .eq("user_id", authData.user.id)
      .single();

    if (uploadError || !upload) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }

    if (!upload.youtube_video_id) {
      return NextResponse.json(
        { error: "Video not yet uploaded to YouTube" },
        { status: 400 }
      );
    }

    // Get user's YouTube tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from("youtube_tokens")
      .select("*")
      .eq("user_id", authData.user.id)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: "YouTube account not connected" },
        { status: 403 }
      );
    }

    let accessToken = tokenData.access_token;

    // Check if token needs refresh
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt <= fiveMinutesFromNow) {
      const refreshed = await refreshAccessToken(tokenData.refresh_token);
      accessToken = refreshed.access_token;

      await supabase
        .from("youtube_tokens")
        .update({
          access_token: refreshed.access_token,
          expires_at: new Date(refreshed.expiry_date).toISOString(),
        })
        .eq("user_id", authData.user.id);
    }

    // Check if this is scheduled or immediate publishing
    const isScheduled = validated.scheduledAt !== undefined;

    if (isScheduled) {
      // Schedule for future publication
      const scheduledAt = new Date(validated.scheduledAt!);
      const now = new Date();

      if (scheduledAt <= now) {
        return NextResponse.json(
          { error: "Scheduled time must be in the future" },
          { status: 400 }
        );
      }

      // Update local record with scheduled time
      // Note: YouTube API doesn't natively support scheduled publishing
      // You'd typically keep the video private and use a cron job to publish at the scheduled time
      const { data: updated, error: updateError } = await supabase
        .from("youtube_uploads")
        .update({
          privacy_status: "private",
          scheduled_at: scheduledAt.toISOString(),
        })
        .eq("id", uploadId)
        .select()
        .single();

      if (updateError) {
        console.error("Error scheduling publication:", updateError);
        return NextResponse.json(
          { error: "Failed to schedule publication" },
          { status: 500 }
        );
      }

      // Log admin action
      await supabase.from("admin_actions").insert({
        user_id: authData.user.id,
        action: "scheduled_youtube_video",
        details: {
          upload_id: uploadId,
          youtube_video_id: upload.youtube_video_id,
          scheduled_at: scheduledAt.toISOString(),
        },
      });

      return NextResponse.json({
        upload: updated,
        message: "Video scheduled for publication",
      });
    } else {
      // Publish immediately
      await updateVideoMetadata(accessToken, upload.youtube_video_id, {
        privacyStatus: validated.privacyStatus,
      });

      // Update local record
      const { data: updated, error: updateError } = await supabase
        .from("youtube_uploads")
        .update({
          privacy_status: validated.privacyStatus,
          status: "published",
          published_at: new Date().toISOString(),
        })
        .eq("id", uploadId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating publication status:", updateError);
        return NextResponse.json(
          { error: "Failed to update status" },
          { status: 500 }
        );
      }

      // Log admin action
      await supabase.from("admin_actions").insert({
        user_id: authData.user.id,
        action: "published_youtube_video",
        details: {
          upload_id: uploadId,
          youtube_video_id: upload.youtube_video_id,
          privacy_status: validated.privacyStatus,
        },
      });

      return NextResponse.json({
        upload: updated,
        message: "Video published successfully",
      });
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
