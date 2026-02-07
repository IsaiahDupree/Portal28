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
  max_attendees: z.number().int().positive().optional().nullable(),
  is_published: z.boolean().default(false),
  registration_required: z.boolean().default(true),
  reminder_hours_before: z.number().int().positive().default(24),
  cover_image_url: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
})

/**
 * GET /api/admin/events
 * List all events (admin only)
 */
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

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
      .order('start_time', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: events, error } = await query

    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      )
    }

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/events
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

    console.error('Unexpected error in POST /api/admin/events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
