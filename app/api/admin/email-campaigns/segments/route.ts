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

// GET - List available segments
export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: segments, error } = await supabaseAdmin
    .from("email_campaign_segments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ segments });
}

// POST - Create new segment
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, segment_type, filter_rules = {} } = body;

  if (!name || !segment_type) {
    return NextResponse.json(
      { error: "Name and segment_type are required" },
      { status: 400 }
    );
  }

  // Calculate initial count
  const { data: count } = await supabaseAdmin
    .rpc("calculate_campaign_segment_count", {
      p_segment_type: segment_type,
      p_filter_rules: filter_rules
    });

  const { data: segment, error } = await supabaseAdmin
    .from("email_campaign_segments")
    .insert({
      name,
      description,
      segment_type,
      filter_rules,
      cached_count: count || 0,
      count_last_updated_at: new Date().toISOString(),
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ segment });
}
