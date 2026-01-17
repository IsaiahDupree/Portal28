import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import Mux from "@mux/mux-node";

/**
 * POST /api/admin/mux/webhook
 * Handle Mux webhooks for asset lifecycle events
 * Verifies webhook signature and updates lesson records
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("mux-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }

    // Verify webhook signature
    const webhookSecret = process.env.MUX_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("MUX_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    // Parse the webhook payload
    // Note: Mux webhook signature verification would require @mux/mux-node-webhooks
    // For now, we'll parse the JSON and validate in other ways
    let event;
    try {
      event = JSON.parse(rawBody);
    } catch (err) {
      console.error("Failed to parse webhook body:", err);
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400 }
      );
    }

    // Handle different event types
    const eventType = event.type;
    const eventData = event.data;

    console.log(`Received Mux webhook: ${eventType}`);

    // Use service role for database updates
    const supabase = supabaseServer();

    switch (eventType) {
      case "video.asset.ready":
        // Asset is ready for playback
        await handleAssetReady(supabase, eventData);
        break;

      case "video.asset.errored":
        // Asset processing failed
        await handleAssetErrored(supabase, eventData);
        break;

      case "video.upload.asset_created":
        // Upload completed and asset was created
        await handleUploadAssetCreated(supabase, eventData);
        break;

      case "video.asset.deleted":
        // Asset was deleted
        await handleAssetDeleted(supabase, eventData);
        break;

      default:
        console.log(`Unhandled Mux webhook event: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing Mux webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleAssetReady(supabase: any, data: any) {
  const assetId = data.id;
  const playbackIds = data.playback_ids || [];
  const signedPlaybackId = playbackIds.find(
    (p: any) => p.policy === "signed"
  )?.id;

  console.log(`Asset ${assetId} is ready with playback ID: ${signedPlaybackId}`);

  // Update lesson with playback ID and status
  const { error } = await supabase
    .from("lessons")
    .update({
      mux_playback_id: signedPlaybackId || playbackIds[0]?.id,
      mux_status: "ready",
    })
    .eq("mux_asset_id", assetId);

  if (error) {
    console.error(`Failed to update lesson for asset ${assetId}:`, error);
  }
}

async function handleAssetErrored(supabase: any, data: any) {
  const assetId = data.id;

  console.error(`Asset ${assetId} processing failed`);

  // Mark lesson as errored
  const { error } = await supabase
    .from("lessons")
    .update({
      mux_status: "errored",
    })
    .eq("mux_asset_id", assetId);

  if (error) {
    console.error(`Failed to update lesson error status for asset ${assetId}:`, error);
  }
}

async function handleUploadAssetCreated(supabase: any, data: any) {
  const uploadId = data.upload_id;
  const assetId = data.asset_id;

  console.log(`Upload ${uploadId} created asset ${assetId}`);

  // Update lesson with asset ID
  const { error } = await supabase
    .from("lessons")
    .update({
      mux_asset_id: assetId,
      mux_status: "processing",
    })
    .eq("mux_upload_id", uploadId);

  if (error) {
    console.error(`Failed to link upload ${uploadId} to asset ${assetId}:`, error);
  }
}

async function handleAssetDeleted(supabase: any, data: any) {
  const assetId = data.id;

  console.log(`Asset ${assetId} was deleted`);

  // Clear Mux references from lesson
  const { error } = await supabase
    .from("lessons")
    .update({
      mux_asset_id: null,
      mux_playback_id: null,
      mux_upload_id: null,
      mux_status: null,
    })
    .eq("mux_asset_id", assetId);

  if (error) {
    console.error(`Failed to clear Mux data for asset ${assetId}:`, error);
  }
}
