import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function checkAdmin(supabase: ReturnType<typeof supabaseServer>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return user;
}

// GET - List all email campaigns
export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = supabaseAdmin
    .from("email_campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data: campaigns, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ campaigns });
}

// POST - Create a new email campaign
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    name,
    description,
    subject,
    preview_text,
    html_content,
    plain_text,
    segment_type = "all",
    segment_filter = {},
    scheduled_for
  } = body;

  // Validation
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!subject) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }
  if (!html_content) {
    return NextResponse.json({ error: "HTML content is required" }, { status: 400 });
  }

  const validSegmentTypes = ["all", "leads", "customers", "course_students", "custom"];
  if (!validSegmentTypes.includes(segment_type)) {
    return NextResponse.json({ error: "Invalid segment type" }, { status: 400 });
  }

  const { data: campaign, error } = await supabaseAdmin
    .from("email_campaigns")
    .insert({
      name,
      description,
      subject,
      preview_text,
      html_content,
      plain_text,
      segment_type,
      segment_filter,
      status: scheduled_for ? "scheduled" : "draft",
      scheduled_for,
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ campaign });
}
