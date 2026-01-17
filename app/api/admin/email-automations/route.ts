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

// GET - List all email automations
export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: automations, error } = await supabaseAdmin
    .from("email_automations")
    .select(`
      *,
      automation_steps(id)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ automations });
}

// POST - Create a new email automation
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
    trigger_event,
    trigger_filter_json = {},
    prompt_base
  } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (!trigger_event) {
    return NextResponse.json({ error: "Trigger event is required" }, { status: 400 });
  }

  const { data: automation, error } = await supabaseAdmin
    .from("email_automations")
    .insert({
      name,
      description,
      trigger_event,
      trigger_filter_json,
      prompt_base,
      status: "draft",
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log admin action
  await supabaseAdmin.from("admin_actions").insert({
    user_id: user.id,
    action: "created_automation",
    resource_type: "email_automation",
    resource_id: automation.id,
    details: { name }
  });

  return NextResponse.json({ automation });
}
