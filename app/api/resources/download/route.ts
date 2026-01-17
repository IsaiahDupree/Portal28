import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Path is required" }, { status: 400 });
  }

  // Verify the user has access to the resource item
  // Extract the folder_id from the storage path (format: resources/{folder_id}/{filename})
  const pathParts = path.split("/");
  if (pathParts.length < 3 || pathParts[0] !== "resources") {
    return NextResponse.json({ error: "Invalid path format" }, { status: 400 });
  }

  const folderId = pathParts[1];

  // Verify the resource item exists and user has access via RLS
  const { data: item } = await supabase
    .from("resource_items")
    .select("id, folder_id")
    .eq("folder_id", folderId)
    .eq("storage_path", path)
    .single();

  if (!item) {
    return NextResponse.json({ error: "Resource not found or access denied" }, { status: 404 });
  }

  // Get the file from Supabase storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from("resources")
    .download(path);

  if (downloadError || !fileData) {
    console.error("Storage download error:", downloadError);
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }

  // Get the filename from the path
  const filename = pathParts[pathParts.length - 1];

  // Return the file as a blob
  return new NextResponse(fileData, {
    headers: {
      "Content-Type": fileData.type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
