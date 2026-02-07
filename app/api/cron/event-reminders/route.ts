import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

// Vercel Cron configuration
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds max for cron

/**
 * Cron job to send event reminders
 * Should run every hour
 */
export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel adds this header)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[Event Reminders] Starting cron run...')

  try {
    const supabase = await createClient()

    // Get events needing reminders using the database function
    const { data: remindersNeeded, error } = await supabase.rpc(
      'get_events_needing_reminders'
    )

    if (error) {
      console.error('[Event Reminders] Error fetching reminders:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reminders' },
        { status: 500 }
      )
    }

    if (!remindersNeeded || remindersNeeded.length === 0) {
      console.log('[Event Reminders] No reminders to send')
      return NextResponse.json({
        success: true,
        sent: 0,
        timestamp: new Date().toISOString(),
      })
    }

    let sent = 0
    let failed = 0
    const errors: string[] = []

    // Send reminders
    for (const reminder of remindersNeeded) {
      try {
        if (!resend) {
          console.warn('Resend API key not configured, skipping reminder email')
          continue
        }

        const startTime = new Date(reminder.event_start_time)
        const formattedDate = startTime.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        const formattedTime = startTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })

        // Send reminder email
        await resend.emails.send({
          from:
            process.env.RESEND_FROM_EMAIL || 'Portal28 <noreply@portal28.com>',
          to: reminder.user_email,
          subject: `Reminder: ${reminder.event_title} starts soon!`,
          html: `
            <h1>Event Reminder</h1>
            <p>This is a reminder that <strong>${reminder.event_title}</strong> is starting in ${reminder.reminder_hours_before} hours!</p>

            <h2>Event Details:</h2>
            <ul>
              <li><strong>When:</strong> ${formattedDate} at ${formattedTime}</li>
            </ul>

            <p>See you there!</p>
          `,
        })

        // Mark reminder as sent
        await supabase
          .from('event_registrations')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('event_id', reminder.event_id)
          .eq('user_id', reminder.user_id)

        sent++
      } catch (error) {
        console.error(
          `[Event Reminders] Failed to send reminder for event ${reminder.event_id}:`,
          error
        )
        failed++
        errors.push(
          `Event ${reminder.event_id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    console.log(
      `[Event Reminders] Completed: ${sent} sent, ${failed} failed`
    )

    if (errors.length > 0) {
      console.error('[Event Reminders] Errors:', errors)
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      errors,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Event Reminders] Fatal error:', message)

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

// Also allow POST for manual triggers
export async function POST(req: NextRequest) {
  return GET(req)
}
