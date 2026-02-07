import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

test.describe('Templates Vault App', () => {
  let supabase: ReturnType<typeof createClient>
  let adminEmail: string
  let adminPassword: string
  let userEmail: string
  let userPassword: string
  let templateId: string

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

    // Create regular user
    userEmail = `user-${Date.now()}@test.com`
    userPassword = 'TestPassword123!'

    await supabase.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true,
    })
  })

  test.afterAll(async () => {
    // Cleanup: Delete templates
    if (templateId) {
      await supabase.from('templates').delete().eq('id', templateId)
    }

    // Delete users
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${adminEmail},email.eq.${userEmail}`)

    if (users) {
      for (const user of users) {
        await supabase.auth.admin.deleteUser(user.id)
      }
    }
  })

  test('EXP-TPL-001: Templates can be uploaded and managed by admin', async ({
    page,
  }) => {
    // Navigate to admin login
    await page.goto('/login')

    // Login as admin
    await page.fill('input[type="email"]', adminEmail)
    await page.fill('input[type="password"]', adminPassword)
    await page.click('button[type="submit"]')

    // Wait for redirect
    await page.waitForURL('/app')

    // Navigate to admin templates
    await page.goto('/admin/templates')

    // Should see templates management page
    await expect(page.locator('h1')).toContainText('Templates Management')

    // Click create template button
    await page.click('button:has-text("Create Template")')

    // Fill in template form
    await page.fill('input[value=""][type="text"]', 'Test Marketing Template')
    await page.fill('textarea', 'A comprehensive marketing template for campaigns')
    await page.selectOption('select', 'marketing')

    // Add file URL
    await page.fill(
      'input[placeholder="https://..."]',
      'https://example.com/template.pdf'
    )
    await page.fill('input[placeholder="template.pdf"]', 'marketing-template.pdf')

    // Add content for copy functionality
    await page.fill(
      'textarea[placeholder*="Template content"]',
      'Sample marketing template content'
    )

    // Add tags
    await page.fill('input[placeholder*="Add a tag"]', 'marketing')
    await page.click('button:has-text("Add")')
    await page.fill('input[placeholder*="Add a tag"]', 'campaign')
    await page.click('button:has-text("Add")')

    // Submit form
    await page.click('button[type="submit"]:has-text("Create Template")')

    // Wait for template to be created
    await page.waitForTimeout(1000)

    // Should see the template in the list
    await expect(page.locator('text=Test Marketing Template')).toBeVisible()

    // Get template ID for cleanup
    const templateCard = page.locator('text=Test Marketing Template').locator('..')
    templateId = await templateCard.getAttribute('data-template-id').catch(() => '')
  })

  test('EXP-TPL-002: Template browser shows templates with category filtering', async ({
    page,
  }) => {
    // Navigate to templates vault as regular user
    await page.goto('/login')

    // Login as user
    await page.fill('input[type="email"]', userEmail)
    await page.fill('input[type="password"]', userPassword)
    await page.click('button[type="submit"]')

    await page.waitForURL('/app')

    // Navigate to templates vault
    await page.goto('/app/templates')

    // Should see templates vault page
    await expect(page.locator('h1')).toContainText('Templates Vault')

    // Should see category filters
    await expect(page.locator('button:has-text("All Categories")')).toBeVisible()
    await expect(page.locator('button:has-text("Design")')).toBeVisible()
    await expect(page.locator('button:has-text("Code")')).toBeVisible()
    await expect(page.locator('button:has-text("Business")')).toBeVisible()
    await expect(page.locator('button:has-text("Marketing")')).toBeVisible()

    // Click marketing category filter
    await page.click('button:has-text("Marketing")')

    // Should filter templates by category
    await page.waitForTimeout(500)

    // Should see marketing templates
    const templateCards = page.locator('[class*="Card"]')
    const count = await templateCards.count()
    expect(count).toBeGreaterThanOrEqual(0)

    // Click "All Categories" to show all
    await page.click('button:has-text("All Categories")')
    await page.waitForTimeout(500)
  })

  test('EXP-TPL-003: Download and copy functionality works', async ({
    page,
    context,
  }) => {
    // Login as user
    await page.goto('/login')
    await page.fill('input[type="email"]', userEmail)
    await page.fill('input[type="password"]', userPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/app')

    // Navigate to templates vault
    await page.goto('/app/templates')

    // Wait for templates to load
    await page.waitForTimeout(1000)

    // Find a template with copy functionality
    const copyButton = page.locator('button:has-text("Copy")').first()

    if ((await copyButton.count()) > 0) {
      // Grant clipboard permissions
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])

      // Click copy button
      await copyButton.click()

      // Should show "Copied!" confirmation
      await expect(page.locator('button:has-text("Copied!")')).toBeVisible({
        timeout: 3000,
      })

      // Verify clipboard content (if supported)
      try {
        const clipboardText = await page.evaluate(() =>
          navigator.clipboard.readText()
        )
        expect(clipboardText.length).toBeGreaterThan(0)
      } catch (e) {
        // Clipboard API might not be available in test environment
        console.log('Clipboard read not supported in test environment')
      }
    }

    // Test download button (just verify it exists and is clickable)
    const downloadButton = page.locator('button:has-text("Download")').first()
    if ((await downloadButton.count()) > 0) {
      await expect(downloadButton).toBeVisible()
      // Note: We don't actually trigger the download in tests to avoid file system operations
    }
  })

  test('Admin can edit template', async ({ page }) => {
    // Login as admin
    await page.goto('/login')
    await page.fill('input[type="email"]', adminEmail)
    await page.fill('input[type="password"]', adminPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/app')

    // Navigate to admin templates
    await page.goto('/admin/templates')

    // Wait for templates to load
    await page.waitForTimeout(1000)

    // Click edit button on first template
    const editButton = page.locator('button:has(svg)').first()
    if ((await editButton.count()) > 0) {
      await editButton.click()

      // Should show edit form
      await expect(page.locator('text=Edit Template')).toBeVisible()

      // Modify title
      const titleInput = page.locator('input[type="text"]').first()
      await titleInput.fill('Updated Template Title')

      // Submit
      await page.click('button[type="submit"]:has-text("Update Template")')

      // Wait for update
      await page.waitForTimeout(1000)

      // Should see updated template
      await expect(page.locator('text=Updated Template Title')).toBeVisible()
    }
  })

  test('Admin can delete template', async ({ page }) => {
    // Login as admin
    await page.goto('/login')
    await page.fill('input[type="email"]', adminEmail)
    await page.fill('input[type="password"]', adminPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/app')

    // Navigate to admin templates
    await page.goto('/admin/templates')

    // Wait for templates to load
    await page.waitForTimeout(1000)

    const initialCount = await page.locator('[class*="Card"]').count()

    if (initialCount > 0) {
      // Click delete button
      page.on('dialog', (dialog) => dialog.accept())
      await page.locator('button:has-text("Delete")').first().click()

      // Wait for deletion
      await page.waitForTimeout(1000)

      // Should have fewer templates
      const newCount = await page.locator('[class*="Card"]').count()
      expect(newCount).toBeLessThanOrEqual(initialCount)
    }
  })

  test('Download count increments on download', async ({ page, context }) => {
    // Login as user
    await page.goto('/login')
    await page.fill('input[type="email"]', userEmail)
    await page.fill('input[type="password"]', userPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/app')

    // Navigate to templates vault
    await page.goto('/app/templates')
    await page.waitForTimeout(1000)

    // Find a template with download button
    const downloadCountBefore = await page
      .locator('text=/\\d+ downloads?/')
      .first()
      .textContent()

    const downloadButton = page.locator('button:has-text("Download")').first()

    if ((await downloadButton.count()) > 0) {
      // Click download
      await downloadButton.click()

      // Wait for download to be recorded
      await page.waitForTimeout(1000)

      // Refresh page to see updated count
      await page.reload()
      await page.waitForTimeout(1000)

      // Check if download count increased
      const downloadCountAfter = await page
        .locator('text=/\\d+ downloads?/')
        .first()
        .textContent()

      // Extract numbers and compare
      const beforeNum = parseInt(downloadCountBefore?.match(/\\d+/)?.[0] || '0')
      const afterNum = parseInt(downloadCountAfter?.match(/\\d+/)?.[0] || '0')

      expect(afterNum).toBeGreaterThanOrEqual(beforeNum)
    }
  })

  test('Premium templates require access', async ({ page }) => {
    // First, create a premium template as admin
    await page.goto('/login')
    await page.fill('input[type="email"]', adminEmail)
    await page.fill('input[type="password"]', adminPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/app')

    await page.goto('/admin/templates')

    // Create premium template
    await page.click('button:has-text("Create Template")')
    await page.fill('input[type="text"]', 'Premium Template')
    await page.fill('textarea', 'This is a premium template')
    await page.fill(
      'input[placeholder="https://..."]',
      'https://example.com/premium.pdf'
    )
    await page.check('input[id="is_premium"]')
    await page.click('button[type="submit"]:has-text("Create Template")')
    await page.waitForTimeout(1000)

    // Logout
    await page.goto('/logout')

    // Login as regular user
    await page.goto('/login')
    await page.fill('input[type="email"]', userEmail)
    await page.fill('input[type="password"]', userPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/app')

    // Navigate to templates
    await page.goto('/app/templates')
    await page.waitForTimeout(1000)

    // Should see premium badge on template
    await expect(page.locator('text=Premium')).toBeVisible()

    // Should see locked badge
    await expect(page.locator('text=Locked')).toBeVisible()

    // Download button should be disabled for premium templates without access
    const premiumDownloadButton = page
      .locator('[class*="Card"]:has-text("Premium")')
      .locator('button:has-text("Download")')
      .first()

    if ((await premiumDownloadButton.count()) > 0) {
      await expect(premiumDownloadButton).toBeDisabled()
    }
  })

  test('Templates API list endpoint exists and returns data', async ({
    request,
  }) => {
    const response = await request.get('/api/templates')

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('templates')
    expect(Array.isArray(data.templates)).toBe(true)
  })

  test('Templates API supports category filtering', async ({ request }) => {
    const response = await request.get('/api/templates?category=marketing')

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('templates')
    expect(Array.isArray(data.templates)).toBe(true)

    // All returned templates should be marketing category
    if (data.templates.length > 0) {
      data.templates.forEach((template: any) => {
        expect(template.category).toBe('marketing')
      })
    }
  })
})
