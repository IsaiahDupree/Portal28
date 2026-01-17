import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createDirectUpload } from "@/lib/mux";

/**
 * POST /api/admin/mux/upload
 * Create a direct upload URL for uploading videos to Mux
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || userData.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the request origin for CORS
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:2828";

    // Create Mux direct upload
    const { uploadUrl, uploadId } = await createDirectUpload(origin);

    return NextResponse.json({
      uploadUrl,
      uploadId,
    });
  } catch (error) {
    console.error("Error creating Mux upload:", error);
    return NextResponse.json(
      { error: "Failed to create upload" },
      { status: 500 }
    );
  }
}
