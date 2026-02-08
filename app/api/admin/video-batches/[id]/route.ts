import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// GET /api/admin/video-batches/[id]
// Get status and details of a specific batch job
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
    .select("*")
    .eq("id", batchId)
    .single();

  if (batchError) {
    if (batchError.code === "PGRST116") {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    console.error("Error fetching batch job:", batchError);
    return NextResponse.json({ error: batchError.message }, { status: 500 });
  }

  // Fetch batch items
  const { data: items, error: itemsError } = await supabase
    .from("video_batch_items")
    .select("*")
    .eq("batch_id", batchId)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    console.error("Error fetching batch items:", itemsError);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({
    batch,
    items: items ?? [],
  });
}

// PATCH /api/admin/video-batches/[id]
// Update batch job status (e.g., cancel)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchId = params.id;

  try {
    const body = await request.json();
    const { status } = body;

    if (!status || !["cancelled"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Only 'cancelled' is allowed." },
        { status: 400 }
      );
    }

    // Update batch status
    const { data: batch, error: updateError } = await supabase
      .from("video_batch_jobs")
      .update({ status })
      .eq("id", batchId)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === "PGRST116") {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }
      console.error("Error updating batch job:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log admin action
    await supabase.from("admin_actions").insert({
      user_id: authData.user.id,
      action: "updated_batch_video_job",
      details: {
        batch_id: batchId,
        status,
      },
    });

    return NextResponse.json({ batch });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/video-batches/[id]
// Delete a batch job and all its items
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchId = params.id;

  // Delete batch (cascade will delete items)
  const { error } = await supabase
    .from("video_batch_jobs")
    .delete()
    .eq("id", batchId);

  if (error) {
    console.error("Error deleting batch job:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log admin action
  await supabase.from("admin_actions").insert({
    user_id: authData.user.id,
    action: "deleted_batch_video_job",
    details: {
      batch_id: batchId,
    },
  });

  return NextResponse.json({ success: true });
}
