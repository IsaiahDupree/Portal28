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

// POST - Activate automation
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check if automation has steps
  const { data: steps } = await supabaseAdmin
    .from("automation_steps")
    .select("id")
    .eq("automation_id", params.id);

  if (!steps || steps.length === 0) {
    return NextResponse.json(
      { error: "Cannot activate automation with no steps" },
      { status: 400 }
    );
  }

  // Update status to active
  const { data: automation, error } = await supabaseAdmin
    .from("email_automations")
    .update({ status: "active" })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Activate all steps
  await supabaseAdmin
    .from("automation_steps")
    .update({ status: "active" })
    .eq("automation_id", params.id);

  // Log admin action
  await supabaseAdmin.from("admin_actions").insert({
    user_id: user.id,
    action: "activated_automation",
    resource_type: "email_automation",
    resource_id: params.id
  });

  return NextResponse.json({ automation });
}
