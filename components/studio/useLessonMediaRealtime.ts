"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export interface LessonMedia {
  id: string;
  lesson_id: string;
  source: string;
  provider: string;
  source_url: string | null;
  asset_id: string | null;
  upload_id: string | null;
  playback_id: string | null;
  status: "empty" | "uploading" | "processing" | "ready" | "failed";
  duration_seconds: number | null;
  thumbnail_url: string | null;
  metadata: any;
  updated_at: string;
}

export function useLessonMediaRealtime(lessonId: string) {
  const [media, setMedia] = useState<LessonMedia | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Initial fetch
    supabase
      .from("lesson_media")
      .select("*")
      .eq("lesson_id", lessonId)
      .maybeSingle()
      .then(({ data }) => {
        if (mounted) {
          setMedia(data);
          setLoading(false);
        }
      });

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`lesson-media-${lessonId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lesson_media",
          filter: `lesson_id=eq.${lessonId}`,
        },
        (payload) => {
          if (!mounted) return;
          
          if (payload.eventType === "DELETE") {
            setMedia(null);
          } else {
            setMedia(payload.new as LessonMedia);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [lessonId]);

  return { media, loading };
}

// Helper to get Mux playback URL
export function getMuxPlaybackUrl(playbackId: string, type: "video" | "thumbnail" = "video") {
  if (type === "thumbnail") {
    return `https://image.mux.com/${playbackId}/thumbnail.jpg`;
  }
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

// Helper to get Mux embed URL for iframe
export function getMuxEmbedUrl(playbackId: string) {
  return `https://stream.mux.com/${playbackId}`;
}
