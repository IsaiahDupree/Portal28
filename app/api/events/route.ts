import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const EventCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  event_type: z.enum(['webinar', 'workshop', 'meeting', 'livestream', 'other']),
  location: z.string().optional(),
  location_type: z.enum(['virtual', 'physical', 'hybrid']),
  start_time: z.string(),
  end_time: z.string(),
  timezone: z.string().default('America/New_York'),
  max_attendees: z.number().int().positive().optional(),
  registration_required: z.boolean().default(true),
  reminder_hours_before: z.number().int().positive().default(24),
  cover_image_url: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
})

/**
 * GET /api/events
 * List published events
 * Query params: type, start, end, search
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const eventType = searchParams.get('type')
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    const searchQuery = searchParams.get('search')

    const supabase = await createClient()

    // Public access for published events
    let query = supabase
      .from('events')
      .select(
        `
        *,
        creator:creator_id (
          id,
          email
        )
      `
      )
      .eq('is_published', true)
      .gte('start_time', new Date().toISOString())

    // Filter by type
    if (eventType) {
      query = query.eq('event_type', eventType)
    }

    // Filter by date range
    if (startDate) {
      query = query.gte('start_time', startDate)
    }
    if (endDate) {
      query = query.lte('start_time', endDate)
    }

    // Search by keyword
    if (searchQuery) {
      query = query.or(
        `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
      )
    }

    // Order by start time
    query = query.order('start_time', { ascending: true })

    const { data: events, error } = await query

    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      )
    }

    // If user is authenticated, check registration status for each event
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
      }))

      return NextResponse.json({ events: eventsWithRegistration })
    }

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Unexpected error in GET /api/events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/events
 * Create a new event (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = EventCreateSchema.parse(body)

    // Validate times
    const startTime = new Date(validatedData.start_time)
    const endTime = new Date(validatedData.end_time)

    if (endTime <= startTime) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      )
    }

    // Create event
    const { data: event, error: createError } = await supabase
      .from('events')
      .insert({
        ...validatedData,
        creator_id: user.id,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating event:', createError)
      return NextResponse.json(
        { error: 'Failed to create event' },
        { status: 500 }
      )
    }

    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Unexpected error in POST /api/events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
