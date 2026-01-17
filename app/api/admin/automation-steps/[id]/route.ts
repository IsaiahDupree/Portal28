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

// PATCH - Update automation step
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
    "step_order",
    "delay_value",
    "delay_unit",
    "subject",
    "preview_text",
    "html_content",
    "plain_text",
    "prompt_instruction",
    "status"
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

  // Validate delay_unit if provided
  if (updates.delay_unit && !["minutes", "hours", "days", "weeks"].includes(updates.delay_unit as string)) {
    return NextResponse.json(
      { error: "Invalid delay_unit. Must be: minutes, hours, days, or weeks" },
      { status: 400 }
    );
  }

  const { data: step, error } = await supabaseAdmin
    .from("automation_steps")
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
    action: "updated_automation_step",
    resource_type: "automation_step",
    resource_id: params.id,
    details: updates
  });

  return NextResponse.json({ step });
}

// DELETE - Delete automation step
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("automation_steps")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log admin action
  await supabaseAdmin.from("admin_actions").insert({
    user_id: user.id,
    action: "deleted_automation_step",
    resource_type: "automation_step",
    resource_id: params.id
  });

  return NextResponse.json({ ok: true });
}
