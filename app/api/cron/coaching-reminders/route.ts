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
 * Cron job to send coaching booking reminders
 * Should run every hour
 */
export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel adds this header)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[Coaching Reminders] Starting cron run...')

  try {
    const supabase = await createClient()

    // Get bookings needing reminders using the database function
    const { data: remindersNeeded, error } = await supabase.rpc(
      'get_coaching_bookings_needing_reminders'
    )

    if (error) {
      console.error('[Coaching Reminders] Error fetching reminders:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reminders' },
        { status: 500 }
      )
    }

    if (!remindersNeeded || remindersNeeded.length === 0) {
      console.log('[Coaching Reminders] No reminders to send')
      return NextResponse.json({
        success: true,
        sent: 0,
        timestamp: new Date().toISOString(),
      })
    }

    let sent = 0
    let failed = 0
    const errors: string[] = []

    // Send reminders to both students and coaches
    for (const reminder of remindersNeeded) {
      try {
        if (!resend) {
          console.warn('Resend API key not configured, skipping reminder email')
          continue
        }

        const startTime = new Date(reminder.slot_start_time)
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

        // Send reminder to student
        await resend.emails.send({
          from:
            process.env.RESEND_FROM_EMAIL || 'Portal28 <noreply@portal28.com>',
          to: reminder.student_email,
          subject: `Reminder: Your coaching session starts soon!`,
          html: `
            <h1>Coaching Session Reminder</h1>
            <p>This is a reminder that your coaching session <strong>${reminder.slot_title}</strong> is starting in ${reminder.reminder_hours_before} hours!</p>

            <h2>Session Details:</h2>
            <ul>
              <li><strong>When:</strong> ${formattedDate} at ${formattedTime}</li>
              ${reminder.video_call_url ? `<li><strong>Join Link:</strong> <a href="${reminder.video_call_url}">${reminder.video_call_url}</a></li>` : ''}
            </ul>

            <p>Looking forward to your session!</p>
          `,
        })

        // Send reminder to coach
        await resend.emails.send({
          from:
            process.env.RESEND_FROM_EMAIL || 'Portal28 <noreply@portal28.com>',
          to: reminder.coach_email,
          subject: `Reminder: Your coaching session with ${reminder.student_email} starts soon!`,
          html: `
            <h1>Coaching Session Reminder</h1>
            <p>This is a reminder that your coaching session <strong>${reminder.slot_title}</strong> with ${reminder.student_email} is starting in ${reminder.reminder_hours_before} hours!</p>

            <h2>Session Details:</h2>
            <ul>
              <li><strong>When:</strong> ${formattedDate} at ${formattedTime}</li>
              <li><strong>Student:</strong> ${reminder.student_email}</li>
              ${reminder.video_call_url ? `<li><strong>Join Link:</strong> <a href="${reminder.video_call_url}">${reminder.video_call_url}</a></li>` : ''}
            </ul>

            <p>See you there!</p>
          `,
        })

        // Mark reminder as sent
        await supabase
          .from('coaching_bookings')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', reminder.booking_id)

        sent += 2 // Count both student and coach emails
      } catch (error) {
        console.error(
          `[Coaching Reminders] Failed to send reminder for booking ${reminder.booking_id}:`,
          error
        )
        failed++
        errors.push(
          `Booking ${reminder.booking_id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    console.log(
      `[Coaching Reminders] Completed: ${sent} sent, ${failed} failed`
    )

    if (errors.length > 0) {
      console.error('[Coaching Reminders] Errors:', errors)
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
    console.error('[Coaching Reminders] Fatal error:', message)

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
