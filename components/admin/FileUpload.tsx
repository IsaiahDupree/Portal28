"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, FileText, CheckCircle, AlertCircle, X, Download } from "lucide-react";

interface FileUploadProps {
  lessonId: string;
  currentFiles?: FileAttachment[];
  onFilesChange?: (files: FileAttachment[]) => void;
}

interface FileAttachment {
  key: string;
  filename: string;
  size: number;
  contentType: string;
  uploadedAt: string;
}

type UploadState = "idle" | "uploading" | "success" | "error";

export function FileUpload({ lessonId, currentFiles = [], onFilesChange }: FileUploadProps) {
  const [files, setFiles] = useState<FileAttachment[]>(currentFiles);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentFilename, setCurrentFilename] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setCurrentFilename(selectedFile.name);
    setUploadState("uploading");
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      // Step 1: Get presigned upload URL from backend
      const urlResponse = await fetch("/api/r2/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          filename: selectedFile.name,
          contentType: selectedFile.type || "application/octet-stream",
        }),
      });

      if (!urlResponse.ok) {
        const error = await urlResponse.json();
        throw new Error(error.error || "Failed to get upload URL");
      }

      const { uploadUrl, key } = await urlResponse.json();

      // Step 2: Upload file directly to R2 with progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed"));
        });

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", selectedFile.type || "application/octet-stream");
        xhr.send(selectedFile);
      });

      // Step 3: Add to files list
      const newFile: FileAttachment = {
        key,
        filename: selectedFile.name,
        size: selectedFile.size,
        contentType: selectedFile.type || "application/octet-stream",
        uploadedAt: new Date().toISOString(),
      };

      const updatedFiles = [...files, newFile];
      setFiles(updatedFiles);
      setUploadState("success");
      onFilesChange?.(updatedFiles);

      // Reset after 2 seconds
      setTimeout(() => {
        setUploadState("idle");
        setUploadProgress(0);
        setCurrentFilename(null);
      }, 2000);
    } catch (error) {
      console.error("Upload error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Upload failed");
      setUploadState("error");
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (key: string) => {
    const updatedFiles = files.filter((f) => f.key !== key);
    setFiles(updatedFiles);
    onFilesChange?.(updatedFiles);
  };

  const handleDownload = async (file: FileAttachment) => {
    try {
      const response = await fetch(`/api/r2/download-url?key=${encodeURIComponent(file.key)}`);
      if (!response.ok) throw new Error("Failed to get download URL");

      const { downloadUrl } = await response.json();
      window.open(downloadUrl, "_blank");
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download file");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Downloadable Files
        </CardTitle>
        <CardDescription>
          Upload PDFs, worksheets, or other files for students to download
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.zip,.epub,.ppt,.pptx,.xls,.xlsx"
            disabled={uploadState === "uploading"}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadState === "uploading"}
            variant="outline"
            className="w-full"
          >
            {uploadState === "uploading" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploadState === "uploading" ? "Uploading..." : "Add File"}
          </Button>
        </div>

        {/* Upload Progress */}
        {uploadState === "uploading" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate max-w-[200px]">
                {currentFilename}
              </span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Success Message */}
        {uploadState === "success" && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-md">
            <CheckCircle className="h-4 w-4" />
            <span>File uploaded successfully!</span>
          </div>
        )}

        {/* Error Message */}
        {uploadState === "error" && errorMessage && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Upload failed</p>
              <p className="text-xs mt-1">{errorMessage}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setUploadState("idle")}
              className="h-auto p-1"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium text-muted-foreground">
              Uploaded Files ({files.length})
            </p>
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.key}
                  className="flex items-center justify-between p-3 border rounded-md bg-muted/30"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownload(file)}
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveFile(file.key)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {files.length === 0 && uploadState === "idle" && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No files uploaded yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
