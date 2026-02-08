import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const CoachingSlotCreateSchema = z.object({
  title: z.string().min(1).default('Coaching Session'),
  description: z.string().optional(),
  duration_minutes: z.number().int().positive().max(480).default(60),
  slot_type: z.enum(['one_on_one', 'group', 'workshop']).default('one_on_one'),
  max_participants: z.number().int().positive().default(1),
  price_cents: z.number().int().min(0).default(0),
  start_time: z.string(),
  end_time: z.string(),
  timezone: z.string().default('America/New_York'),
  location: z.string().optional(),
  location_type: z.enum(['virtual', 'physical', 'hybrid']).default('virtual'),
  is_published: z.boolean().default(true),
  video_call_url: z.string().url().optional(),
  video_call_provider: z.enum(['zoom', 'meet', 'teams', 'custom']).optional(),
  reminder_hours_before: z.number().int().positive().default(24),
  metadata: z.record(z.any()).optional(),
})

/**
 * GET /api/coaching/slots
 * List available coaching slots
 * Query params: coach_id, type, start, end, days_ahead
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const coachId = searchParams.get('coach_id')
    const slotType = searchParams.get('type')
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    const daysAhead = parseInt(searchParams.get('days_ahead') || '30')

    const supabase = await createClient()

    // If using the database function for available slots
    if (!startDate && !endDate) {
      const { data: slots, error } = await supabase.rpc(
        'get_available_coaching_slots',
        {
          days_ahead: daysAhead,
          filter_coach_id: coachId || null,
        }
      )

      if (error) {
        console.error('Error fetching coaching slots:', error)
        return NextResponse.json(
          { error: 'Failed to fetch coaching slots' },
          { status: 500 }
        )
      }

      return NextResponse.json({ slots })
    }

    // Custom query for more specific filtering
    let query = supabase
      .from('coaching_slots')
      .select(
        `
        *,
        coach:coach_id (
          id,
          email
        )
      `
      )
      .eq('is_published', true)
      .eq('status', 'available')
      .gte('start_time', new Date().toISOString())

    // Filter by coach
    if (coachId) {
      query = query.eq('coach_id', coachId)
    }

    // Filter by slot type
    if (slotType) {
      query = query.eq('slot_type', slotType)
    }

    // Filter by date range
    if (startDate) {
      query = query.gte('start_time', startDate)
    }
    if (endDate) {
      query = query.lte('start_time', endDate)
    }

    // Order by start time
    query = query.order('start_time', { ascending: true })

    const { data: slots, error } = await query

    if (error) {
      console.error('Error fetching coaching slots:', error)
      return NextResponse.json(
        { error: 'Failed to fetch coaching slots' },
        { status: 500 }
      )
    }

    // If user is authenticated, check booking status for each slot
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user && slots) {
      const slotIds = slots.map((s) => s.id)
      const { data: bookings } = await supabase
        .from('coaching_bookings')
        .select('slot_id')
        .in('slot_id', slotIds)
        .eq('student_id', user.id)
        .in('status', ['pending', 'confirmed'])

      const bookedSlotIds = new Set(bookings?.map((b) => b.slot_id) || [])

      const slotsWithBookingStatus = slots.map((slot) => ({
        ...slot,
        is_booked_by_user: bookedSlotIds.has(slot.id),
      }))

      return NextResponse.json({ slots: slotsWithBookingStatus })
    }

    return NextResponse.json({ slots })
  } catch (error) {
    console.error('Unexpected error in GET /api/coaching/slots:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/coaching/slots
 * Create a new coaching slot (coaches and admins only)
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

    // Check if user is admin or coach
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (
      userError ||
      !['admin', 'coach'].includes(userData?.role || '')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = CoachingSlotCreateSchema.parse(body)

    // Validate times
    const startTime = new Date(validatedData.start_time)
    const endTime = new Date(validatedData.end_time)

    if (endTime <= startTime) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      )
    }

    // Check for overlapping slots
    const { data: overlappingSlots } = await supabase
      .from('coaching_slots')
      .select('id')
      .eq('coach_id', user.id)
      .neq('status', 'cancelled')
      .or(
        `and(start_time.lte.${validatedData.start_time},end_time.gte.${validatedData.start_time}),and(start_time.lte.${validatedData.end_time},end_time.gte.${validatedData.end_time})`
      )
      .limit(1)

    if (overlappingSlots && overlappingSlots.length > 0) {
      return NextResponse.json(
        { error: 'You have an overlapping slot during this time' },
        { status: 400 }
      )
    }

    // Create coaching slot
    const { data: slot, error: createError } = await supabase
      .from('coaching_slots')
      .insert({
        ...validatedData,
        coach_id: user.id,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating coaching slot:', createError)
      return NextResponse.json(
        { error: 'Failed to create coaching slot' },
        { status: 500 }
      )
    }

    return NextResponse.json({ slot }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Unexpected error in POST /api/coaching/slots:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
