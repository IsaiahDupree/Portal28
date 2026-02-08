import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const VideoBriefSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  format: z.string().optional(),
  platform: z.string().optional(),
  duration: z.number().optional(),
  customParameters: z.record(z.any()).optional(),
});

const CreateBatchSchema = z.object({
  name: z.string().min(1),
  briefs: z.array(VideoBriefSchema).min(1).max(100), // Limit to 100 videos per batch
});

// GET /api/admin/video-batches
// Returns all batch jobs for the user (or all for admins)
export async function GET(request: Request) {
  const supabase = supabaseServer();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  // Build query
  let query = supabase
    .from("video_batch_jobs")
    .select("*")
    .order("created_at", { ascending: false });

  // Non-admins only see their own batches
  if (user?.role !== "admin" && user?.role !== "teacher") {
    query = query.eq("created_by", authData.user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching batch jobs:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ batches: data ?? [] });
}

// POST /api/admin/video-batches
// Create a new batch job
export async function POST(request: Request) {
  const supabase = supabaseServer();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = CreateBatchSchema.parse(body);

    // Create batch job
    const { data: batch, error: batchError } = await supabase
      .from("video_batch_jobs")
      .insert({
        name: validated.name,
        briefs: validated.briefs,
        total_count: validated.briefs.length,
        processed_count: 0,
        failed_count: 0,
        status: "pending",
        created_by: authData.user.id,
      })
      .select()
      .single();

    if (batchError) {
      console.error("Error creating batch job:", batchError);
      return NextResponse.json({ error: batchError.message }, { status: 500 });
    }

    // Create individual batch items
    const batchItems = validated.briefs.map((brief, index) => ({
      batch_id: batch.id,
      brief,
      status: "pending" as const,
      sort_order: index,
    }));

    const { error: itemsError } = await supabase
      .from("video_batch_items")
      .insert(batchItems);

    if (itemsError) {
      console.error("Error creating batch items:", itemsError);
      // Rollback batch creation
      await supabase.from("video_batch_jobs").delete().eq("id", batch.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Log admin action
    await supabase.from("admin_actions").insert({
      user_id: authData.user.id,
      action: "created_batch_video_job",
      details: {
        batch_id: batch.id,
        batch_name: validated.name,
        total_briefs: validated.briefs.length,
      },
    });

    return NextResponse.json({ batch }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
