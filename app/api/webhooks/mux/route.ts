import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role for webhook (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  // In production: verify Mux signature header
  // const signature = req.headers.get("mux-signature");
  // Verify with process.env.MUX_WEBHOOK_SECRET
  
  let evt: any;
  try {
    evt = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = evt?.type as string | undefined;
  const data = evt?.data;

  console.log(`[Mux Webhook] ${type}`, data?.id);

  // video.upload.asset_created: upload complete, asset being processed
  if (type === "video.upload.asset_created") {
    const uploadId = data?.id;
    const assetId = data?.asset_id;

    if (uploadId && assetId) {
      await supabaseAdmin
        .from("lesson_media")
        .update({ asset_id: assetId, status: "processing" })
        .eq("upload_id", uploadId);
    }
  }

  // video.asset.created: asset exists, may still be processing
  if (type === "video.asset.created") {
    const assetId = data?.id;
    const uploadId = data?.upload_id;

    if (uploadId) {
      await supabaseAdmin
        .from("lesson_media")
        .update({ asset_id: assetId, status: "processing" })
        .eq("upload_id", uploadId);
    }
  }

  // video.asset.ready: playback id is available
  if (type === "video.asset.ready") {
    const assetId = data?.id;
    const playbackId = data?.playback_ids?.[0]?.id;
    const duration = data?.duration ? Math.round(data.duration) : null;

    if (assetId) {
      const thumbnailUrl = playbackId
        ? `https://image.mux.com/${playbackId}/thumbnail.jpg`
        : null;

      await supabaseAdmin
        .from("lesson_media")
        .update({
          playback_id: playbackId,
          duration_seconds: duration,
          thumbnail_url: thumbnailUrl,
          status: "ready",
        })
        .eq("asset_id", assetId);

      console.log(`[Mux] Asset ${assetId} ready, playback: ${playbackId}`);
    }
  }

  // video.asset.errored
  if (type === "video.asset.errored") {
    const assetId = data?.id;
    if (assetId) {
      await supabaseAdmin
        .from("lesson_media")
        .update({ status: "failed" })
        .eq("asset_id", assetId);
      
      console.error(`[Mux] Asset ${assetId} failed:`, data?.errors);
    }
  }

  return NextResponse.json({ received: true });
}
