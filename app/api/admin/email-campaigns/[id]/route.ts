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

// GET - Get campaign details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: campaign, error } = await supabaseAdmin
    .from("email_campaigns")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json({ campaign });
}

// PATCH - Update campaign
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
  const {
    name,
    description,
    subject,
    preview_text,
    html_content,
    plain_text,
    segment_type,
    segment_filter,
    status,
    scheduled_for
  } = body;

  // Check if campaign exists and can be edited
  const { data: existing } = await supabaseAdmin
    .from("email_campaigns")
    .select("status")
    .eq("id", params.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Don't allow editing sent or sending campaigns
  if (existing.status === "sent" || existing.status === "sending") {
    return NextResponse.json(
      { error: "Cannot edit campaign that is sent or sending" },
      { status: 400 }
    );
  }

  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (subject !== undefined) updates.subject = subject;
  if (preview_text !== undefined) updates.preview_text = preview_text;
  if (html_content !== undefined) updates.html_content = html_content;
  if (plain_text !== undefined) updates.plain_text = plain_text;
  if (segment_type !== undefined) updates.segment_type = segment_type;
  if (segment_filter !== undefined) updates.segment_filter = segment_filter;
  if (status !== undefined) updates.status = status;
  if (scheduled_for !== undefined) updates.scheduled_for = scheduled_for;

  const { data: campaign, error } = await supabaseAdmin
    .from("email_campaigns")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ campaign });
}

// DELETE - Delete campaign
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check if campaign can be deleted (only draft or failed campaigns)
  const { data: campaign } = await supabaseAdmin
    .from("email_campaigns")
    .select("status")
    .eq("id", params.id)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (!["draft", "failed", "cancelled"].includes(campaign.status)) {
    return NextResponse.json(
      { error: "Can only delete draft, failed, or cancelled campaigns" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("email_campaigns")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
