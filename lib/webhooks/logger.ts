import { supabaseAdmin } from "@/lib/supabase/admin";

export type WebhookSource = "stripe" | "resend" | "mux" | "other";
export type WebhookStatus = "pending" | "processing" | "success" | "failed" | "retrying";

export interface WebhookEventData {
  source: WebhookSource;
  eventType: string;
  eventId?: string;
  payload: any;
  headers?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface WebhookEventResult {
  success: boolean;
  error?: string;
  errorStack?: string;
  responseData?: any;
  processingTimeMs?: number;
}

/**
 * Log a webhook event to the database
 */
export async function logWebhookEvent(data: WebhookEventData): Promise<string | null> {
  try {
    const { data: event, error } = await supabaseAdmin
      .from("webhook_events")
      .insert({
        source: data.source,
        event_type: data.eventType,
        event_id: data.eventId,
        payload: data.payload,
        headers: data.headers || {},
        status: "pending",
        attempts: 0,
        metadata: data.metadata || {},
      })
      .select("id")
      .single();

    if (error) {
      console.error("[WebhookLogger] Failed to log webhook event:", error);
      return null;
    }

    return event.id;
  } catch (err) {
    console.error("[WebhookLogger] Exception logging webhook event:", err);
    return null;
  }
}

/**
 * Update webhook event status after processing
 */
export async function updateWebhookEventStatus(
  eventId: string,
  result: WebhookEventResult
): Promise<void> {
  try {
    const status: WebhookStatus = result.success ? "success" : "failed";

    const updateData: any = {
      status,
      last_attempt_at: new Date().toISOString(),
      processing_time_ms: result.processingTimeMs,
    };

    // Increment attempts
    const { data: current } = await supabaseAdmin
      .from("webhook_events")
      .select("attempts, max_attempts")
      .eq("id", eventId)
      .single();

    if (current) {
      updateData.attempts = (current.attempts || 0) + 1;

      // If failed and under max attempts, set to retrying
      if (!result.success && updateData.attempts < current.max_attempts) {
        updateData.status = "retrying";
        // Exponential backoff: 1min, 5min, 15min
        const delayMinutes = Math.pow(5, updateData.attempts - 1);
        const nextRetry = new Date();
        nextRetry.setMinutes(nextRetry.getMinutes() + delayMinutes);
        updateData.next_retry_at = nextRetry.toISOString();
      }
    }

    if (!result.success) {
      updateData.error_message = result.error || "Unknown error";
      updateData.error_stack = result.errorStack;
    }

    if (result.responseData) {
      updateData.response_data = result.responseData;
    }

    const { error } = await supabaseAdmin
      .from("webhook_events")
      .update(updateData)
      .eq("id", eventId);

    if (error) {
      console.error("[WebhookLogger] Failed to update webhook event:", error);
    }
  } catch (err) {
    console.error("[WebhookLogger] Exception updating webhook event:", err);
  }
}

/**
 * Wrapper function to process a webhook with automatic logging
 */
export async function processWebhookWithLogging<T>(
  data: WebhookEventData,
  processFn: () => Promise<T>
): Promise<{ result?: T; error?: Error }> {
  const startTime = Date.now();
  const eventId = await logWebhookEvent(data);

  try {
    // Update to processing
    if (eventId) {
      await supabaseAdmin
        .from("webhook_events")
        .update({ status: "processing" })
        .eq("id", eventId);
    }

    // Execute the webhook processing function
    const result = await processFn();
    const processingTimeMs = Date.now() - startTime;

    // Log success
    if (eventId) {
      await updateWebhookEventStatus(eventId, {
        success: true,
        processingTimeMs,
        responseData: result,
      });
    }

    return { result };
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    const err = error as Error;

    // Log failure
    if (eventId) {
      await updateWebhookEventStatus(eventId, {
        success: false,
        error: err.message,
        errorStack: err.stack,
        processingTimeMs,
      });
    }

    return { error: err };
  }
}

/**
 * Get webhook events with filtering
 */
export async function getWebhookEvents(filters?: {
  source?: WebhookSource;
  status?: WebhookStatus;
  limit?: number;
  offset?: number;
}) {
  let query = supabaseAdmin
    .from("webhook_events")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters?.source) {
    query = query.eq("source", filters.source);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  return query;
}

/**
 * Retry a failed webhook event
 */
export async function retryWebhookEvent(
  eventId: string,
  processFn: (payload: any) => Promise<any>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the event
    const { data: event, error: fetchError } = await supabaseAdmin
      .from("webhook_events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (fetchError || !event) {
      return { success: false, error: "Event not found" };
    }

    // Check if retries are available
    if (event.attempts >= event.max_attempts) {
      return { success: false, error: "Max retry attempts reached" };
    }

    // Update status to processing
    await supabaseAdmin
      .from("webhook_events")
      .update({ status: "processing", next_retry_at: null })
      .eq("id", eventId);

    // Process the webhook
    const startTime = Date.now();
    try {
      const result = await processFn(event.payload);
      const processingTimeMs = Date.now() - startTime;

      await updateWebhookEventStatus(eventId, {
        success: true,
        processingTimeMs,
        responseData: result,
      });

      return { success: true };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const err = error as Error;

      await updateWebhookEventStatus(eventId, {
        success: false,
        error: err.message,
        errorStack: err.stack,
        processingTimeMs,
      });

      return { success: false, error: err.message };
    }
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}

/**
 * Get webhook statistics
 */
export async function getWebhookStats() {
  const { data, error } = await supabaseAdmin
    .from("webhook_event_stats")
    .select("*")
    .order("hour", { ascending: false })
    .limit(168); // Last 7 days of hourly stats

  if (error) {
    console.error("[WebhookLogger] Failed to fetch stats:", error);
    return [];
  }

  return data || [];
}
