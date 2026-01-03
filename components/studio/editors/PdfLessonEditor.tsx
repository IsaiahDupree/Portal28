"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Loader2, Trash2, ExternalLink } from "lucide-react";

interface PdfLessonEditorProps {
  lessonId: string;
  doc: any;
  onDocChange: (doc: any) => void;
}

export default function PdfLessonEditor({
  lessonId,
  doc,
  onDocChange,
}: PdfLessonEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUploadPdf(file: File) {
    setUploading(true);
    setError(null);

    try {
      // Get signed upload URL
      const urlRes = await fetch("/api/files/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          filename: file.name,
          fileKind: "pdf",
          mime: file.type,
        }),
      });

      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { signedUrl, path } = await urlRes.json();

      // Upload file
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      // Register file in DB
      const registerRes = await fetch("/api/files/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          path,
          filename: file.name,
          fileKind: "pdf",
          mime: file.type,
          sizeBytes: file.size,
        }),
      });

      if (!registerRes.ok) throw new Error("Failed to register file");
      const { file: registeredFile } = await registerRes.json();

      // Store PDF info in content_doc
      onDocChange({
        ...doc,
        pdf: {
          fileId: registeredFile.id,
          filename: file.name,
          url: registeredFile.url,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const pdfInfo = doc?.pdf;

  return (
    <div className="space-y-6">
      {/* PDF Upload/Display */}
      <Card>
        <CardContent className="pt-6">
          {pdfInfo?.url ? (
            <div className="space-y-4">
              {/* PDF Preview */}
              <div className="aspect-[8.5/11] bg-muted rounded-lg overflow-hidden border">
                <iframe
                  src={`${pdfInfo.url}#view=FitH`}
                  className="w-full h-full"
                  title={pdfInfo.filename}
                />
              </div>

              {/* PDF Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <div className="font-medium">{pdfInfo.filename}</div>
                    <div className="text-sm text-muted-foreground">PDF Document</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={pdfInfo.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDocChange({ ...doc, pdf: null })}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-red-600" />
              </div>
              <div className="font-semibold text-lg mb-1">Upload a PDF</div>
              <p className="text-sm text-muted-foreground mb-6">
                Upload a PDF document for this lesson
              </p>

              {error && (
                <div className="text-sm text-destructive mb-4">{error}</div>
              )}

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
                      Upload PDF
                    </>
                  )}
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUploadPdf(f);
                    }}
                  />
                </label>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content/Notes */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm font-medium mb-2">Lesson Notes</div>
          <Textarea
            className="min-h-[150px]"
            placeholder="Add notes or instructions to accompany the PDF..."
            value={doc?.notes ?? ""}
            onChange={(e) => onDocChange({ ...doc, notes: e.target.value })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
