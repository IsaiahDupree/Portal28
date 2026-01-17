import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

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

const reorderSchema = z.object({
  modules: z.array(z.object({
    id: z.string().uuid(),
    sort_order: z.number().int().min(0)
  }))
});

export async function POST(req: NextRequest, { params }: RouteParams) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { modules } = reorderSchema.parse(body);

    // Update each module's sort_order
    for (const module of modules) {
      await supabaseAdmin
        .from("modules")
        .update({ sort_order: module.sort_order })
        .eq("id", module.id)
        .eq("course_id", params.id); // Verify module belongs to this course
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to reorder modules" },
      { status: 500 }
    );
  }
}
