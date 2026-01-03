import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resend, RESEND_FROM } from "@/lib/email/resend";

interface RouteParams {
  params: { id: string };
}

async function checkAdmin(supabase: ReturnType<typeof supabaseServer>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role, email")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return { ...user, email: profile.email || user.email };
}

// POST - Send a test email
export async function POST(req: NextRequest, { params }: RouteParams) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { version_id, to_email } = body;

  // Use provided email or admin's email
  const recipientEmail = to_email || user.email;

  if (!recipientEmail) {
    return NextResponse.json({ error: "No email address provided" }, { status: 400 });
  }

  // Get version content
  let version;

  if (version_id) {
    const { data } = await supabaseAdmin
      .from("email_versions")
      .select("*")
      .eq("id", version_id)
      .eq("program_id", params.id)
      .single();
    version = data;
  } else {
    // Get latest version for this program
    const { data } = await supabaseAdmin
      .from("email_versions")
      .select("*")
      .eq("program_id", params.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    version = data;
  }

  if (!version) {
    return NextResponse.json({ error: "No version found" }, { status: 404 });
  }

  // Send test email
  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: recipientEmail,
      subject: `[TEST] ${version.subject}`,
      html: version.html_content
    });

    if (error) {
      return NextResponse.json({ error: JSON.stringify(error) }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      resend_id: data?.id,
      sent_to: recipientEmail,
      subject: `[TEST] ${version.subject}`
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
