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

// GET - Get single automation
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: automation, error } = await supabaseAdmin
    .from("email_automations")
    .select(`
      *,
      automation_steps(*)
    `)
    .eq("id", params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ automation });
}

// PATCH - Update automation
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const allowedFields = [
    "name",
    "description",
    "status",
    "trigger_filter_json",
    "prompt_base"
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data: automation, error } = await supabaseAdmin
    .from("email_automations")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log admin action
  await supabaseAdmin.from("admin_actions").insert({
    user_id: user.id,
    action: "updated_automation",
    resource_type: "email_automation",
    resource_id: automation.id,
    details: updates
  });

  return NextResponse.json({ automation });
}

// DELETE - Delete automation
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete automation (cascade will delete steps and enrollments)
  const { error } = await supabaseAdmin
    .from("email_automations")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log admin action
  await supabaseAdmin.from("admin_actions").insert({
    user_id: user.id,
    action: "deleted_automation",
    resource_type: "email_automation",
    resource_id: params.id
  });

  return NextResponse.json({ ok: true });
}
