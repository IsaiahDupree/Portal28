import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// POST /api/youtube/auth/disconnect
// Disconnect YouTube account and remove tokens
export async function POST(request: Request) {
  const supabase = supabaseServer();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Delete YouTube tokens
    const { error: deleteError } = await supabase
      .from("youtube_tokens")
      .delete()
      .eq("user_id", authData.user.id);

    if (deleteError) {
      console.error("Error deleting YouTube tokens:", deleteError);
      return NextResponse.json(
        { error: "Failed to disconnect YouTube account" },
        { status: 500 }
      );
    }

    // Log admin action
    await supabase.from("admin_actions").insert({
      user_id: authData.user.id,
      action: "disconnected_youtube_account",
      details: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting YouTube account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
