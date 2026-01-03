import { NextRequest, NextResponse } from "next/server";
import { runScheduler } from "@/lib/email/scheduler";

// Vercel Cron configuration
export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds max for cron

export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel adds this header)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Scheduler] Starting cron run...");

  try {
    const result = await runScheduler();

    console.log(`[Scheduler] Completed: ${result.processed} processed, ${result.sent} sent, ${result.failed} failed`);

    if (result.errors.length > 0) {
      console.error("[Scheduler] Errors:", result.errors);
    }

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Scheduler] Fatal error:", message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// Also allow POST for manual triggers
export async function POST(req: NextRequest) {
  return GET(req);
}
