import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/youtube/client";

// GET /api/youtube/auth/callback
// Handle YouTube OAuth callback
export async function GET(request: Request) {
  const supabase = supabaseServer();
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    console.error("YouTube OAuth error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/app/settings?youtube_error=${error}`
    );
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing code or state parameter" },
      { status: 400 }
    );
  }

  try {
    // Verify state parameter (CSRF protection)
    const stateData = JSON.parse(Buffer.from(state, "base64").toString());
    const userId = stateData.userId;

    if (!userId) {
      return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 });
    }

    // Verify user is authenticated
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user || authData.user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Convert expiry_date (milliseconds) to timestamp
    const expiresAt = new Date(tokens.expiry_date);

    // Store tokens in database
    const { error: upsertError } = await supabase.from("youtube_tokens").upsert(
      {
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type,
        expires_at: expiresAt.toISOString(),
        scope: tokens.scope,
      },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      console.error("Error storing YouTube tokens:", upsertError);
      return NextResponse.json(
        { error: "Failed to store tokens" },
        { status: 500 }
      );
    }

    // Log admin action
    await supabase.from("admin_actions").insert({
      user_id: userId,
      action: "connected_youtube_account",
      details: {
        scope: tokens.scope,
      },
    });

    // Redirect to success page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/app/settings?youtube_connected=true`
    );
  } catch (error) {
    console.error("Error handling YouTube callback:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/app/settings?youtube_error=callback_failed`
    );
  }
}
