import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// GET /api/admin/video-batches/[id]/progress
// Get real-time progress of a batch job
export async function GET(
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
    .select("id, name, status, total_count, processed_count, failed_count, created_at, started_at, completed_at")
    .eq("id", batchId)
    .single();

  if (batchError) {
    if (batchError.code === "PGRST116") {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    console.error("Error fetching batch job:", batchError);
    return NextResponse.json({ error: batchError.message }, { status: 500 });
  }

  // Get summary of item statuses
  const { data: itemStatuses, error: statusError } = await supabase
    .from("video_batch_items")
    .select("status")
    .eq("batch_id", batchId);

  if (statusError) {
    console.error("Error fetching item statuses:", statusError);
    return NextResponse.json({ error: statusError.message }, { status: 500 });
  }

  // Calculate progress metrics
  const statusCounts = {
    pending: 0,
    processing: 0,
    complete: 0,
    failed: 0,
  };

  itemStatuses?.forEach((item) => {
    const status = item.status as keyof typeof statusCounts;
    if (status in statusCounts) {
      statusCounts[status]++;
    }
  });

  const totalItems = batch.total_count || 0;
  const completedItems = statusCounts.complete + statusCounts.failed;
  const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Calculate estimated time remaining (if processing)
  let estimatedTimeRemaining: number | null = null;
  if (batch.status === "processing" && batch.started_at && completedItems > 0) {
    const startTime = new Date(batch.started_at).getTime();
    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - startTime) / 1000;
    const averageTimePerItem = elapsedSeconds / completedItems;
    const remainingItems = totalItems - completedItems;
    estimatedTimeRemaining = Math.round(averageTimePerItem * remainingItems);
  }

  return NextResponse.json({
    batch: {
      id: batch.id,
      name: batch.name,
      status: batch.status,
      total_count: batch.total_count,
      processed_count: batch.processed_count,
      failed_count: batch.failed_count,
      created_at: batch.created_at,
      started_at: batch.started_at,
      completed_at: batch.completed_at,
    },
    progress: {
      total: totalItems,
      pending: statusCounts.pending,
      processing: statusCounts.processing,
      completed: statusCounts.complete,
      failed: statusCounts.failed,
      percentage: progressPercentage,
      estimated_time_remaining_seconds: estimatedTimeRemaining,
    },
  });
}
