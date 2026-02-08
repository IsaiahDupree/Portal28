/**
 * Batch Video Generation Processor
 * Handles processing of multiple video briefs sequentially
 */

import { supabaseServer } from "@/lib/supabase/server";

export interface VideoBrief {
  title: string;
  description?: string;
  format?: string;
  platform?: string;
  duration?: number;
  customParameters?: Record<string, any>;
}

export interface VideoResult {
  success: boolean;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface BatchProcessorOptions {
  batchId: string;
  onProgress?: (progress: {
    total: number;
    processed: number;
    failed: number;
    currentItem: number;
  }) => void;
  onItemComplete?: (itemId: string, result: VideoResult) => void;
  onError?: (error: Error) => void;
}

/**
 * Process a single video brief
 * This is a placeholder for actual video generation logic
 * In production, this would integrate with actual video generation APIs
 */
async function processVideoBrief(brief: VideoBrief): Promise<VideoResult> {
  try {
    // TODO: Integrate with actual video generation API
    // For now, simulate processing with a delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate video generation result
    const result: VideoResult = {
      success: true,
      videoUrl: `https://example.com/videos/${Date.now()}.mp4`,
      thumbnailUrl: `https://example.com/thumbnails/${Date.now()}.jpg`,
      duration: brief.duration || 60,
      metadata: {
        title: brief.title,
        format: brief.format || "default",
        platform: brief.platform || "default",
        generatedAt: new Date().toISOString(),
      },
    };

    return result;
  } catch (error) {
    console.error("Error processing video brief:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Process a batch of video briefs sequentially
 */
export async function processBatch(options: BatchProcessorOptions): Promise<void> {
  const { batchId, onProgress, onItemComplete, onError } = options;
  const supabase = supabaseServer();

  try {
    // Fetch batch job
    const { data: batch, error: batchError } = await supabase
      .from("video_batch_jobs")
      .select("*")
      .eq("id", batchId)
      .single();

    if (batchError || !batch) {
      throw new Error(`Batch not found: ${batchId}`);
    }

    // Update batch status to processing
    await supabase
      .from("video_batch_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .eq("id", batchId);

    // Fetch batch items
    const { data: items, error: itemsError } = await supabase
      .from("video_batch_items")
      .select("*")
      .eq("batch_id", batchId)
      .order("sort_order", { ascending: true });

    if (itemsError || !items) {
      throw new Error(`Failed to fetch batch items: ${itemsError?.message}`);
    }

    let processedCount = 0;
    let failedCount = 0;

    // Process items sequentially
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Check if batch was cancelled
      const { data: currentBatch } = await supabase
        .from("video_batch_jobs")
        .select("status")
        .eq("id", batchId)
        .single();

      if (currentBatch?.status === "cancelled") {
        console.log(`Batch ${batchId} was cancelled, stopping processing`);
        break;
      }

      // Update item status to processing
      await supabase
        .from("video_batch_items")
        .update({
          status: "processing",
          started_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      // Process the video brief
      const result = await processVideoBrief(item.brief as VideoBrief);

      // Update item with result
      if (result.success) {
        await supabase
          .from("video_batch_items")
          .update({
            status: "complete",
            result,
            completed_at: new Date().toISOString(),
          })
          .eq("id", item.id);
        processedCount++;
      } else {
        await supabase
          .from("video_batch_items")
          .update({
            status: "failed",
            error_message: result.error,
            completed_at: new Date().toISOString(),
          })
          .eq("id", item.id);
        failedCount++;
      }

      // Update batch counters
      await supabase
        .from("video_batch_jobs")
        .update({
          processed_count: processedCount,
          failed_count: failedCount,
        })
        .eq("id", batchId);

      // Call progress callback
      if (onProgress) {
        onProgress({
          total: items.length,
          processed: processedCount,
          failed: failedCount,
          currentItem: i + 1,
        });
      }

      // Call item complete callback
      if (onItemComplete) {
        onItemComplete(item.id, result);
      }
    }

    // Update batch status to complete
    const finalStatus = failedCount === items.length ? "failed" : "complete";
    await supabase
      .from("video_batch_jobs")
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
      })
      .eq("id", batchId);

    // Collect successful results
    const { data: completedItems } = await supabase
      .from("video_batch_items")
      .select("result")
      .eq("batch_id", batchId)
      .eq("status", "complete");

    const results = completedItems?.map((item) => item.result) || [];

    // Update batch with collected results
    await supabase
      .from("video_batch_jobs")
      .update({
        results,
      })
      .eq("id", batchId);
  } catch (error) {
    console.error("Error processing batch:", error);

    // Update batch status to failed
    await supabase
      .from("video_batch_jobs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", batchId);

    if (onError) {
      onError(error instanceof Error ? error : new Error("Unknown error"));
    }

    throw error;
  }
}

/**
 * Start processing a batch job (async background task)
 * This should be called from an API route or background job processor
 */
export async function startBatchProcessing(batchId: string): Promise<void> {
  // Process batch in background (fire and forget)
  processBatch({
    batchId,
    onProgress: (progress) => {
      console.log(
        `Batch ${batchId} progress: ${progress.processed}/${progress.total} (${progress.failed} failed)`
      );
    },
    onItemComplete: (itemId, result) => {
      console.log(`Item ${itemId} completed:`, result.success ? "success" : "failed");
    },
    onError: (error) => {
      console.error(`Batch ${batchId} error:`, error);
    },
  }).catch((error) => {
    console.error(`Batch ${batchId} failed:`, error);
  });
}
