import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const CoachingBookingCreateSchema = z.object({
  slot_id: z.string().uuid(),
  notes: z.string().optional(),
})

/**
 * GET /api/coaching/bookings
 * Get user's coaching bookings
 * Query params: status, upcoming_only
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const upcomingOnly = searchParams.get('upcoming_only') === 'true'

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('coaching_bookings')
      .select(
        `
        *,
        slot:slot_id (
          *,
          coach:coach_id (
            id,
            email,
            
          )
        ),
        student:student_id (
          id,
          email,
          
        )
      `
      )
      .eq('student_id', user.id)

    // Filter by status
    if (status) {
      query = query.eq('status', status)
    }

    // Filter upcoming only
    if (upcomingOnly) {
      query = query.gte('slot.start_time', new Date().toISOString())
    }

    // Order by slot start time
    query = query.order('created_at', { ascending: false })

    const { data: bookings, error } = await query

    if (error) {
      console.error('Error fetching coaching bookings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch coaching bookings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ bookings })
  } catch (error) {
    console.error('Unexpected error in GET /api/coaching/bookings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/coaching/bookings
 * Create a new coaching booking
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

    const body = await request.json()
    const validatedData = CoachingBookingCreateSchema.parse(body)

    // Get the slot details
    const { data: slot, error: slotError } = await supabase
      .from('coaching_slots')
      .select('*')
      .eq('id', validatedData.slot_id)
      .single()

    if (slotError || !slot) {
      return NextResponse.json(
        { error: 'Coaching slot not found' },
        { status: 404 }
      )
    }

    // Check if slot is available
    if (slot.status !== 'available') {
      return NextResponse.json(
        { error: 'This slot is no longer available' },
        { status: 400 }
      )
    }

    // Check if slot is in the future
    if (new Date(slot.start_time) <= new Date()) {
      return NextResponse.json(
        { error: 'Cannot book a slot that has already started' },
        { status: 400 }
      )
    }

    // Check if user already has a booking for this slot
    const { data: existingBooking } = await supabase
      .from('coaching_bookings')
      .select('id')
      .eq('slot_id', validatedData.slot_id)
      .eq('student_id', user.id)
      .in('status', ['pending', 'confirmed'])
      .maybeSingle()

    if (existingBooking) {
      return NextResponse.json(
        { error: 'You already have a booking for this slot' },
        { status: 400 }
      )
    }

    // Check capacity
    if (slot.current_participants >= slot.max_participants) {
      return NextResponse.json(
        { error: 'This slot is at full capacity' },
        { status: 400 }
      )
    }

    // Create booking
    const bookingData = {
      slot_id: validatedData.slot_id,
      student_id: user.id,
      coach_id: slot.coach_id,
      notes: validatedData.notes,
      status: slot.price_cents > 0 ? 'pending' : 'confirmed', // Auto-confirm free sessions
      booking_confirmed_at: slot.price_cents === 0 ? new Date().toISOString() : null,
      amount_paid_cents: slot.price_cents,
      video_call_url: slot.video_call_url,
    }

    const { data: booking, error: createError } = await supabase
      .from('coaching_bookings')
      .insert(bookingData)
      .select(
        `
        *,
        slot:slot_id (
          *,
          coach:coach_id (
            id,
            email,
            
          )
        )
      `
      )
      .single()

    if (createError) {
      console.error('Error creating coaching booking:', createError)
      return NextResponse.json(
        { error: 'Failed to create coaching booking' },
        { status: 500 }
      )
    }

    // TODO: Send confirmation email
    // TODO: If paid, create Stripe payment intent

    return NextResponse.json({ booking }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Unexpected error in POST /api/coaching/bookings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
