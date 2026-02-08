/**
 * Streak Milestone Celebration Handler
 * Sends celebration emails and notifications when users reach milestones
 */

import { render } from '@react-email/render'
import { Resend } from 'resend'
import { StreakMilestoneEmail, StreakMilestoneEmailText } from '@/lib/email/templates/streak-milestone'
import { getStreakBadge } from './index'
import { createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

// Milestones that trigger celebrations
const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365, 500, 1000]

/**
 * Check if a streak value is a milestone
 */
export function isMilestone(streak: number): boolean {
  return MILESTONES.includes(streak)
}

/**
 * Send milestone celebration email and notification
 */
export async function celebrateMilestone(
  userId: string,
  milestone: number,
  userEmail?: string
) {
  try {
    const supabase = await createClient()

    // Get user details if email not provided
    let email = userEmail
    let userName = ''

    if (!email) {
      const { data: user } = await supabase.auth.admin.getUserById(userId)
      if (!user || !user.user) {
        console.error('User not found:', userId)
        return false
      }
      email = user.user.email
      userName =
        user.user.user_metadata?.full_name ||
        user.user.user_metadata?.name ||
        email?.split('@')[0] ||
        'there'
    }

    if (!email) {
      console.error('No email found for user:', userId)
      return false
    }

    // Get badge info for this milestone
    const badge = getStreakBadge(milestone)

    // Render email
    const html = render(
      StreakMilestoneEmail({
        userName,
        milestone,
        badgeName: badge.name,
        badgeEmoji: badge.emoji
      })
    )

    const text = StreakMilestoneEmailText({
      userName,
      milestone,
      badgeName: badge.name,
      badgeEmoji: badge.emoji
    })

    // Send email
    await resend.emails.send({
      from: process.env.FROM_EMAIL || 'Portal28 <noreply@portal28.com>',
      to: email,
      subject: `🎉 ${milestone} Day Streak - ${badge.name} Unlocked!`,
      html,
      text
    })

    // Create in-app notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'streak_milestone',
      title: `${milestone} Day Streak!`,
      message: `Congratulations! You've unlocked: ${badge.name}`,
      data: {
        milestone,
        badge_name: badge.name,
        badge_emoji: badge.emoji
      },
      action_url: '/app/dashboard'
    })

    // Log achievement
    await supabase.from('user_achievements').insert({
      user_id: userId,
      achievement_type: 'streak_milestone',
      achievement_value: milestone,
      metadata: {
        badge_name: badge.name,
        badge_emoji: badge.emoji
      }
    })

    console.log(`Milestone celebration sent for user ${userId}: ${milestone} days`)
    return true
  } catch (error) {
    console.error('Error sending milestone celebration:', error)
    return false
  }
}

/**
 * Check for and celebrate milestone when streak is updated
 */
export async function checkAndCelebrateMilestone(
  userId: string,
  newStreak: number,
  previousStreak: number
) {
  // Check if the new streak crosses a milestone
  for (const milestone of MILESTONES) {
    if (newStreak >= milestone && previousStreak < milestone) {
      // User just reached this milestone
      await celebrateMilestone(userId, milestone)
      return milestone
    }
  }
  return null
}
