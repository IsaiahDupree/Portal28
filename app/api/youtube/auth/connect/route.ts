import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { generateAuthUrl } from "@/lib/youtube/client";

// GET /api/youtube/auth/connect
// Generate YouTube OAuth authorization URL
export async function GET(request: Request) {
  const supabase = supabaseServer();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Generate state parameter for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        userId: authData.user.id,
        timestamp: Date.now(),
      })
    ).toString("base64");

    // Generate OAuth URL
    const authUrl = generateAuthUrl(state);

    return NextResponse.json({ authUrl, state });
  } catch (error) {
    console.error("Error generating YouTube auth URL:", error);
    return NextResponse.json(
      { error: "Failed to generate authorization URL" },
      { status: 500 }
    );
  }
}
