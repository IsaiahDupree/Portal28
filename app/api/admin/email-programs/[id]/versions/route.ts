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

// POST - Create a new version (from prompt studio)
export async function POST(req: NextRequest, { params }: RouteParams) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { subject, preview_text, html_content, plain_text, change_reason } = body;

  if (!subject || !html_content) {
    return NextResponse.json(
      { error: "Subject and HTML content are required" },
      { status: 400 }
    );
  }

  // Get current program
  const { data: program } = await supabaseAdmin
    .from("email_programs")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!program) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  // Get highest version number
  const { data: latestVersion } = await supabaseAdmin
    .from("email_versions")
    .select("version_number")
    .eq("program_id", params.id)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersionNumber = (latestVersion?.version_number || 0) + 1;

  // Create new version
  const { data: version, error } = await supabaseAdmin
    .from("email_versions")
    .insert({
      program_id: params.id,
      version_number: nextVersionNumber,
      created_by: user.id,
      change_reason,
      subject,
      preview_text,
      html_content,
      plain_text,
      status: "draft",
      config_snapshot: {
        schedule_text: program.schedule_text,
        audience_type: program.audience_type,
        audience_filter_json: program.audience_filter_json
      }
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ version });
}
