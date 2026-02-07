import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const EventUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  event_type: z
    .enum(['webinar', 'workshop', 'meeting', 'livestream', 'other'])
    .optional(),
  location: z.string().optional(),
  location_type: z.enum(['virtual', 'physical', 'hybrid']).optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  timezone: z.string().optional(),
  max_attendees: z.number().int().positive().optional(),
  is_published: z.boolean().optional(),
  status: z.enum(['scheduled', 'live', 'completed', 'cancelled']).optional(),
  reminder_hours_before: z.number().int().positive().optional(),
  cover_image_url: z.string().url().optional(),
})

/**
 * GET /api/events/[eventId]
 * Get event details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const supabase = await createClient()

    const { data: event, error } = await supabase
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
      .eq('id', eventId)
      .single()

    if (error || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Only show unpublished events to creator or admin
    if (!event.is_published) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || user.id !== event.creator_id) {
        // Check if admin
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user?.id)
          .single()

        if (userData?.role !== 'admin') {
          return NextResponse.json(
            { error: 'Event not found' },
            { status: 404 }
          )
        }
      }
    }

    // Check registration status if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: registration } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .eq('status', 'registered')
        .single()

      return NextResponse.json({
        event: {
          ...event,
          is_registered: !!registration,
          registration: registration || null,
        },
      })
    }

    return NextResponse.json({ event })
  } catch (error) {
    console.error('Unexpected error in GET /api/events/[eventId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/events/[eventId]
 * Update event (creator or admin only)
 */
export async function PUT(
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

    const body = await request.json()
    const validatedData = EventUpdateSchema.parse(body)

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

    // Update event
    const { data: updatedEvent, error: updateError } = await supabase
      .from('events')
      .update(validatedData)
      .eq('id', eventId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating event:', updateError)
      return NextResponse.json(
        { error: 'Failed to update event' },
        { status: 500 }
      )
    }

    return NextResponse.json({ event: updatedEvent })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Unexpected error in PUT /api/events/[eventId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/events/[eventId]
 * Partial update event (creator or admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  return PUT(request, { params })
}

/**
 * DELETE /api/events/[eventId]
 * Delete event (creator or admin only)
 */
export async function DELETE(
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

    // Delete event (will cascade to registrations and comments)
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (deleteError) {
      console.error('Error deleting event:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete event' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/events/[eventId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
