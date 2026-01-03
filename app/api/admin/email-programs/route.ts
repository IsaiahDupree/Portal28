import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getNextRunTime, scheduleTextToCron } from "@/lib/email/schedule-parser";

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

// GET - List all email programs
export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: programs, error } = await supabaseAdmin
    .from("email_programs")
    .select(`
      *,
      current_version:email_versions!email_programs_current_version_id_fkey(
        id, subject, status, created_at
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ programs });
}

// POST - Create a new email program
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
    type = "broadcast",
    schedule_text,
    timezone = "America/New_York",
    audience_type = "all",
    audience_filter_json = {},
    prompt_base,
    prompt_current
  } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Parse schedule
  const schedule_cron = schedule_text ? scheduleTextToCron(schedule_text) : null;
  const next_run_at = schedule_text ? getNextRunTime(schedule_text, timezone) : null;

  const { data: program, error } = await supabaseAdmin
    .from("email_programs")
    .insert({
      name,
      description,
      type,
      status: "draft",
      schedule_text,
      schedule_cron,
      timezone,
      audience_type,
      audience_filter_json,
      prompt_base,
      prompt_current,
      next_run_at: next_run_at?.toISOString(),
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ program });
}
