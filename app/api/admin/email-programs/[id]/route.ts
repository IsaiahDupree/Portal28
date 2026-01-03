import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getNextRunTime, scheduleTextToCron } from "@/lib/email/schedule-parser";

interface RouteParams {
  params: { id: string };
}

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

// GET - Get single program with versions
export async function GET(req: NextRequest, { params }: RouteParams) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: program, error } = await supabaseAdmin
    .from("email_programs")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  // Get versions
  const { data: versions } = await supabaseAdmin
    .from("email_versions")
    .select("*")
    .eq("program_id", params.id)
    .order("version_number", { ascending: false });

  // Get recent runs
  const { data: runs } = await supabaseAdmin
    .from("email_runs")
    .select("*")
    .eq("program_id", params.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({ program, versions: versions || [], runs: runs || [] });
}

// PATCH - Update program
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  // Handle schedule updates
  if (body.schedule_text !== undefined) {
    updates.schedule_text = body.schedule_text;
    updates.schedule_cron = body.schedule_text ? scheduleTextToCron(body.schedule_text) : null;
    
    if (body.schedule_text) {
      const timezone = body.timezone || "America/New_York";
      updates.next_run_at = getNextRunTime(body.schedule_text, timezone).toISOString();
    }
  }

  // Copy allowed fields
  const allowedFields = [
    "name", "description", "type", "status", "timezone",
    "audience_type", "audience_filter_json", "prompt_base", "prompt_current"
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  const { data: program, error } = await supabaseAdmin
    .from("email_programs")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ program });
}

// DELETE - Delete program
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete versions and runs first (cascade should handle this, but be explicit)
  await supabaseAdmin.from("email_runs").delete().eq("program_id", params.id);
  await supabaseAdmin.from("email_versions").delete().eq("program_id", params.id);

  const { error } = await supabaseAdmin
    .from("email_programs")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
