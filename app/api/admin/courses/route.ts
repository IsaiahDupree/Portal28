import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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
  const { title, slug, description, price_cents, stripe_price_id, hero_image_url } = body;

  if (!title || !slug) {
    return NextResponse.json({ error: "Title and slug are required" }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("courses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "A course with this slug already exists" }, { status: 400 });
  }

  const { data: course, error } = await supabaseAdmin
    .from("courses")
    .insert({
      title,
      slug,
      description: description || null,
      price_cents: price_cents || null,
      stripe_price_id: stripe_price_id || null,
      hero_image_url: hero_image_url || null,
      status: "draft"
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log admin action
  await supabaseAdmin.from("admin_actions").insert({
    admin_id: user.id,
    action: "created_course",
    target_type: "course",
    target_id: course.id,
    metadata: { title, slug }
  });

  return NextResponse.json({ course });
}
