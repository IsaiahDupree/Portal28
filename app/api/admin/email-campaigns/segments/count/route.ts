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

// POST - Calculate segment count
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { segment_type, filter_rules = {} } = body;

  if (!segment_type) {
    return NextResponse.json(
      { error: "segment_type is required" },
      { status: 400 }
    );
  }

  const { data: count, error } = await supabaseAdmin
    .rpc("calculate_campaign_segment_count", {
      p_segment_type: segment_type,
      p_filter_rules: filter_rules
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: count || 0, segment_type, filter_rules });
}
