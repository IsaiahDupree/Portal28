import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// POST /api/uploads/complete - Mark upload as complete, create records
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { 
    lessonId, 
    storageKey, 
    filename, 
    contentType, 
    sizeBytes, 
    fileKind = "attachment",
    isVideo = false,
    embedUrl,
    provider,
  } = body;

  if (!lessonId) {
    return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
  }

  // Handle video uploads/embeds
  if (isVideo || contentType?.startsWith("video/") || embedUrl) {
    const mediaData: Record<string, any> = {
      lesson_id: lessonId,
      media_kind: "video",
      source: embedUrl ? "embed" : "upload",
      status: embedUrl ? "ready" : "processing",
    };

    if (embedUrl) {
      mediaData.source_url = embedUrl;
      mediaData.playback_url = embedUrl;
      mediaData.provider = provider || detectProvider(embedUrl);
    } else {
      mediaData.source_url = storageKey;
      // In production, you'd kick off transcoding here (Mux, Cloudflare Stream, etc.)
      // For now, mark as ready with direct URL
      const bucket = "videos";
      const { data: urlData } = await supabase.storage
        .from(bucket)
        .getPublicUrl(storageKey);
      
      mediaData.playback_url = urlData?.publicUrl || storageKey;
      mediaData.status = "ready"; // In prod, this would be "processing"
    }

    // Upsert media record (one video per lesson for now)
    const { data: media, error: mediaError } = await supabase
      .from("lesson_media")
      .upsert(mediaData, { onConflict: "lesson_id" })
      .select()
      .single();

    if (mediaError) {
      // If table doesn't exist yet, just update lesson directly
      await supabase
        .from("lessons")
        .update({ 
          video_url: embedUrl || storageKey,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lessonId);

      return NextResponse.json({ 
        success: true, 
        type: "video",
        url: embedUrl || storageKey,
      });
    }

    return NextResponse.json({ media, type: "video" });
  }

  // Handle file uploads (attachments, PDFs)
  const bucket = "files";
  const { data: urlData } = await supabase.storage
    .from(bucket)
    .getPublicUrl(storageKey);

  const fileUrl = urlData?.publicUrl || storageKey;

  const { data: file, error: fileError } = await supabase
    .from("lesson_files")
    .insert({
      lesson_id: lessonId,
      file_kind: fileKind,
      storage_key: storageKey,
      filename,
      mime_type: contentType,
      size_bytes: sizeBytes,
      url: fileUrl,
    })
    .select()
    .single();

  if (fileError) {
    // Fallback: add to lesson downloads array
    const { data: lesson } = await supabase
      .from("lessons")
      .select("downloads")
      .eq("id", lessonId)
      .single();

    const downloads = (lesson?.downloads || []) as any[];
    downloads.push({
      url: fileUrl,
      label: filename,
      type: fileKind,
    });

    await supabase
      .from("lessons")
      .update({ 
        downloads,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lessonId);

    return NextResponse.json({ 
      success: true, 
      type: "file",
      url: fileUrl,
    });
  }

  return NextResponse.json({ file, type: "file" });
}

function detectProvider(url: string): string {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("vimeo.com")) return "vimeo";
  if (url.includes("loom.com")) return "loom";
  if (url.includes("wistia.com")) return "wistia";
  return "other";
}
