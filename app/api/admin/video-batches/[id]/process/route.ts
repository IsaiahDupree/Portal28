import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { startBatchProcessing } from "@/lib/video/batch/processor";

// POST /api/admin/video-batches/[id]/process
// Start processing a batch job
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchId = params.id;

  // Fetch batch job (RLS will handle permissions)
  const { data: batch, error: batchError } = await supabase
    .from("video_batch_jobs")
    .select("id, status")
    .eq("id", batchId)
    .single();

  if (batchError) {
    if (batchError.code === "PGRST116") {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    console.error("Error fetching batch job:", batchError);
    return NextResponse.json({ error: batchError.message }, { status: 500 });
  }

  // Check if batch is in a processable state
  if (batch.status !== "pending" && batch.status !== "failed") {
    return NextResponse.json(
      { error: `Batch cannot be processed in status: ${batch.status}` },
      { status: 400 }
    );
  }

  // Start batch processing in background
  try {
    await startBatchProcessing(batchId);

    // Log admin action
    await supabase.from("admin_actions").insert({
      user_id: authData.user.id,
      action: "started_batch_video_processing",
      details: {
        batch_id: batchId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Batch processing started",
      batch_id: batchId,
    });
  } catch (error) {
    console.error("Error starting batch processing:", error);
    return NextResponse.json(
      { error: "Failed to start batch processing" },
      { status: 500 }
    );
  }
}
