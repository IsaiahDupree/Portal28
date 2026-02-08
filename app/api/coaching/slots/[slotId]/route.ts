import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const CoachingSlotUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  duration_minutes: z.number().int().positive().max(480).optional(),
  slot_type: z.enum(['one_on_one', 'group', 'workshop']).optional(),
  max_participants: z.number().int().positive().optional(),
  price_cents: z.number().int().min(0).optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  timezone: z.string().optional(),
  location: z.string().optional(),
  location_type: z.enum(['virtual', 'physical', 'hybrid']).optional(),
  status: z.enum(['available', 'booked', 'cancelled', 'completed']).optional(),
  is_published: z.boolean().optional(),
  video_call_url: z.string().url().optional(),
  video_call_provider: z.enum(['zoom', 'meet', 'teams', 'custom']).optional(),
  reminder_hours_before: z.number().int().positive().optional(),
  metadata: z.record(z.any()).optional(),
})

/**
 * GET /api/coaching/slots/[slotId]
 * Get a specific coaching slot
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slotId: string }> }
) {
  try {
    const { slotId } = await context.params
    const supabase = await createClient()

    const { data: slot, error } = await supabase
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
      .eq('id', slotId)
      .single()

    if (error || !slot) {
      return NextResponse.json(
        { error: 'Coaching slot not found' },
        { status: 404 }
      )
    }

    // Check if slot is published or user has access
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!slot.is_published && slot.coach_id !== user?.id) {
      // Check if user is admin
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (userData?.role !== 'admin') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // If user is authenticated, check if they have booked this slot
    if (user) {
      const { data: booking } = await supabase
        .from('coaching_bookings')
        .select('id, status')
        .eq('slot_id', slotId)
        .eq('student_id', user.id)
        .in('status', ['pending', 'confirmed'])
        .maybeSingle()

      return NextResponse.json({
        slot: {
          ...slot,
          is_booked_by_user: !!booking,
          user_booking: booking,
        },
      })
    }

    return NextResponse.json({ slot })
  } catch (error) {
    console.error('Unexpected error in GET /api/coaching/slots/[slotId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/coaching/slots/[slotId]
 * Update a coaching slot (coach or admin only)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ slotId: string }> }
) {
  try {
    const { slotId } = await context.params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the slot to verify ownership
    const { data: slot, error: slotError } = await supabase
      .from('coaching_slots')
      .select('coach_id')
      .eq('id', slotId)
      .single()

    if (slotError || !slot) {
      return NextResponse.json(
        { error: 'Coaching slot not found' },
        { status: 404 }
      )
    }

    // Check if user is the coach or admin
    if (slot.coach_id !== user.id) {
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
    const validatedData = CoachingSlotUpdateSchema.parse(body)

    // Validate times if both are provided
    if (validatedData.start_time && validatedData.end_time) {
      const startTime = new Date(validatedData.start_time)
      const endTime = new Date(validatedData.end_time)

      if (endTime <= startTime) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        )
      }
    }

    // Update the slot
    const { data: updatedSlot, error: updateError } = await supabase
      .from('coaching_slots')
      .update(validatedData)
      .eq('id', slotId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating coaching slot:', updateError)
      return NextResponse.json(
        { error: 'Failed to update coaching slot' },
        { status: 500 }
      )
    }

    return NextResponse.json({ slot: updatedSlot })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Unexpected error in PATCH /api/coaching/slots/[slotId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/coaching/slots/[slotId]
 * Delete a coaching slot (coach or admin only)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ slotId: string }> }
) {
  try {
    const { slotId } = await context.params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the slot to verify ownership and check for bookings
    const { data: slot, error: slotError } = await supabase
      .from('coaching_slots')
      .select('coach_id, status, current_participants')
      .eq('id', slotId)
      .single()

    if (slotError || !slot) {
      return NextResponse.json(
        { error: 'Coaching slot not found' },
        { status: 404 }
      )
    }

    // Check if user is the coach or admin
    if (slot.coach_id !== user.id) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userData?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Check if slot has active bookings
    if (slot.current_participants > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot delete slot with active bookings. Cancel the slot instead.',
        },
        { status: 400 }
      )
    }

    // Delete the slot
    const { error: deleteError } = await supabase
      .from('coaching_slots')
      .delete()
      .eq('id', slotId)

    if (deleteError) {
      console.error('Error deleting coaching slot:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete coaching slot' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/coaching/slots/[slotId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
