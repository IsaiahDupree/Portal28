import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");
  const unreadOnly = req.nextUrl.searchParams.get("unreadOnly") === "true";

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data: notifications, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get unread count
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return NextResponse.json({
    notifications: notifications || [],
    unreadCount: unreadCount || 0
  });
}

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, title, message, link, metadata } = await req.json();

  if (!type || !title || !message) {
    return NextResponse.json(
      { error: "type, title, and message are required" },
      { status: 400 }
    );
  }

  const { data: notification, error } = await supabase
    .from("notifications")
    .insert({
      user_id: user.id,
      type,
      title,
      message,
      link: link || null,
      metadata: metadata || {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notification });
}

export async function PATCH(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notificationId, isRead } = await req.json();

  if (!notificationId || typeof isRead !== "boolean") {
    return NextResponse.json(
      { error: "notificationId and isRead are required" },
      { status: 400 }
    );
  }

  const updateData: any = { is_read: isRead };
  if (isRead) {
    updateData.read_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("notifications")
    .update(updateData)
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
