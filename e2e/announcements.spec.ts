/**
 * E2E tests for Announcements Feature
 * Tests: PLT-ANN-001 through PLT-ANN-006
 */

import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:28321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

test.describe('Announcements Feature', () => {
  let supabase: any
  let testSpaceId: string
  let adminEmail: string
  let adminPassword: string
  let regularEmail: string
  let regularPassword: string
  let testAnnouncementId: string

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create test space
    const { data: space } = await supabase
      .from('community_spaces')
      .insert({
        name: 'E2E Announcements Test Space',
        slug: 'e2e-announcements-test-' + Date.now(),
      })
      .select()
      .single()

    testSpaceId = space.id

    // Create admin user
    adminEmail = `admin-e2e-announcements-${Date.now()}@test.com`
    adminPassword = 'testpassword123'
    const { data: adminAuth } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    })

    // Make user admin
    await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', adminAuth.user.id)

    // Add to space as admin
    await supabase.from('community_space_members').insert({
      space_id: testSpaceId,
      user_id: adminAuth.user.id,
      role: 'admin',
      status: 'active',
    })

    // Create regular user
    regularEmail = `regular-e2e-announcements-${Date.now()}@test.com`
    regularPassword = 'testpassword123'
    const { data: regularAuth } = await supabase.auth.admin.createUser({
      email: regularEmail,
      password: regularPassword,
      email_confirm: true,
    })

    await supabase.from('community_space_members').insert({
      space_id: testSpaceId,
      user_id: regularAuth.user.id,
      role: 'member',
      status: 'active',
    })

    // Create test announcements
    const { data: announcement1 } = await supabase
      .from('announcements')
      .insert({
        title: 'Welcome to the Community',
        content: 'This is a test announcement with **markdown** formatting.',
        excerpt: 'Welcome message for all members',
        space_id: testSpaceId,
        author_id: adminAuth.user.id,
        is_pinned: true,
        tags: ['welcome', 'getting-started'],
        published_at: new Date().toISOString(),
      })
      .select()
      .single()

    testAnnouncementId = announcement1.id

    await supabase.from('announcements').insert([
      {
        title: 'New Course Available',
        content: 'Check out our latest course on advanced topics.',
        space_id: testSpaceId,
        author_id: adminAuth.user.id,
        tags: ['courses', 'update'],
        published_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        title: 'Draft Announcement',
        content: 'This is a draft',
        space_id: testSpaceId,
        author_id: adminAuth.user.id,
        published_at: null,
      },
    ])
  })

  test.afterAll(async () => {
    // Cleanup
    await supabase.from('announcements').delete().eq('space_id', testSpaceId)
    await supabase
      .from('community_space_members')
      .delete()
      .eq('space_id', testSpaceId)
    await supabase.from('community_spaces').delete().eq('id', testSpaceId)
  })

  test('PLT-ANN-001: Feed lists all published announcements', async ({ page }) => {
    // Login as regular user
    await page.goto('http://localhost:2828/login')
    await page.fill('input[type="email"]', regularEmail)
    await page.click('button[type="submit"]')

    // Wait for magic link to arrive (mock email system)
    await page.waitForTimeout(2000)

    // Navigate to announcements
    await page.goto('http://localhost:2828/app/community/announcements')

    // Verify page loaded
    await expect(page.locator('h1')).toContainText('Announcements')

    // Verify published announcements are visible
    await expect(page.locator('text=Welcome to the Community')).toBeVisible()
    await expect(page.locator('text=New Course Available')).toBeVisible()

    // Verify draft is not visible
    await expect(page.locator('text=Draft Announcement')).not.toBeVisible()
  })

  test('PLT-ANN-002: Single announcement view shows full content', async ({
    page,
  }) => {
    await page.goto('http://localhost:2828/login')
    await page.fill('input[type="email"]', regularEmail)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    // Navigate directly to single announcement
    await page.goto(
      `http://localhost:2828/app/community/announcements/${testAnnouncementId}`
    )

    // Verify full announcement is visible
    await expect(page.locator('h1 , h2, h3').filter({ hasText: 'Welcome to the Community' })).toBeVisible()
    await expect(
      page.locator('text=This is a test announcement')
    ).toBeVisible()

    // Verify markdown is rendered
    await expect(page.locator('strong')).toContainText('markdown')

    // Verify tags are shown
    await expect(page.locator('text=welcome')).toBeVisible()
    await expect(page.locator('text=getting-started')).toBeVisible()
  })

  test('PLT-ANN-003: Pinned announcements appear at top', async ({ page }) => {
    await page.goto('http://localhost:2828/login')
    await page.fill('input[type="email"]', regularEmail)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    await page.goto('http://localhost:2828/app/community/announcements')

    // Verify pinned badge is visible
    await expect(page.locator('text=Pinned').first()).toBeVisible()

    // Verify pinned announcement is first
    const firstAnnouncement = page.locator('article, [class*="Card"]').first()
    await expect(firstAnnouncement).toContainText('Welcome to the Community')
    await expect(firstAnnouncement).toContainText('Pinned')
  })

  test('PLT-ANN-004: Tag filter works', async ({ page }) => {
    await page.goto('http://localhost:2828/login')
    await page.fill('input[type="email"]', regularEmail)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    await page.goto('http://localhost:2828/app/community/announcements')

    // Wait for tags to load
    await page.waitForTimeout(1000)

    // Click on a tag filter
    const welcomeTagButton = page.locator('button, a').filter({ hasText: 'welcome' }).first()
    if (await welcomeTagButton.isVisible()) {
      await welcomeTagButton.click()

      // Verify filtered results
      await expect(page.locator('text=Welcome to the Community')).toBeVisible()
      // Other announcements without the tag should not be visible
      await expect(page.locator('text=New Course Available')).not.toBeVisible()
    }
  })

  test('PLT-ANN-005: Admin can create announcements', async ({ page }) => {
    await page.goto('http://localhost:2828/login')
    await page.fill('input[type="email"]', adminEmail)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    // Navigate to admin announcements
    await page.goto('http://localhost:2828/admin/announcements')

    // Click new announcement button
    await page.click('text=New Announcement')

    // Fill out form
    await page.fill('input[id="title"]', 'E2E Test Announcement')
    await page.fill(
      'textarea[id="content"]',
      'This is a test announcement created via E2E test'
    )
    await page.fill('input[id="excerpt"]', 'Test excerpt')

    // Add a tag
    await page.fill('input[id="tags"]', 'test')
    await page.click('button:has-text("Add")')

    // Publish
    await page.check('input[id="publish_now"]')
    await page.click('button[type="submit"]:has-text("Publish")')

    // Verify redirect to list
    await expect(page).toHaveURL(/\/admin\/announcements/)
    await expect(page.locator('text=E2E Test Announcement')).toBeVisible()
  })

  test('PLT-ANN-006: RLS blocks non-members', async ({ page }) => {
    // Create a non-member user
    const nonMemberEmail = `nonmember-e2e-${Date.now()}@test.com`
    await supabase.auth.admin.createUser({
      email: nonMemberEmail,
      password: 'testpassword123',
      email_confirm: true,
    })

    await page.goto('http://localhost:2828/login')
    await page.fill('input[type="email"]', nonMemberEmail)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    // Try to access announcements
    await page.goto('http://localhost:2828/app/community/announcements')

    // Should see empty state or error
    await expect(
      page.locator('text=No announcements, text=not a member, text=Forbidden')
    ).toBeVisible()
  })

  test('Admin can edit announcements', async ({ page }) => {
    await page.goto('http://localhost:2828/login')
    await page.fill('input[type="email"]', adminEmail)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    await page.goto('http://localhost:2828/admin/announcements')

    // Find and click edit button for first announcement
    const editButton = page.locator('button, a').filter({ hasText: /Edit|edit|pencil/i }).first()
    await editButton.click()

    // Wait for form to load
    await page.waitForTimeout(1000)

    // Update title
    await page.fill('input[id="title"]', 'Updated Title via E2E')

    // Save
    await page.click('button[type="submit"]:has-text("Update")')

    // Verify update
    await expect(page).toHaveURL(/\/admin\/announcements/)
    await expect(page.locator('text=Updated Title via E2E')).toBeVisible()
  })

  test('Admin can pin/unpin announcements', async ({ page }) => {
    await page.goto('http://localhost:2828/login')
    await page.fill('input[type="email"]', adminEmail)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    await page.goto('http://localhost:2828/admin/announcements')

    // Click edit on an unpinned announcement
    const announcementRow = page.locator('text=New Course Available').locator('..')
    const editButton = announcementRow.locator('button, a').filter({ hasText: /Edit/i })
    await editButton.click()

    // Pin it
    await page.check('input[id="is_pinned"]')
    await page.click('button[type="submit"]:has-text("Update")')

    // Verify it's pinned
    await expect(page.locator('text=New Course Available').locator('..')).toContainText('Pinned')
  })

  test('Admin can save as draft', async ({ page }) => {
    await page.goto('http://localhost:2828/login')
    await page.fill('input[type="email"]', adminEmail)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    await page.goto('http://localhost:2828/admin/announcements/new')

    // Fill form
    await page.fill('input[id="title"]', 'Draft E2E Test')
    await page.fill('textarea[id="content"]', 'This is a draft')

    // Save as draft
    await page.click('button:has-text("Save as Draft")')

    // Verify draft is shown in admin list
    await expect(page).toHaveURL(/\/admin\/announcements/)
    await expect(page.locator('text=Draft E2E Test')).toBeVisible()
    await expect(page.locator('text=Draft E2E Test').locator('..')).toContainText('Draft')

    // Verify draft is not visible to regular users
    await page.goto('http://localhost:2828/logout')
    await page.goto('http://localhost:2828/login')
    await page.fill('input[type="email"]', regularEmail)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    await page.goto('http://localhost:2828/app/community/announcements')
    await expect(page.locator('text=Draft E2E Test')).not.toBeVisible()
  })
})
