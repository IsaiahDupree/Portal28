'use client'

import { useEffect, useState } from 'react'
import { formatStreakCount, getStreakBadge, getProgressToNextMilestone } from '@/lib/streaks'

interface StreakStats {
  current_streak: number
  longest_streak: number
  total_learning_days: number
  last_activity_date: string | null
  streak_started_at: string | null
  days_this_week: number
  days_this_month: number
}

interface StreakDisplayProps {
  stats: StreakStats
  showDetails?: boolean
}

export function StreakDisplay({ stats, showDetails = false }: StreakDisplayProps) {
  const { current_streak, longest_streak, days_this_week } = stats
  const badge = getStreakBadge(current_streak)
  const progress = getProgressToNextMilestone(current_streak)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Main Streak Display */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-3xl ${badge.color}`}>{badge.emoji}</span>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {formatStreakCount(current_streak)}
              </h3>
              <p className="text-sm text-gray-600">{badge.name}</p>
            </div>
          </div>
        </div>

        {/* Longest Streak Badge */}
        {longest_streak > current_streak && (
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase">Best</p>
            <p className="text-lg font-semibold text-gray-700">
              {formatStreakCount(longest_streak)}
            </p>
          </div>
        )}
      </div>

      {/* Progress to Next Milestone */}
      {progress.next > current_streak && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>{current_streak} days</span>
            <span>{progress.next} days</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">
            {progress.next - current_streak} days until {getStreakBadge(progress.next).name}
          </p>
        </div>
      )}

      {/* Detailed Stats */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500 uppercase mb-1">This Week</p>
            <p className="text-lg font-semibold text-gray-900">
              {days_this_week} {days_this_week === 1 ? 'day' : 'days'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase mb-1">Total Days</p>
            <p className="text-lg font-semibold text-gray-900">
              {stats.total_learning_days}
            </p>
          </div>
        </div>
      )}

      {/* At Risk Warning */}
      {current_streak > 0 && stats.last_activity_date && (
        <StreakAtRiskWarning
          lastActivityDate={stats.last_activity_date}
          currentStreak={current_streak}
        />
      )}
    </div>
  )
}

function StreakAtRiskWarning({
  lastActivityDate,
  currentStreak
}: {
  lastActivityDate: string
  currentStreak: number
}) {
  const [isAtRisk, setIsAtRisk] = useState(false)
  const [hoursLeft, setHoursLeft] = useState(0)

  useEffect(() => {
    const checkRisk = () => {
      const lastActivity = new Date(lastActivityDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const lastActivityDay = new Date(lastActivity)
      lastActivityDay.setHours(0, 0, 0, 0)

      // Check if last activity was today
      const isToday = lastActivityDay.getTime() === today.getTime()

      if (!isToday) {
        setIsAtRisk(true)

        // Calculate hours until midnight
        const now = new Date()
        const midnight = new Date()
        midnight.setHours(24, 0, 0, 0)
        const hours = Math.floor((midnight.getTime() - now.getTime()) / (1000 * 60 * 60))
        setHoursLeft(hours)
      } else {
        setIsAtRisk(false)
      }
    }

    checkRisk()
    const interval = setInterval(checkRisk, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [lastActivityDate])

  if (!isAtRisk) return null

  return (
    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-start gap-2">
        <span className="text-amber-600 text-lg">⚠️</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-900">
            Your {currentStreak}-day streak is at risk!
          </p>
          <p className="text-xs text-amber-700 mt-1">
            Complete a lesson in the next {hoursLeft} {hoursLeft === 1 ? 'hour' : 'hours'} to keep
            your streak alive.
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact streak widget for sidebar/header
 */
export function StreakWidget({ currentStreak }: { currentStreak: number }) {
  const badge = getStreakBadge(currentStreak)

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
      <span className={`text-xl ${badge.color}`}>{badge.emoji}</span>
      <div>
        <p className="text-xs text-gray-600">Streak</p>
        <p className="text-sm font-bold text-gray-900">{currentStreak} days</p>
      </div>
    </div>
  )
}

/**
 * Streak celebration modal/toast component
 */
export function StreakCelebration({
  milestone,
  onClose
}: {
  milestone: number
  onClose: () => void
}) {
  const badge = getStreakBadge(milestone)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-4 text-center">
        <div className="text-6xl mb-4">{badge.emoji}</div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {milestone} Day Streak!
        </h2>
        <p className="text-lg text-gray-600 mb-6">
          You've unlocked: <span className="font-semibold">{badge.name}</span>
        </p>
        <p className="text-gray-700 mb-6">
          Fantastic work! Keep learning every day to maintain your momentum.
        </p>
        <button
          onClick={onClose}
          className="bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
        >
          Keep Going! 🚀
        </button>
      </div>
    </div>
  )
}
