/**
 * API endpoint for receiving tracking events
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, properties, userId, timestamp } = body;

    if (!event) {
      return NextResponse.json(
        { error: 'Event name is required' },
        { status: 400 }
      );
    }

    // Get user from session or use provided userId
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const finalUserId = userId || user?.id || null;

    // Store event in database
    const { error: insertError } = await supabase.from('tracking_events').insert({
      event_name: event,
      user_id: finalUserId,
      properties: properties || {},
      timestamp: timestamp || new Date().toISOString(),
      session_id: request.headers.get('x-session-id'),
      user_agent: request.headers.get('user-agent'),
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      referrer: request.headers.get('referer'),
    });

    if (insertError) {
      logger.error('Failed to insert tracking event', insertError, {
        event,
        userId: finalUserId,
      });

      // Don't fail the request - tracking should be non-blocking
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error processing tracking event', error as Error);

    // Return success to avoid blocking client
    return NextResponse.json({ success: true });
  }
}
