/**
 * Learning Streaks System
 * Tracks daily learning activity and calculates streaks
 */

import { createClient } from '@/lib/supabase/server'

export interface StreakStats {
  current_streak: number
  longest_streak: number
  total_learning_days: number
  last_activity_date: string | null
  streak_started_at: string | null
  days_this_week: number
  days_this_month: number
}

export interface StreakFreeze {
  streak_at_risk: boolean
  last_activity_date: string | null
  current_streak: number
  hours_until_reset: number
}

/**
 * Get comprehensive streak statistics for a user
 */
export async function getUserStreakStats(userId: string): Promise<StreakStats | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_user_streak_stats', {
    p_user_id: userId
  })

  if (error) {
    console.error('Error fetching streak stats:', error)
    return null
  }

  if (!data || data.length === 0) {
    // Return default stats if no record exists yet
    return {
      current_streak: 0,
      longest_streak: 0,
      total_learning_days: 0,
      last_activity_date: null,
      streak_started_at: null,
      days_this_week: 0,
      days_this_month: 0
    }
  }

  return data[0]
}

/**
 * Check if a user's streak is at risk
 */
export async function checkStreakFreeze(userId: string): Promise<StreakFreeze | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('check_streak_freeze', {
    p_user_id: userId
  })

  if (error) {
    console.error('Error checking streak freeze:', error)
    return null
  }

  if (!data || data.length === 0) {
    return {
      streak_at_risk: false,
      last_activity_date: null,
      current_streak: 0,
      hours_until_reset: 0
    }
  }

  return data[0]
}

/**
 * Manually update a user's streak (called after lesson completion)
 * Note: This is also handled automatically via database trigger
 */
export async function updateLearningStreak(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase.rpc('update_learning_streak', {
    p_user_id: userId
  })

  if (error) {
    console.error('Error updating streak:', error)
    return false
  }

  return true
}

/**
 * Log daily activity details (lessons completed, time spent)
 */
export async function logStreakActivity(
  userId: string,
  lessonsCompleted: number = 1,
  minutesStudied: number = 0
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase.rpc('log_streak_activity', {
    p_user_id: userId,
    p_lessons_completed: lessonsCompleted,
    p_minutes_studied: minutesStudied
  })

  if (error) {
    console.error('Error logging activity:', error)
    return false
  }

  return true
}

/**
 * Get streak activity log for a user (for analytics/history)
 */
export async function getStreakActivityLog(userId: string, days: number = 30) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('streak_activity_log')
    .select('*')
    .eq('user_id', userId)
    .order('activity_date', { ascending: false })
    .limit(days)

  if (error) {
    console.error('Error fetching activity log:', error)
    return []
  }

  return data || []
}

/**
 * Format streak number for display (e.g., "7 day streak" or "52 days")
 */
export function formatStreakCount(count: number): string {
  if (count === 0) return 'No streak yet'
  if (count === 1) return '1 day'
  return `${count} days`
}

/**
 * Get streak badge/tier based on current streak
 */
export function getStreakBadge(currentStreak: number): {
  name: string
  emoji: string
  color: string
} {
  if (currentStreak >= 365) {
    return { name: 'Year Champion', emoji: '🏆', color: 'text-yellow-500' }
  }
  if (currentStreak >= 100) {
    return { name: 'Century', emoji: '💯', color: 'text-purple-500' }
  }
  if (currentStreak >= 30) {
    return { name: 'Monthly Master', emoji: '⭐', color: 'text-blue-500' }
  }
  if (currentStreak >= 7) {
    return { name: 'Week Warrior', emoji: '🔥', color: 'text-orange-500' }
  }
  if (currentStreak >= 3) {
    return { name: 'Rising Star', emoji: '✨', color: 'text-green-500' }
  }
  return { name: 'Getting Started', emoji: '🌱', color: 'text-gray-500' }
}

/**
 * Calculate percentage progress towards next milestone
 */
export function getProgressToNextMilestone(currentStreak: number): {
  current: number
  next: number
  percentage: number
} {
  const milestones = [3, 7, 30, 100, 365]

  // Find next milestone
  const nextMilestone = milestones.find(m => m > currentStreak)

  if (!nextMilestone) {
    // Already at max milestone
    return {
      current: currentStreak,
      next: currentStreak,
      percentage: 100
    }
  }

  // Find previous milestone (or 0)
  const prevMilestone = milestones.reverse().find(m => m <= currentStreak) || 0

  const progress = currentStreak - prevMilestone
  const gap = nextMilestone - prevMilestone
  const percentage = Math.round((progress / gap) * 100)

  return {
    current: currentStreak,
    next: nextMilestone,
    percentage
  }
}
