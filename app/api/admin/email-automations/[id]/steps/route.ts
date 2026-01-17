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

// POST - Create automation step
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    step_order,
    delay_value = 0,
    delay_unit = "days",
    subject,
    preview_text,
    html_content,
    plain_text,
    prompt_instruction
  } = body;

  if (!subject) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }

  if (!html_content) {
    return NextResponse.json({ error: "HTML content is required" }, { status: 400 });
  }

  // Validate delay_unit
  const validUnits = ["minutes", "hours", "days", "weeks"];
  if (!validUnits.includes(delay_unit)) {
    return NextResponse.json(
      { error: "Invalid delay_unit. Must be: minutes, hours, days, or weeks" },
      { status: 400 }
    );
  }

  const { data: step, error } = await supabaseAdmin
    .from("automation_steps")
    .insert({
      automation_id: params.id,
      step_order: step_order ?? 0,
      delay_value,
      delay_unit,
      subject,
      preview_text,
      html_content,
      plain_text,
      prompt_instruction,
      status: "draft"
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log admin action
  await supabaseAdmin.from("admin_actions").insert({
    user_id: user.id,
    action: "created_automation_step",
    resource_type: "automation_step",
    resource_id: step.id,
    details: { automation_id: params.id, subject }
  });

  return NextResponse.json({ step });
}
