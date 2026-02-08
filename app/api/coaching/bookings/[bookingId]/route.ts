import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const CoachingBookingUpdateSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
  notes: z.string().optional(),
  coach_notes: z.string().optional(),
  cancellation_reason: z.string().optional(),
})

/**
 * GET /api/coaching/bookings/[bookingId]
 * Get a specific booking
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await context.params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: booking, error } = await supabase
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
      .eq('id', bookingId)
      .single()

    if (error || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Check if user has access (student, coach, or admin)
    if (booking.student_id !== user.id && booking.coach_id !== user.id) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userData?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json({ booking })
  } catch (error) {
    console.error('Unexpected error in GET /api/coaching/bookings/[bookingId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/coaching/bookings/[bookingId]
 * Update a booking (student or coach)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await context.params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the booking to verify access
    const { data: booking, error: bookingError } = await supabase
      .from('coaching_bookings')
      .select('student_id, coach_id, status')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Check if user has access
    const isStudent = booking.student_id === user.id
    const isCoach = booking.coach_id === user.id

    if (!isStudent && !isCoach) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userData?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const body = await request.json()
    const validatedData = CoachingBookingUpdateSchema.parse(body)

    // Students can only update notes and cancel
    if (isStudent && !isCoach) {
      const allowedFields: any = {}
      if (validatedData.notes !== undefined) {
        allowedFields.notes = validatedData.notes
      }
      if (validatedData.status === 'cancelled') {
        allowedFields.status = 'cancelled'
        allowedFields.cancelled_at = new Date().toISOString()
        if (validatedData.cancellation_reason) {
          allowedFields.cancellation_reason = validatedData.cancellation_reason
        }
      }

      if (Object.keys(allowedFields).length === 0) {
        return NextResponse.json(
          { error: 'No valid fields to update' },
          { status: 400 }
        )
      }

      const { data: updatedBooking, error: updateError } = await supabase
        .from('coaching_bookings')
        .update(allowedFields)
        .eq('id', bookingId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating booking:', updateError)
        return NextResponse.json(
          { error: 'Failed to update booking' },
          { status: 500 }
        )
      }

      return NextResponse.json({ booking: updatedBooking })
    }

    // Coaches can update coach_notes and status
    if (isCoach) {
      const updateData: any = {}

      if (validatedData.coach_notes !== undefined) {
        updateData.coach_notes = validatedData.coach_notes
      }

      if (validatedData.status) {
        updateData.status = validatedData.status

        if (validatedData.status === 'confirmed') {
          updateData.booking_confirmed_at = new Date().toISOString()
        } else if (validatedData.status === 'completed') {
          updateData.completed_at = new Date().toISOString()
        } else if (validatedData.status === 'cancelled') {
          updateData.cancelled_at = new Date().toISOString()
          if (validatedData.cancellation_reason) {
            updateData.cancellation_reason = validatedData.cancellation_reason
          }
        }
      }

      const { data: updatedBooking, error: updateError } = await supabase
        .from('coaching_bookings')
        .update(updateData)
        .eq('id', bookingId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating booking:', updateError)
        return NextResponse.json(
          { error: 'Failed to update booking' },
          { status: 500 }
        )
      }

      return NextResponse.json({ booking: updatedBooking })
    }

    return NextResponse.json(
      { error: 'Not authorized to update this booking' },
      { status: 403 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Unexpected error in PATCH /api/coaching/bookings/[bookingId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/coaching/bookings/[bookingId]
 * Cancel a booking (student only)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await context.params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the booking to verify ownership
    const { data: booking, error: bookingError } = await supabase
      .from('coaching_bookings')
      .select('student_id, status')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Only student can delete their booking
    if (booking.student_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Mark as cancelled instead of deleting
    const { data: cancelledBooking, error: cancelError } = await supabase
      .from('coaching_bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single()

    if (cancelError) {
      console.error('Error cancelling booking:', cancelError)
      return NextResponse.json(
        { error: 'Failed to cancel booking' },
        { status: 500 }
      )
    }

    return NextResponse.json({ booking: cancelledBooking }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/coaching/bookings/[bookingId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
