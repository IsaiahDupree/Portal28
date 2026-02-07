import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/events/upcoming
 * Get upcoming events (next 30 days by default)
 * Query params: days_ahead (optional, default 30)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const daysAhead = parseInt(searchParams.get('days_ahead') || '30')

    const supabase = await createClient()

    // Calculate date range
    const now = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + daysAhead)

    const { data: events, error } = await supabase
      .from('events')
      .select(
        `
        id,
        title,
        description,
        event_type,
        location,
        location_type,
        start_time,
        end_time,
        timezone,
        max_attendees,
        current_attendees,
        status,
        cover_image_url
      `
      )
      .eq('is_published', true)
      .neq('status', 'cancelled')
      .gte('start_time', now.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error fetching upcoming events:', error)
      return NextResponse.json(
        { error: 'Failed to fetch upcoming events' },
        { status: 500 }
      )
    }

    // Check if user is authenticated to show registration status
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user && events) {
      const eventIds = events.map((e) => e.id)
      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('event_id')
        .in('event_id', eventIds)
        .eq('user_id', user.id)
        .eq('status', 'registered')

      const registeredEventIds = new Set(
        registrations?.map((r) => r.event_id) || []
      )

      const eventsWithRegistration = events.map((event) => ({
        ...event,
        is_registered: registeredEventIds.has(event.id),
        is_full:
          event.max_attendees !== null &&
          event.current_attendees >= event.max_attendees,
      }))

      return NextResponse.json({ events: eventsWithRegistration })
    }

    const eventsWithCapacity = events.map((event) => ({
      ...event,
      is_full:
        event.max_attendees !== null &&
        event.current_attendees >= event.max_attendees,
    }))

    return NextResponse.json({ events: eventsWithCapacity })
  } catch (error) {
    console.error('Unexpected error in GET /api/events/upcoming:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
