import { NextRequest, NextResponse } from "next/server";
import { runAutomationScheduler } from "@/lib/email/automation-scheduler";

/**
 * Cron endpoint for automation scheduler
 * Should be called every minute or every 5 minutes via Vercel Cron or external service
 *
 * Vercel cron config (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/automation-scheduler",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */
export async function GET(req: NextRequest) {
  // Verify cron secret for security
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAutomationScheduler();

    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scheduler failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(req: NextRequest) {
  return GET(req);
}
