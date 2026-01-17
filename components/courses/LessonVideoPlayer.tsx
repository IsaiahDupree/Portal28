"use client";

import { useState, useEffect, useCallback } from "react";
import { VideoPlayer } from "./VideoPlayer";
import { useDebounce } from "@/lib/hooks/useDebounce";

interface LessonVideoPlayerProps {
  lessonId: string;
  videoUrl?: string;
  muxPlaybackId?: string;
  title?: string;
  onComplete?: () => void;
}

export function LessonVideoPlayer({
  lessonId,
  videoUrl,
  muxPlaybackId,
  title,
  onComplete,
}: LessonVideoPlayerProps) {
  const [muxToken, setMuxToken] = useState<string | undefined>();
  const [progressPosition, setProgressPosition] = useState(0);
  const [progressDuration, setProgressDuration] = useState(0);

  // Debounce progress updates to avoid excessive API calls
  const debouncedPosition = useDebounce(progressPosition, 3000);

  // Fetch Mux token if needed
  useEffect(() => {
    if (muxPlaybackId) {
      fetch(`/api/lessons/${lessonId}/mux-token`)
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            setMuxToken(data.token);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch Mux token:", err);
        });
    }
  }, [lessonId, muxPlaybackId]);

  // Update progress on server when position changes
  useEffect(() => {
    if (debouncedPosition > 0 && progressDuration > 0) {
      fetch("/api/video-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          playbackId: muxPlaybackId || videoUrl,
          positionSeconds: debouncedPosition,
          durationSeconds: progressDuration,
        }),
      }).catch((err) => {
        console.error("Failed to update video progress:", err);
      });
    }
  }, [debouncedPosition, progressDuration, lessonId, muxPlaybackId, videoUrl]);

  const handleProgress = useCallback((position: number, duration: number) => {
    setProgressPosition(position);
    setProgressDuration(duration);
  }, []);

  // If we have a Mux video but no token yet, show loading
  if (muxPlaybackId && !muxToken) {
    return (
      <div className="w-full aspect-video bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Loading video...</p>
      </div>
    );
  }

  return (
    <VideoPlayer
      src={videoUrl || ""}
      muxPlaybackId={muxPlaybackId}
      muxPlaybackToken={muxToken}
      lessonId={lessonId}
      title={title}
      onComplete={onComplete}
      onProgress={handleProgress}
    />
  );
}
