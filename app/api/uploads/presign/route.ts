import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// POST /api/uploads/presign - Get presigned URL for direct upload
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { filename, contentType, lessonId, fileKind = "attachment" } = body;

  if (!filename || !contentType) {
    return NextResponse.json(
      { error: "filename and contentType are required" },
      { status: 400 }
    );
  }

  // Generate unique storage path
  const ext = filename.split(".").pop() || "";
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const storagePath = `uploads/${user.id}/${timestamp}-${randomId}.${ext}`;

  // For Supabase Storage, create signed upload URL
  const bucket = contentType.startsWith("video/") ? "videos" : "files";
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(storagePath);

  if (error) {
    // If bucket doesn't exist or other error, return a mock response for dev
    console.error("Storage presign error:", error);
    
    // Return a direct upload path for development
    return NextResponse.json({
      uploadUrl: `/api/uploads/direct`,
      storageKey: storagePath,
      bucket,
      method: "POST",
      fields: {
        lessonId,
        fileKind,
        filename,
        contentType,
      },
    });
  }

  return NextResponse.json({
    uploadUrl: data.signedUrl,
    storageKey: storagePath,
    token: data.token,
    bucket,
  });
}
