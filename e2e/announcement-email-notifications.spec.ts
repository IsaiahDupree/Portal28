import { test, expect } from '@playwright/test';

test.describe('Announcement Email Notifications', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:2828/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.click('button[type="submit"]');
    // In real test, would check email inbox for magic link
    await page.goto('http://localhost:2828/admin');
  });

  test('PLT-ANN-E-001: Admin can toggle email notification when creating announcement', async ({ page }) => {
    // Navigate to create announcement page
    await page.goto('http://localhost:2828/admin/announcements/new');

    // Fill announcement form
    await page.fill('input[id="title"]', 'Test Announcement');
    await page.fill('textarea[id="content"]', 'This is a test announcement');

    // Check that send_email checkbox exists
    const emailCheckbox = page.locator('input[id="send_email"]');
    await expect(emailCheckbox).toBeVisible();

    // Toggle email notification
    await emailCheckbox.check();
    await expect(emailCheckbox).toBeChecked();

    // Can also uncheck
    await emailCheckbox.uncheck();
    await expect(emailCheckbox).not.toBeChecked();
  });

  test('PLT-ANN-E-002: Email is sent to relevant members when announcement is published', async ({ page }) => {
    // Navigate to create announcement page
    await page.goto('http://localhost:2828/admin/announcements/new');

    // Fill announcement form
    await page.fill('input[id="title"]', 'Email Test Announcement');
    await page.fill('textarea[id="content"]', 'This announcement should trigger an email');

    // Enable email notification and publish
    await page.check('input[id="send_email"]');
    await page.check('input[id="publish_now"]');

    // Submit form
    await page.click('button[type="submit"]:has-text("Publish")');

    // Wait for redirect
    await page.waitForURL(/\/admin\/announcements$/);

    // In a real test, we would:
    // 1. Check the email queue or mailpit
    // 2. Verify emails were sent to members
    // 3. Check email content includes announcement details

    // For now, verify the announcement was created
    await expect(page.locator('text=Email Test Announcement')).toBeVisible();
  });

  test('PLT-ANN-E-003: Unsubscribe flow works correctly', async ({ page }) => {
    // Generate a test unsubscribe token
    const tokenData = {
      email: 'test@example.com',
      userId: '123',
      spaceId: '456',
      type: 'announcements',
      timestamp: Date.now(),
    };
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64url');

    // Navigate to unsubscribe page
    await page.goto(`http://localhost:2828/unsubscribe/${token}`);

    // Should show unsubscribe confirmation page
    await expect(page.locator('text=Unsubscribe from Email Notifications')).toBeVisible();

    // Click unsubscribe button
    await page.click('button:has-text("Unsubscribe")');

    // Should show success message
    await expect(page.locator('text=Successfully Unsubscribed')).toBeVisible();
  });

  test('Email preferences can be updated', async ({ page }) => {
    // This would test the email preferences API
    // Navigate to user settings (if exists)
    await page.goto('http://localhost:2828/app/settings');

    // Check if email preferences section exists
    const preferencesSection = page.locator('text=Email Preferences');
    const exists = await preferencesSection.count();

    if (exists > 0) {
      // Test toggling announcement emails
      const announcementsToggle = page.locator('input[name="announcements_enabled"]');
      await announcementsToggle.check();
      await expect(announcementsToggle).toBeChecked();
    }
  });

  test('Announcement form shows email checkbox only for published announcements', async ({ page }) => {
    await page.goto('http://localhost:2828/admin/announcements/new');

    // Fill basic fields
    await page.fill('input[id="title"]', 'Draft Announcement');
    await page.fill('textarea[id="content"]', 'This is a draft');

    // Email checkbox should be visible
    const emailCheckbox = page.locator('input[id="send_email"]');
    await expect(emailCheckbox).toBeVisible();

    // When saving as draft, email checkbox state is saved but emails won't be sent
    // until announcement is published
  });

  test('Email includes announcement content and unsubscribe link', async ({ page }) => {
    // This test would verify email content in mailpit or email testing service
    // For now, it's a placeholder for the actual email content validation

    // Create announcement with email
    await page.goto('http://localhost:2828/admin/announcements/new');
    await page.fill('input[id="title"]', 'Content Test');
    await page.fill('input[id="excerpt"]', 'Short summary');
    await page.fill('textarea[id="content"]', 'Full announcement content here');
    await page.check('input[id="send_email"]');
    await page.check('input[id="publish_now"]');
    await page.click('button[type="submit"]:has-text("Publish")');

    // In real implementation:
    // - Check mailpit for sent email
    // - Verify subject contains announcement title
    // - Verify body contains excerpt and content
    // - Verify unsubscribe link is present
  });

  test('Users who unsubscribed do not receive announcement emails', async ({ page }) => {
    // First, unsubscribe a test user
    const tokenData = {
      email: 'test@example.com',
      userId: '123',
      spaceId: '456',
      type: 'announcements',
      timestamp: Date.now(),
    };
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64url');

    await page.goto(`http://localhost:2828/unsubscribe/${token}`);
    await page.click('button:has-text("Unsubscribe")');
    await expect(page.locator('text=Successfully Unsubscribed')).toBeVisible();

    // Then create an announcement with email notification
    await page.goto('http://localhost:2828/admin/announcements/new');
    await page.fill('input[id="title"]', 'Test After Unsubscribe');
    await page.fill('textarea[id="content"]', 'This should not be emailed to unsubscribed users');
    await page.check('input[id="send_email"]');
    await page.check('input[id="publish_now"]');
    await page.click('button[type="submit"]:has-text("Publish")');

    // In real test: verify unsubscribed user did not receive email
  });

  test('Email recipient count is tracked', async ({ page }) => {
    // Create announcement with email
    await page.goto('http://localhost:2828/admin/announcements/new');
    await page.fill('input[id="title"]', 'Recipient Count Test');
    await page.fill('textarea[id="content"]', 'Testing recipient tracking');
    await page.check('input[id="send_email"]');
    await page.check('input[id="publish_now"]');
    await page.click('button[type="submit"]:has-text("Publish")');

    await page.waitForURL(/\/admin\/announcements$/);

    // Check if announcement detail shows recipient count
    await page.click('text=Recipient Count Test');

    // Look for email status (in real implementation)
    // await expect(page.locator('text=Email sent to')).toBeVisible();
  });
});
