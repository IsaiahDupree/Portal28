import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

interface RouteParams {
  params: { slug: string };
}

// GET /api/workspaces/[slug] - Get workspace by slug with products
export async function GET(req: NextRequest, { params }: RouteParams) {
  const supabase = supabaseServer();

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select(`
      id,
      name,
      slug,
      description,
      logo_url,
      brand_color,
      is_default,
      products (
        id,
        product_type,
        reference_id,
        name,
        description,
        price_cents,
        currency,
        status,
        sort_order
      )
    `)
    .eq("slug", params.slug)
    .eq("status", "active")
    .single();

  if (error || !workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Filter to only published products
  if (workspace.products) {
    workspace.products = workspace.products.filter((p: any) => p.status === 'published');
  }

  return NextResponse.json({ workspace });
}
