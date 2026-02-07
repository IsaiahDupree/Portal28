import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/events/[eventId]/attendees
 * Get list of attendees for an event (creator/admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if event exists and user has permission
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('creator_id')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if user is creator or admin
    if (event.creator_id !== user.id) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userData?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Get attendees
    const { data: registrations, error } = await supabase
      .from('event_registrations')
      .select(
        `
        *,
        user:user_id (
          id,
          email
        )
      `
      )
      .eq('event_id', eventId)
      .eq('status', 'registered')
      .order('registered_at', { ascending: true })

    if (error) {
      console.error('Error fetching attendees:', error)
      return NextResponse.json(
        { error: 'Failed to fetch attendees' },
        { status: 500 }
      )
    }

    return NextResponse.json({ attendees: registrations })
  } catch (error) {
    console.error(
      'Unexpected error in GET /api/events/[eventId]/attendees:',
      error
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
