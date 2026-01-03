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

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, slug, description, status, price_cents, stripe_price_id, hero_image_url } = body;

  // Check slug uniqueness if changed
  if (slug) {
    const { data: existing } = await supabaseAdmin
      .from("courses")
      .select("id")
      .eq("slug", slug)
      .neq("id", params.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "A course with this slug already exists" }, { status: 400 });
    }
  }

  const { data: course, error } = await supabaseAdmin
    .from("courses")
    .update({
      ...(title && { title }),
      ...(slug && { slug }),
      ...(description !== undefined && { description }),
      ...(status && { status }),
      ...(price_cents !== undefined && { price_cents }),
      ...(stripe_price_id !== undefined && { stripe_price_id }),
      ...(hero_image_url !== undefined && { hero_image_url })
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
    action: "updated_course",
    target_type: "course",
    target_id: params.id,
    metadata: body
  });

  return NextResponse.json({ course });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete lessons first (cascade)
  const { data: modules } = await supabaseAdmin
    .from("modules")
    .select("id")
    .eq("course_id", params.id);

  if (modules) {
    for (const mod of modules) {
      await supabaseAdmin.from("lessons").delete().eq("module_id", mod.id);
    }
  }

  // Delete modules
  await supabaseAdmin.from("modules").delete().eq("course_id", params.id);

  // Delete course
  const { error } = await supabaseAdmin
    .from("courses")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log admin action
  await supabaseAdmin.from("admin_actions").insert({
    admin_id: user.id,
    action: "deleted_course",
    target_type: "course",
    target_id: params.id
  });

  return NextResponse.json({ ok: true });
}
