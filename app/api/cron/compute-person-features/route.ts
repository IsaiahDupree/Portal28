/**
 * GDP-011: Person Features Computation Cron Job
 * Scheduled job to compute person features daily
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/compute-person-features",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedAuth) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Call the compute-features endpoint
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:2828';
    const response = await fetch(`${baseUrl}/api/growth-data-plane/compute-features`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cron_secret: process.env.CRON_SECRET,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[GDP-011 Cron] Error computing person features:', result);
      return NextResponse.json(
        { error: 'Failed to compute person features', details: result },
        { status: 500 }
      );
    }

    console.log('[GDP-011 Cron] Person features computed successfully:', result);

    return NextResponse.json({
      success: true,
      message: 'Person features computed successfully',
      ...result,
    });
  } catch (error) {
    console.error('[GDP-011 Cron] Error in cron job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
