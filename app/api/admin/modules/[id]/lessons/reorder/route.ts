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
  lessons: z.array(z.object({
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
    const { lessons } = reorderSchema.parse(body);

    // Update each lesson's sort_order
    for (const lesson of lessons) {
      await supabaseAdmin
        .from("lessons")
        .update({ sort_order: lesson.sort_order })
        .eq("id", lesson.id)
        .eq("module_id", params.id); // Verify lesson belongs to this module
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
      { error: "Failed to reorder lessons" },
      { status: 500 }
    );
  }
}
