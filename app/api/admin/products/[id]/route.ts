import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface RouteParams {
  params: { id: string }; // product_id
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

// PATCH /api/admin/products/[id] - Update product
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    name,
    description,
    price_cents,
    currency,
    status,
    sort_order,
    product_type
  } = body;

  // Validate product_type if provided
  if (product_type) {
    const validTypes = ['course', 'membership', 'template', 'digital_product', 'event', 'coaching'];
    if (!validTypes.includes(product_type)) {
      return NextResponse.json({
        error: `Invalid product type. Must be one of: ${validTypes.join(', ')}`
      }, { status: 400 });
    }
  }

  const { data: product, error } = await supabaseAdmin
    .from("products")
    .update({
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(price_cents !== undefined && { price_cents }),
      ...(currency && { currency }),
      ...(status && { status }),
      ...(sort_order !== undefined && { sort_order }),
      ...(product_type && { product_type })
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
    action: "updated_product",
    target_type: "product",
    target_id: params.id,
    metadata: body
  });

  return NextResponse.json({ product });
}

// DELETE /api/admin/products/[id] - Delete product
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("products")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log admin action
  await supabaseAdmin.from("admin_actions").insert({
    admin_id: user.id,
    action: "deleted_product",
    target_type: "product",
    target_id: params.id
  });

  return NextResponse.json({ ok: true });
}
