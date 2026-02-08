import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: unreadCount, error } = await supabase.rpc("get_dm_unread_count", {
      p_user_id: auth.user.id,
    });

    if (error) {
      console.error("Error fetching unread count:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ unreadCount: unreadCount || 0 });
  } catch (err) {
    console.error("Error in unread count API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
