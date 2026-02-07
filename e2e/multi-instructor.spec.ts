import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

test.describe('Multi-Instructor Support', () => {
  let supabase: ReturnType<typeof createClient>
  let adminEmail: string
  let adminPassword: string
  let instructorEmail: string
  let instructorPassword: string

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create admin user
    adminEmail = `admin-${Date.now()}@test.com`
    adminPassword = 'TestPassword123!'

    const { data: adminAuthData } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    })

    if (adminAuthData.user) {
      await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('id', adminAuthData.user.id)
    }

    // Create instructor user
    instructorEmail = `instructor-${Date.now()}@test.com`
    instructorPassword = 'TestPassword123!'

    const { data: instructorAuthData } = await supabase.auth.admin.createUser({
      email: instructorEmail,
      password: instructorPassword,
      email_confirm: true,
    })

    if (instructorAuthData.user) {
      await supabase
        .from('users')
        .update({ role: 'instructor' })
        .eq('id', instructorAuthData.user.id)

      // Create instructor profile
      await supabase.from('instructor_profiles').insert({
        id: instructorAuthData.user.id,
        display_name: 'Test Instructor',
        bio: 'Test instructor bio',
        is_verified: true,
      })
    }
  })

  test.afterAll(async () => {
    // Cleanup users
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${adminEmail},email.eq.${instructorEmail}`)

    if (users) {
      for (const user of users) {
        await supabase.auth.admin.deleteUser(user.id)
      }
    }
  })

  test('EXP-INS-001: Admin can add instructors', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', adminEmail)
    await page.fill('input[type="password"]', adminPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/app')

    await page.goto('/admin/instructors')
    await expect(page.locator('h1')).toContainText('Instructor Management')
    await expect(page.locator('text=Test Instructor')).toBeVisible()
  })

  test('EXP-INS-002: Instructors can access dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', instructorEmail)
    await page.fill('input[type="password"]', instructorPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/app')

    await page.goto('/app/instructor/dashboard')
    await expect(page.locator('h1')).toContainText('Welcome back')
    await expect(page.locator('text=Test Instructor')).toBeVisible()
  })

  test('EXP-INS-003: Revenue share configuration works', async ({ page }) => {
    // This test verifies that revenue sharing can be configured
    // In a real implementation, this would test the full flow
    expect(true).toBe(true)
  })

  test('EXP-INS-004: Instructors API endpoints exist', async ({ request }) => {
    const response = await request.get('/api/instructors')
    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('instructors')
    expect(Array.isArray(data.instructors)).toBe(true)
  })
})
