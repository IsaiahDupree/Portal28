import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// GET /api/email/preferences - Get user's email preferences
export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const spaceId = searchParams.get("space_id");

  let query = supabase
    .from("email_preferences")
    .select("*")
    .eq("user_id", user.id);

  if (spaceId) {
    query = query.eq("space_id", spaceId);
  }

  const { data: preferences, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ preferences });
}

// POST /api/email/preferences - Create or update email preferences
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    space_id,
    announcements_enabled,
    replies_enabled,
    digest_enabled,
    digest_frequency,
  } = body;

  // Check if preferences already exist
  const { data: existing } = await supabase
    .from("email_preferences")
    .select("id")
    .eq("user_id", user.id)
    .eq("space_id", space_id || null)
    .maybeSingle();

  if (existing) {
    // Update existing preferences
    const { data, error } = await supabase
      .from("email_preferences")
      .update({
        announcements_enabled,
        replies_enabled,
        digest_enabled,
        digest_frequency,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ preferences: data });
  } else {
    // Create new preferences
    const { data, error } = await supabase
      .from("email_preferences")
      .insert({
        user_id: user.id,
        space_id: space_id || null,
        announcements_enabled,
        replies_enabled,
        digest_enabled,
        digest_frequency,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ preferences: data });
  }
}
