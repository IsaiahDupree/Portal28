"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Link as LinkIcon, Loader2, Video, AlertCircle } from "lucide-react";
import type { LessonMedia } from "@/components/studio/useLessonMediaRealtime";

interface VideoLessonEditorProps {
  lessonId: string;
  media: LessonMedia | null;
  doc: any;
  onDocChange: (doc: any) => void;
  videoUrl?: string;
}

async function createMuxUpload(lessonId: string) {
  const res = await fetch("/api/video/mux/create-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lessonId }),
  });
  if (!res.ok) throw new Error("Failed to create upload");
  return res.json() as Promise<{ uploadUrl: string; uploadId: string; provider: string }>;
}

export default function VideoLessonEditor({
  lessonId,
  media,
  doc,
  onDocChange,
  videoUrl,
}: VideoLessonEditorProps) {
  const [embedUrl, setEmbedUrl] = useState(doc?.embedUrl ?? videoUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function onUploadFile(file: File) {
    setUploading(true);
    setUploadError(null);

    try {
      const { uploadUrl } = await createMuxUpload(lessonId);

      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!put.ok) throw new Error("Upload failed");
      // UI will flip automatically when webhook updates lesson_media.status
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleEmbed() {
    if (!embedUrl.trim()) return;
    onDocChange({ ...doc, embedUrl: embedUrl.trim() });
  }

  // Determine what to show based on media status
  const status = media?.status ?? "empty";
  const playbackId = media?.playback_id;
  const hasEmbed = doc?.embedUrl || videoUrl;

  return (
    <div className="space-y-6">
      {/* Processing state */}
      {status === "processing" && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-amber-600 mb-4" />
            <div className="font-semibold text-lg">Processing video...</div>
            <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
              This may take a few minutes. You can close this window and return later — we'll keep processing in the background.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Ready player (Mux) */}
      {status === "ready" && playbackId && (
        <Card>
          <CardContent className="p-0">
            <div className="aspect-video bg-black rounded-t-lg overflow-hidden">
              <video
                controls
                className="w-full h-full"
                src={`https://stream.mux.com/${playbackId}.m3u8`}
                poster={media?.thumbnail_url || undefined}
              />
            </div>
            <div className="p-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {media?.duration_seconds
                  ? `Duration: ${Math.floor(media.duration_seconds / 60)}:${String(media.duration_seconds % 60).padStart(2, "0")}`
                  : "Video ready"}
              </span>
              <Button variant="outline" size="sm" onClick={() => onDocChange({ ...doc, embedUrl: "" })}>
                Replace video
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Embed player (YouTube/Vimeo/Loom) */}
      {hasEmbed && status !== "ready" && (
        <Card>
          <CardContent className="p-0">
            <div className="aspect-video bg-black rounded-t-lg overflow-hidden">
              <iframe
                src={doc?.embedUrl || videoUrl}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <Input
                value={embedUrl}
                onChange={(e) => setEmbedUrl(e.target.value)}
                placeholder="Video URL"
                className="flex-1 mr-2"
              />
              <Button variant="outline" size="sm" onClick={handleEmbed}>
                Update
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload UI (when empty/uploading/failed) */}
      {!hasEmbed && ["empty", "uploading", "failed"].includes(status) && (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Video className="h-8 w-8 text-primary" />
              </div>
              <div className="font-semibold text-lg mb-1">Upload a video</div>
              <p className="text-sm text-muted-foreground mb-6">
                Supported formats: .mp4, .mov, .mpeg, .webm
              </p>

              {uploadError && (
                <div className="flex items-center gap-2 text-destructive text-sm mb-4">
                  <AlertCircle className="h-4 w-4" />
                  {uploadError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Button asChild disabled={uploading}>
                  <label className="cursor-pointer">
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload file
                      </>
                    )}
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onUploadFile(f);
                      }}
                    />
                  </label>
                </Button>
              </div>

              <div className="text-sm text-muted-foreground mb-4">or paste a link</div>

              <div className="flex gap-2 w-full max-w-md">
                <Input
                  placeholder="Paste a YouTube, Vimeo, or Loom link"
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmbed()}
                />
                <Button variant="outline" onClick={handleEmbed}>
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content editor */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm font-medium mb-2">Lesson Content</div>
          <Textarea
            className="min-h-[200px]"
            placeholder="Add supporting text, instructions, or notes for this lesson..."
            value={doc?.content ?? ""}
            onChange={(e) => onDocChange({ ...doc, content: e.target.value })}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Tip: You can use markdown formatting
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
