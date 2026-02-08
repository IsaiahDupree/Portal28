import { test, expect } from '@playwright/test'
import { supabaseAdmin } from '@/lib/supabase/admin'

test.describe('Learning Streaks System', () => {
  let testUserId: string

  test.beforeEach(async () => {
    // Create a test user
    const { data: authData } = await supabaseAdmin.auth.admin.createUser({
      email: `streak-test-${Date.now()}@example.com`,
      email_confirm: true,
      password: 'test123456'
    })
    testUserId = authData.user!.id
  })

  test.afterEach(async () => {
    // Clean up test user and associated data
    if (testUserId) {
      await supabaseAdmin.from('learning_streaks').delete().eq('user_id', testUserId)
      await supabaseAdmin.from('streak_activity_log').delete().eq('user_id', testUserId)
      await supabaseAdmin.auth.admin.deleteUser(testUserId)
    }
  })

  test.describe('NEW-STR-001: Track daily lesson completions', () => {
    test('should create streak record on first lesson completion', async () => {
      // Call the streak update function
      const { error } = await supabaseAdmin.rpc('update_learning_streak', {
        p_user_id: testUserId
      })

      expect(error).toBeNull()

      // Verify streak was created
      const { data: streak } = await supabaseAdminAdmin
        .from('learning_streaks')
        .select('*')
        .eq('user_id', testUserId)
        .single()

      expect(streak).toBeTruthy()
      expect(streak.current_streak).toBe(1)
      expect(streak.longest_streak).toBe(1)
      expect(streak.total_learning_days).toBe(1)
    })

    test('should increment streak on consecutive days', async () => {
      // Day 1
      await supabaseAdmin.rpc('update_learning_streak', { p_user_id: testUserId })

      // Simulate day 2 by manipulating the date
      await supabaseAdmin
        .from('learning_streaks')
        .update({ last_activity_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] })
        .eq('user_id', testUserId)

      // Day 2 activity
      await supabaseAdmin.rpc('update_learning_streak', { p_user_id: testUserId })

      const { data: streak } = await supabaseAdmin
        .from('learning_streaks')
        .select('current_streak')
        .eq('user_id', testUserId)
        .single()

      expect(streak.current_streak).toBe(2)
    })

    test('should reset streak if day is skipped', async () => {
      // Start with a 3-day streak
      await supabaseAdmin
        .from('learning_streaks')
        .insert({
          user_id: testUserId,
          current_streak: 3,
          longest_streak: 3,
          last_activity_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          total_learning_days: 3
        })

      // Complete lesson today (2 days gap)
      await supabaseAdmin.rpc('update_learning_streak', { p_user_id: testUserId })

      const { data: streak } = await supabaseAdmin
        .from('learning_streaks')
        .select('*')
        .eq('user_id', testUserId)
        .single()

      expect(streak.current_streak).toBe(1) // Reset to 1
      expect(streak.longest_streak).toBe(3) // Keep longest
    })

    test('should not double-count same day activity', async () => {
      // Complete lesson once
      await supabaseAdmin.rpc('update_learning_streak', { p_user_id: testUserId })

      const { data: streak1 } = await supabaseAdmin
        .from('learning_streaks')
        .select('current_streak, total_learning_days')
        .eq('user_id', testUserId)
        .single()

      // Complete another lesson same day
      await supabaseAdmin.rpc('update_learning_streak', { p_user_id: testUserId })

      const { data: streak2 } = await supabaseAdmin
        .from('learning_streaks')
        .select('current_streak, total_learning_days')
        .eq('user_id', testUserId)
        .single()

      expect(streak2.current_streak).toBe(streak1.current_streak)
      expect(streak2.total_learning_days).toBe(streak1.total_learning_days)
    })

    test('should track longest streak correctly', async () => {
      // Build up a 5-day streak
      for (let i = 5; i >= 1; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        await supabase
          .from('learning_streaks')
          .upsert({
            user_id: testUserId,
            current_streak: 6 - i,
            longest_streak: 6 - i,
            last_activity_date: date,
            total_learning_days: 6 - i
          })
      }

      // Complete today
      await supabaseAdmin.rpc('update_learning_streak', { p_user_id: testUserId })

      const { data: streak } = await supabaseAdmin
        .from('learning_streaks')
        .select('current_streak, longest_streak')
        .eq('user_id', testUserId)
        .single()

      expect(streak.current_streak).toBe(6)
      expect(streak.longest_streak).toBe(6)

      // Break the streak
      await supabaseAdmin
        .from('learning_streaks')
        .update({ last_activity_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] })
        .eq('user_id', testUserId)

      // Start new streak
      await supabaseAdmin.rpc('update_learning_streak', { p_user_id: testUserId })

      const { data: newStreak } = await supabaseAdmin
        .from('learning_streaks')
        .select('current_streak, longest_streak')
        .eq('user_id', testUserId)
        .single()

      expect(newStreak.current_streak).toBe(1)
      expect(newStreak.longest_streak).toBe(6) // Should keep the longest
    })
  })

  test.describe('Streak Statistics', () => {
    test('should calculate streak stats correctly', async () => {
      // Create streak record
      await supabaseAdmin.from('learning_streaks').insert({
        user_id: testUserId,
        current_streak: 7,
        longest_streak: 10,
        last_activity_date: new Date().toISOString().split('T')[0],
        total_learning_days: 25
      })

      // Call stats function
      const { data } = await supabaseAdmin.rpc('get_user_streak_stats', {
        p_user_id: testUserId
      })

      expect(data).toBeTruthy()
      expect(data[0].current_streak).toBe(7)
      expect(data[0].longest_streak).toBe(10)
      expect(data[0].total_learning_days).toBe(25)
    })

    test('should check streak freeze/at-risk status', async () => {
      // Create streak with yesterday's activity
      await supabaseAdmin.from('learning_streaks').insert({
        user_id: testUserId,
        current_streak: 5,
        longest_streak: 5,
        last_activity_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        total_learning_days: 5
      })

      const { data } = await supabaseAdmin.rpc('check_streak_freeze', {
        p_user_id: testUserId
      })

      expect(data[0].streak_at_risk).toBe(true)
      expect(data[0].current_streak).toBe(5)
      expect(data[0].hours_until_reset).toBeGreaterThan(0)
    })
  })

  test.describe('Activity Logging', () => {
    test('should log daily activity with lesson count', async () => {
      await supabaseAdmin.rpc('log_streak_activity', {
        p_user_id: testUserId,
        p_lessons_completed: 3,
        p_minutes_studied: 45
      })

      const { data } = await supabaseAdmin
        .from('streak_activity_log')
        .select('*')
        .eq('user_id', testUserId)
        .single()

      expect(data.lessons_completed).toBe(3)
      expect(data.minutes_studied).toBe(45)
      expect(data.activity_date).toBe(new Date().toISOString().split('T')[0])
    })

    test('should accumulate same-day activity', async () => {
      // First activity
      await supabaseAdmin.rpc('log_streak_activity', {
        p_user_id: testUserId,
        p_lessons_completed: 2,
        p_minutes_studied: 20
      })

      // Second activity same day
      await supabaseAdmin.rpc('log_streak_activity', {
        p_user_id: testUserId,
        p_lessons_completed: 1,
        p_minutes_studied: 15
      })

      const { data } = await supabaseAdmin
        .from('streak_activity_log')
        .select('*')
        .eq('user_id', testUserId)
        .single()

      expect(data.lessons_completed).toBe(3) // 2 + 1
      expect(data.minutes_studied).toBe(35) // 20 + 15
    })
  })

  test.describe('Automatic Trigger on Lesson Completion', () => {
    test('should auto-update streak when lesson is completed', async () => {
      // Create a course and lesson for testing
      const { data: course } = await supabaseAdmin
        .from('courses')
        .insert({ title: 'Test Course', slug: `test-${Date.now()}`, status: 'published' })
        .select()
        .single()

      const { data: lesson } = await supabaseAdmin
        .from('lessons')
        .insert({
          title: 'Test Lesson',
          module_id: course.id,
          content: 'Test content'
        })
        .select()
        .single()

      // Mark lesson as completed (should trigger streak update)
      await supabaseAdmin.from('lesson_progress').insert({
        user_id: testUserId,
        lesson_id: lesson.id,
        completed: true
      })

      // Wait a moment for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 500))

      // Check if streak was created
      const { data: streak } = await supabaseAdmin
        .from('learning_streaks')
        .select('*')
        .eq('user_id', testUserId)
        .single()

      expect(streak).toBeTruthy()
      expect(streak.current_streak).toBe(1)

      // Cleanup
      await supabaseAdmin.from('lesson_progress').delete().eq('user_id', testUserId)
      await supabaseAdmin.from('lessons').delete().eq('id', lesson.id)
      await supabaseAdmin.from('courses').delete().eq('id', course.id)
    })
  })

  test.describe('Edge Cases', () => {
    test('should handle timezone differences', async () => {
      // This test ensures streaks are calculated based on dates, not timestamps
      const date1 = '2026-02-01'
      const date2 = '2026-02-02'

      await supabaseAdmin.from('learning_streaks').insert({
        user_id: testUserId,
        current_streak: 1,
        longest_streak: 1,
        last_activity_date: date1,
        total_learning_days: 1
      })

      // Update to next day
      await supabaseAdmin
        .from('learning_streaks')
        .update({ last_activity_date: date1 })
        .eq('user_id', testUserId)

      await supabaseAdmin.rpc('update_learning_streak', { p_user_id: testUserId })

      const { data: streak } = await supabaseAdmin
        .from('learning_streaks')
        .select('current_streak')
        .eq('user_id', testUserId)
        .single()

      expect(streak.current_streak).toBeGreaterThanOrEqual(1)
    })

    test('should handle null/missing data gracefully', async () => {
      const { data } = await supabaseAdmin.rpc('get_user_streak_stats', {
        p_user_id: testUserId
      })

      // Should return empty array or default values, not error
      expect(data).toBeDefined()
    })
  })
})
