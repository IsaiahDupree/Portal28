"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Loader2, CheckCircle2, AlertCircle, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MuxVideoUploadProps {
  lessonId: string;
  currentVideoUrl?: string;
  onUploadComplete?: (assetId: string, playbackId: string) => void;
}

type UploadStatus = "idle" | "uploading" | "processing" | "ready" | "error";

export function MuxVideoUpload({ lessonId, currentVideoUrl, onUploadComplete }: MuxVideoUploadProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(currentVideoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("video/")) {
      setErrorMessage("Please select a valid video file");
      setStatus("error");
      return;
    }

    // Reset state
    setStatus("uploading");
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      // Step 1: Get direct upload URL from our API
      const uploadRes = await fetch("/api/admin/mux/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to create upload URL");
      }

      const { uploadUrl, uploadId } = await uploadRes.json();

      // Step 2: Upload file directly to Mux
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200 || xhr.status === 201) {
          setStatus("processing");
          pollUploadStatus(uploadId);
        } else {
          setStatus("error");
          setErrorMessage("Upload failed. Please try again.");
        }
      });

      xhr.addEventListener("error", () => {
        setStatus("error");
        setErrorMessage("Upload failed. Please try again.");
      });

      xhr.open("PUT", uploadUrl);
      xhr.send(file);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Upload failed");
    }
  }, [lessonId]);

  const pollUploadStatus = useCallback(async (uploadId: string) => {
    const maxAttempts = 60; // 5 minutes max (5s intervals)
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/admin/mux/upload-status?uploadId=${uploadId}`);

        if (!res.ok) {
          throw new Error("Failed to check upload status");
        }

        const data = await res.json();

        if (data.status === "ready") {
          setStatus("ready");
          setUploadedVideoUrl(data.playbackUrl);
          if (onUploadComplete && data.assetId && data.playbackId) {
            onUploadComplete(data.assetId, data.playbackId);
          }
        } else if (data.status === "error" || data.status === "failed") {
          setStatus("error");
          setErrorMessage("Video processing failed. Please try again.");
        } else {
          // Still processing, check again
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, 5000); // Check every 5 seconds
          } else {
            setStatus("error");
            setErrorMessage("Processing timeout. The video may still be processing.");
          }
        }
      } catch (error) {
        setStatus("error");
        setErrorMessage("Failed to check upload status");
      }
    };

    checkStatus();
  }, [onUploadComplete]);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Mux Video Upload
        </CardTitle>
        <CardDescription>
          Upload videos directly to Mux for optimized streaming
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {status === "idle" && (
          <Button onClick={handleButtonClick} className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            Select Video File
          </Button>
        )}

        {status === "uploading" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Uploading...</span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
            <p className="text-xs text-muted-foreground">
              Please wait while your video uploads
            </p>
          </div>
        )}

        {status === "processing" && (
          <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="flex-1">
              <p className="font-medium">Processing video...</p>
              <p className="text-sm text-muted-foreground">
                This usually takes 1-2 minutes
              </p>
            </div>
          </div>
        )}

        {status === "ready" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div className="flex-1">
                <p className="font-medium text-green-900 dark:text-green-100">
                  Video ready!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your video has been uploaded and processed successfully
                </p>
              </div>
            </div>
            {uploadedVideoUrl && (
              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                <iframe
                  src={uploadedVideoUrl}
                  className="w-full h-full"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                />
              </div>
            )}
            <Button onClick={handleButtonClick} variant="outline" size="sm">
              Upload Different Video
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div className="flex-1">
                <p className="font-medium text-red-900 dark:text-red-100">
                  Upload failed
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {errorMessage || "An error occurred during upload"}
                </p>
              </div>
            </div>
            <Button onClick={handleButtonClick} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {currentVideoUrl && status === "idle" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Current video:</p>
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                src={currentVideoUrl}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
