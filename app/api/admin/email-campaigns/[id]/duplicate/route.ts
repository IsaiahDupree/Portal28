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

// POST - Duplicate campaign
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get original campaign
  const { data: original, error: fetchError } = await supabaseAdmin
    .from("email_campaigns")
    .select("*")
    .eq("id", params.id)
    .single();

  if (fetchError || !original) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Create duplicate
  const { data: duplicate, error: createError } = await supabaseAdmin
    .from("email_campaigns")
    .insert({
      name: `${original.name} (Copy)`,
      description: original.description,
      subject: original.subject,
      preview_text: original.preview_text,
      html_content: original.html_content,
      plain_text: original.plain_text,
      segment_type: original.segment_type,
      segment_filter: original.segment_filter,
      status: "draft",
      created_by: user.id
    })
    .select()
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  return NextResponse.json({ campaign: duplicate });
}
