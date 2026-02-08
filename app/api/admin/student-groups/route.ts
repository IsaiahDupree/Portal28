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

// GET - List all student groups
export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const course_id = searchParams.get("course_id");
  const is_active = searchParams.get("is_active");

  let query = supabaseAdmin
    .from("student_groups")
    .select(`
      *,
      course:courses(id, name, slug)
    `)
    .order("created_at", { ascending: false });

  if (course_id) {
    query = query.eq("course_id", course_id);
  }

  if (is_active !== null) {
    query = query.eq("is_active", is_active === "true");
  }

  const { data: groups, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ groups });
}

// POST - Create a new student group
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    name,
    description,
    course_id,
    auto_enroll = false,
    start_date,
    end_date
  } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Generate slug
  const { data: slugData, error: slugError } = await supabaseAdmin
    .rpc("generate_group_slug", { p_name: name });

  if (slugError) {
    return NextResponse.json({ error: slugError.message }, { status: 500 });
  }

  const { data: group, error } = await supabaseAdmin
    .from("student_groups")
    .insert({
      name,
      description,
      slug: slugData,
      course_id,
      auto_enroll,
      start_date,
      end_date,
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ group });
}
