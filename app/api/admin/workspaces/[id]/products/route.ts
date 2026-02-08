import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface RouteParams {
  params: { id: string }; // workspace_id
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

// GET /api/admin/workspaces/[id]/products - List products in workspace
export async function GET(req: NextRequest, { params }: RouteParams) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("workspace_id", params.id)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products });
}

// POST /api/admin/workspaces/[id]/products - Add product to workspace
export async function POST(req: NextRequest, { params }: RouteParams) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    product_type,
    reference_id,
    name,
    description,
    price_cents,
    currency,
    status,
    sort_order
  } = body;

  if (!product_type || !name) {
    return NextResponse.json({
      error: "Product type and name are required"
    }, { status: 400 });
  }

  // Validate product_type
  const validTypes = ['course', 'membership', 'template', 'digital_product', 'event', 'coaching'];
  if (!validTypes.includes(product_type)) {
    return NextResponse.json({
      error: `Invalid product type. Must be one of: ${validTypes.join(', ')}`
    }, { status: 400 });
  }

  const { data: product, error } = await supabaseAdmin
    .from("products")
    .insert({
      workspace_id: params.id,
      product_type,
      reference_id: reference_id || null,
      name,
      description: description || null,
      price_cents: price_cents || null,
      currency: currency || 'usd',
      status: status || 'draft',
      sort_order: sort_order || 0
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log admin action
  await supabaseAdmin.from("admin_actions").insert({
    admin_id: user.id,
    action: "created_product",
    target_type: "product",
    target_id: product.id,
    metadata: { workspace_id: params.id, name, product_type }
  });

  return NextResponse.json({ product });
}
