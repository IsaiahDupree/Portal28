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

// GET /api/admin/workspaces/[id] - Get single workspace with details
export async function GET(req: NextRequest, { params }: RouteParams) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: workspace, error } = await supabaseAdmin
    .from("workspaces")
    .select(`
      *,
      workspace_members(*),
      products(*)
    `)
    .eq("id", params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  return NextResponse.json({ workspace });
}

// PATCH /api/admin/workspaces/[id] - Update workspace
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, slug, description, logo_url, brand_color, status, is_default } = body;

  // Validate slug format if provided
  if (slug && !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({
      error: "Slug must contain only lowercase letters, numbers, and hyphens"
    }, { status: 400 });
  }

  // Check slug uniqueness if changed
  if (slug) {
    const { data: existing } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("slug", slug)
      .neq("id", params.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "A workspace with this slug already exists" }, { status: 400 });
    }
  }

  // If setting as default, unset other defaults
  if (is_default) {
    await supabaseAdmin
      .from("workspaces")
      .update({ is_default: false })
      .eq("is_default", true)
      .neq("id", params.id);
  }

  const { data: workspace, error } = await supabaseAdmin
    .from("workspaces")
    .update({
      ...(name && { name }),
      ...(slug && { slug }),
      ...(description !== undefined && { description }),
      ...(logo_url !== undefined && { logo_url }),
      ...(brand_color !== undefined && { brand_color }),
      ...(status && { status }),
      ...(is_default !== undefined && { is_default })
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log admin action
  await supabaseAdmin.from("admin_actions").insert({
    admin_id: user.id,
    action: "updated_workspace",
    target_type: "workspace",
    target_id: params.id,
    metadata: body
  });

  return NextResponse.json({ workspace });
}

// DELETE /api/admin/workspaces/[id] - Delete workspace
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check if this is the default workspace
  const { data: workspace } = await supabaseAdmin
    .from("workspaces")
    .select("is_default")
    .eq("id", params.id)
    .single();

  if (workspace?.is_default) {
    return NextResponse.json({
      error: "Cannot delete the default workspace"
    }, { status: 400 });
  }

  // Delete workspace (cascade will handle members and products)
  const { error } = await supabaseAdmin
    .from("workspaces")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log admin action
  await supabaseAdmin.from("admin_actions").insert({
    admin_id: user.id,
    action: "deleted_workspace",
    target_type: "workspace",
    target_id: params.id
  });

  return NextResponse.json({ ok: true });
}
