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

// GET - Get campaign opens
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: opens, error } = await supabaseAdmin
    .from("email_campaign_sends")
    .select("email, user_id, first_opened_at, open_count")
    .eq("campaign_id", params.id)
    .not("opened_at", "is", null)
    .order("first_opened_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ opens });
}
