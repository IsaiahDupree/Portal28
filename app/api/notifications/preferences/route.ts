import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: preferences, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 = no rows returned
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If no preferences exist, create default ones
  if (!preferences) {
    const { data: newPreferences, error: insertError } = await supabase
      .from("notification_preferences")
      .insert({
        user_id: user.id,
        email_on_comment: true,
        email_on_reply: true,
        email_on_announcement: true,
        email_on_course_update: true,
        in_app_notifications: true,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ preferences: newPreferences });
  }

  return NextResponse.json({ preferences });
}

export async function PUT(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    email_on_comment,
    email_on_reply,
    email_on_announcement,
    email_on_course_update,
    in_app_notifications,
  } = body;

  // Build update object with only provided fields
  const updateData: any = {};
  if (typeof email_on_comment === "boolean") updateData.email_on_comment = email_on_comment;
  if (typeof email_on_reply === "boolean") updateData.email_on_reply = email_on_reply;
  if (typeof email_on_announcement === "boolean") updateData.email_on_announcement = email_on_announcement;
  if (typeof email_on_course_update === "boolean") updateData.email_on_course_update = email_on_course_update;
  if (typeof in_app_notifications === "boolean") updateData.in_app_notifications = in_app_notifications;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No valid preferences provided" },
      { status: 400 }
    );
  }

  const { data: preferences, error } = await supabase
    .from("notification_preferences")
    .update(updateData)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ preferences });
}
