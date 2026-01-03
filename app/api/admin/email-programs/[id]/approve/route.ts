import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

// POST - Approve a version and set as current
export async function POST(req: NextRequest, { params }: RouteParams) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { version_id, activate = false } = body;

  if (!version_id) {
    return NextResponse.json({ error: "version_id is required" }, { status: 400 });
  }

  // Verify version belongs to program
  const { data: version } = await supabaseAdmin
    .from("email_versions")
    .select("*")
    .eq("id", version_id)
    .eq("program_id", params.id)
    .single();

  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  // Update version to approved
  await supabaseAdmin
    .from("email_versions")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id
    })
    .eq("id", version_id);

  // Update program to use this version
  const programUpdate: Record<string, unknown> = {
    current_version_id: version_id
  };

  // Optionally activate the program
  if (activate) {
    programUpdate.status = "active";
  }

  const { data: program, error } = await supabaseAdmin
    .from("email_programs")
    .update(programUpdate)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    program,
    message: activate
      ? "Version approved and program activated"
      : "Version approved - activate when ready"
  });
}
