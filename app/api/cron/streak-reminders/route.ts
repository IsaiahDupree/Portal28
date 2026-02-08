/**
 * Cron Job: Send Streak Reminder Emails
 * Schedule: Every 6 hours (to catch users in different timezones)
 * Purpose: Remind users whose streaks are at risk
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { render } from '@react-email/render'
import { Resend } from 'resend'
import { StreakReminderEmail, StreakReminderEmailText } from '@/lib/email/templates/streak-reminder'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const supabase = await createClient()

    // Get all users with active streaks that haven't logged activity today
    const today = new Date().toISOString().split('T')[0]
    const { data: usersAtRisk, error } = await supabase
      .from('learning_streaks')
      .select(
        `
        user_id,
        current_streak,
        last_activity_date,
        users:auth.users!user_id(email, raw_user_meta_data)
      `
      )
      .gt('current_streak', 0) // Only users with active streaks
      .neq('last_activity_date', today) // Haven't logged activity today

    if (error) {
      console.error('Error fetching users at risk:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!usersAtRisk || usersAtRisk.length === 0) {
      return NextResponse.json({
        message: 'No users at risk',
        count: 0
      })
    }

    // Calculate hours remaining until midnight (in user's timezone - approximate with UTC for now)
    const now = new Date()
    const midnight = new Date()
    midnight.setUTCHours(24, 0, 0, 0)
    const hoursRemaining = Math.floor((midnight.getTime() - now.getTime()) / (1000 * 60 * 60))

    // Only send reminders if 4-12 hours remain (not too early, not last minute)
    if (hoursRemaining < 4 || hoursRemaining > 12) {
      return NextResponse.json({
        message: `Outside reminder window (${hoursRemaining}h remaining)`,
        count: 0
      })
    }

    const emailsSent: string[] = []
    const emailsFailed: string[] = []

    // Send reminders to each user
    for (const user of usersAtRisk) {
      try {
        const email = user.users?.email
        if (!email) {
          console.warn(`No email for user ${user.user_id}`)
          continue
        }

        const userName =
          user.users?.raw_user_meta_data?.full_name ||
          user.users?.raw_user_meta_data?.name ||
          email.split('@')[0]

        const html = render(
          StreakReminderEmail({
            userName,
            currentStreak: user.current_streak,
            hoursRemaining
          })
        )

        const text = StreakReminderEmailText({
          userName,
          currentStreak: user.current_streak,
          hoursRemaining
        })

        await resend.emails.send({
          from: process.env.FROM_EMAIL || 'Portal28 <noreply@portal28.com>',
          to: email,
          subject: `🔥 Your ${user.current_streak}-day streak is at risk!`,
          html,
          text
        })

        emailsSent.push(email)

        // Log the notification
        await supabase.from('notifications').insert({
          user_id: user.user_id,
          type: 'streak_reminder',
          title: 'Streak at Risk',
          message: `Your ${user.current_streak}-day learning streak is at risk. Complete a lesson today!`,
          data: {
            current_streak: user.current_streak,
            hours_remaining: hoursRemaining
          }
        })
      } catch (error) {
        console.error(`Failed to send email to user ${user.user_id}:`, error)
        emailsFailed.push(user.users?.email || user.user_id)
      }
    }

    return NextResponse.json({
      message: 'Streak reminders sent',
      sent: emailsSent.length,
      failed: emailsFailed.length,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      hours_remaining: hoursRemaining
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
