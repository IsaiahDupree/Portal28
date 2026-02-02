import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getUploadStatus } from "@/lib/mux";

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseServer();

    // Check authentication and admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get uploadId from query params
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get("uploadId");

    if (!uploadId) {
      return NextResponse.json(
        { error: "uploadId is required" },
        { status: 400 }
      );
    }

    // Get upload status from Mux
    const uploadStatus = await getUploadStatus(uploadId);

    if (!uploadStatus) {
      return NextResponse.json(
        { error: "Upload not found" },
        { status: 404 }
      );
    }

    // Map Mux status to our status
    const status = uploadStatus.status;
    const assetId = uploadStatus.asset_id;

    // If asset is ready, get additional details
    let playbackId = null;
    let playbackUrl = null;

    if (status === "asset_created" && assetId) {
      // Check lesson_media for this asset
      const { data: media } = await supabase
        .from("lesson_media")
        .select("playback_id, status")
        .eq("asset_id", assetId)
        .maybeSingle();

      if (media) {
        playbackId = media.playback_id;

        // Generate playback URL if we have a playback_id
        if (playbackId) {
          playbackUrl = `https://stream.mux.com/${playbackId}`;
        }

        // Return ready status if the asset is ready in our database
        if (media.status === "ready") {
          return NextResponse.json({
            status: "ready",
            assetId,
            playbackId,
            playbackUrl,
          });
        }
      }

      // Still processing
      return NextResponse.json({
        status: "processing",
        assetId,
      });
    }

    // Return current status
    return NextResponse.json({
      status: status === "waiting" ? "processing" : status,
      assetId,
    });
  } catch (error) {
    console.error("Error checking upload status:", error);
    return NextResponse.json(
      { error: "Failed to check upload status" },
      { status: 500 }
    );
  }
}
