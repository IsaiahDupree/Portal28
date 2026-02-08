import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET /api/admin/workspaces - List all workspaces
export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: workspaces, error } = await supabaseAdmin
    .from("workspaces")
    .select(`
      *,
      workspace_members(count),
      products(count)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workspaces });
}

// POST /api/admin/workspaces - Create new workspace
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, slug, description, logo_url, brand_color, is_default } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({
      error: "Slug must contain only lowercase letters, numbers, and hyphens"
    }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "A workspace with this slug already exists" }, { status: 400 });
  }

  // If setting as default, unset other defaults
  if (is_default) {
    await supabaseAdmin
      .from("workspaces")
      .update({ is_default: false })
      .eq("is_default", true);
  }

  const { data: workspace, error } = await supabaseAdmin
    .from("workspaces")
    .insert({
      name,
      slug,
      description: description || null,
      logo_url: logo_url || null,
      brand_color: brand_color || null,
      is_default: is_default || false,
      status: "active",
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Add creator as workspace admin
  await supabaseAdmin
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "admin"
    });

  // Log admin action
  await supabaseAdmin.from("admin_actions").insert({
    admin_id: user.id,
    action: "created_workspace",
    target_type: "workspace",
    target_id: workspace.id,
    metadata: { name, slug }
  });

  return NextResponse.json({ workspace });
}
