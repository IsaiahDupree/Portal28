import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// GET /api/workspaces - List active workspaces (public)
export async function GET(req: NextRequest) {
  const supabase = supabaseServer();

  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select(`
      id,
      name,
      slug,
      description,
      logo_url,
      brand_color,
      is_default
    `)
    .eq("status", "active")
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workspaces });
}
