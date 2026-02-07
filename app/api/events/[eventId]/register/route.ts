import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

/**
 * POST /api/events/[eventId]/register
 * Register for an event
 */
export async function POST(
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

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if event is published
    if (!event.is_published) {
      return NextResponse.json(
        { error: 'Event is not available for registration' },
        { status: 400 }
      )
    }

    // Check if event is cancelled
    if (event.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Event has been cancelled' },
        { status: 400 }
      )
    }

    // Check if event has already started
    if (new Date(event.start_time) < new Date()) {
      return NextResponse.json(
        { error: 'Event has already started' },
        { status: 400 }
      )
    }

    // Check if already registered
    const { data: existingRegistration } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single()

    if (existingRegistration) {
      if (existingRegistration.status === 'registered') {
        return NextResponse.json(
          { error: 'Already registered for this event' },
          { status: 400 }
        )
      } else if (existingRegistration.status === 'cancelled') {
        // Re-register
        const { data: registration, error: updateError } = await supabase
          .from('event_registrations')
          .update({
            status: 'registered',
            cancelled_at: null,
          })
          .eq('id', existingRegistration.id)
          .select()
          .single()

        if (updateError) {
          console.error('Error re-registering for event:', updateError)
          return NextResponse.json(
            { error: 'Failed to register for event' },
            { status: 500 }
          )
        }

        return NextResponse.json({ registration }, { status: 201 })
      }
    }

    // Check capacity (trigger will also check, but we can provide better error message)
    if (
      event.max_attendees !== null &&
      event.current_attendees >= event.max_attendees
    ) {
      return NextResponse.json(
        { error: 'Event is at full capacity' },
        { status: 400 }
      )
    }

    // Create registration
    const { data: registration, error: createError } = await supabase
      .from('event_registrations')
      .insert({
        event_id: eventId,
        user_id: user.id,
        status: 'registered',
      })
      .select()
      .single()

    if (createError) {
      console.error('Error registering for event:', createError)

      // Check if capacity error
      if (createError.message.includes('capacity')) {
        return NextResponse.json(
          { error: 'Event is at full capacity' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to register for event' },
        { status: 500 }
      )
    }

    // Send confirmation email
    try {
      if (!resend) {
        console.warn('Resend API key not configured, skipping confirmation email')
      } else {
        const startTime = new Date(event.start_time)
        const formattedDate = startTime.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        const formattedTime = startTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: event.timezone,
          timeZoneName: 'short',
        })

        await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Portal28 <noreply@portal28.com>',
        to: user.email!,
        subject: `You're registered for ${event.title}`,
        html: `
          <h1>You're registered!</h1>
          <p>You've successfully registered for <strong>${event.title}</strong>.</p>

          <h2>Event Details:</h2>
          <ul>
            <li><strong>When:</strong> ${formattedDate} at ${formattedTime}</li>
            <li><strong>Type:</strong> ${event.event_type}</li>
            ${event.location ? `<li><strong>Location:</strong> ${event.location}</li>` : ''}
          </ul>

          ${event.description ? `<p>${event.description}</p>` : ''}

          <p>We'll send you a reminder ${event.reminder_hours_before} hours before the event starts.</p>

          <p>See you there!</p>
        `,
        })
      }
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError)
      // Don't fail the registration if email fails
    }

    return NextResponse.json({ registration }, { status: 201 })
  } catch (error) {
    console.error(
      'Unexpected error in POST /api/events/[eventId]/register:',
      error
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/events/[eventId]/register
 * Cancel registration for an event
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

    // Get registration
    const { data: registration, error: regError } = await supabase
      .from('event_registrations')
      .select('*, event:event_id(*)')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .eq('status', 'registered')
      .single()

    if (regError || !registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    // Update registration status to cancelled
    const { error: updateError } = await supabase
      .from('event_registrations')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', registration.id)

    if (updateError) {
      console.error('Error cancelling registration:', updateError)
      return NextResponse.json(
        { error: 'Failed to cancel registration' },
        { status: 500 }
      )
    }

    // Send cancellation confirmation email
    try {
      if (resend) {
        const event = registration.event as any
        await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Portal28 <noreply@portal28.com>',
        to: user.email!,
        subject: `Registration cancelled: ${event.title}`,
        html: `
          <h1>Registration Cancelled</h1>
          <p>You've successfully cancelled your registration for <strong>${event.title}</strong>.</p>
          <p>You can re-register anytime before the event if you change your mind.</p>
        `,
        })
      }
    } catch (emailError) {
      console.error('Error sending cancellation email:', emailError)
      // Don't fail the cancellation if email fails
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(
      'Unexpected error in DELETE /api/events/[eventId]/register:',
      error
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
