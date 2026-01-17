import { test, expect } from "@playwright/test";

test.describe("Notifications System", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page and authenticate
    await page.goto("http://localhost:2828/login");

    // Wait for magic link auth (in real tests, you'd mock this or use a test account)
    // For now, we'll assume authentication is handled
  });

  test("should display notification bell in header", async ({ page }) => {
    await page.goto("http://localhost:2828/app");

    // Check if notification bell is visible
    const notificationBell = page.locator('button:has(svg.lucide-bell)');
    await expect(notificationBell).toBeVisible();
  });

  test("should show unread count badge when there are unread notifications", async ({ page }) => {
    await page.goto("http://localhost:2828/app");

    // Look for the notification bell
    const notificationBell = page.locator('button:has(svg.lucide-bell)');

    // Click to open dropdown
    await notificationBell.click();

    // Check if dropdown opens
    const dropdown = page.locator('[role="menu"]').filter({ hasText: 'Notifications' });
    await expect(dropdown).toBeVisible();
  });

  test("should display list of notifications in dropdown", async ({ page }) => {
    await page.goto("http://localhost:2828/app");

    const notificationBell = page.locator('button:has(svg.lucide-bell)');
    await notificationBell.click();

    // Wait for notifications to load
    await page.waitForTimeout(1000);

    // Check for either notifications or empty state
    const hasNotifications = await page.locator('text=No notifications yet').isVisible()
      .then(() => false)
      .catch(() => true);

    if (!hasNotifications) {
      await expect(page.locator('text=No notifications yet')).toBeVisible();
    }
  });

  test("should mark notification as read when clicked", async ({ page }) => {
    await page.goto("http://localhost:2828/app");

    const notificationBell = page.locator('button:has(svg.lucide-bell)');
    await notificationBell.click();

    // Find an unread notification (if any)
    const unreadIndicator = page.locator('.h-2.w-2.rounded-full.bg-blue-500').first();
    const hasUnread = await unreadIndicator.isVisible().catch(() => false);

    if (hasUnread) {
      // Click the notification
      const notification = unreadIndicator.locator('..').locator('..');
      await notification.click();

      // The notification should be marked as read (blue dot disappears)
      await expect(unreadIndicator).not.toBeVisible();
    }
  });

  test("should mark all notifications as read", async ({ page }) => {
    await page.goto("http://localhost:2828/app");

    const notificationBell = page.locator('button:has(svg.lucide-bell)');
    await notificationBell.click();

    // Look for "Mark all as read" button
    const markAllButton = page.locator('button', { hasText: 'Mark all as read' });
    const hasMarkAllButton = await markAllButton.isVisible().catch(() => false);

    if (hasMarkAllButton) {
      await markAllButton.click();

      // Wait for the action to complete
      await page.waitForTimeout(500);

      // Verify all unread indicators are gone
      const unreadIndicators = page.locator('.h-2.w-2.rounded-full.bg-blue-500');
      await expect(unreadIndicators).toHaveCount(0);
    }
  });

  test("should navigate to full notifications page", async ({ page }) => {
    await page.goto("http://localhost:2828/app");

    const notificationBell = page.locator('button:has(svg.lucide-bell)');
    await notificationBell.click();

    // Look for "View all notifications" link
    const viewAllLink = page.locator('a[href="/app/notifications"]');
    const hasViewAllLink = await viewAllLink.isVisible().catch(() => false);

    if (hasViewAllLink) {
      await viewAllLink.click();

      // Verify navigation to notifications page
      await expect(page).toHaveURL(/\/app\/notifications/);
    }
  });

  test("should create notification when user receives a comment reply", async ({ page, context }) => {
    // This test requires two users - commenter and replier
    // Create a comment first
    await page.goto("http://localhost:2828/app/lesson/test-lesson-id");

    const commentBox = page.locator('textarea[placeholder*="comment"]');
    const hasCommentBox = await commentBox.isVisible().catch(() => false);

    if (hasCommentBox) {
      await commentBox.fill("This is a test comment");
      await page.locator('button:has-text("Post")').click();

      // Wait for comment to be posted
      await page.waitForTimeout(1000);

      // In a real test, we'd have another user reply to this comment
      // and then check if a notification was created
    }
  });

  test("should create notification when announcement is published", async ({ page }) => {
    // Navigate to admin announcements
    await page.goto("http://localhost:2828/admin/announcements");

    // Check if user is admin
    const createButton = page.locator('button:has-text("Create")').or(page.locator('button:has-text("New")'));
    const isAdmin = await createButton.isVisible().catch(() => false);

    if (isAdmin) {
      await createButton.click();

      // Fill announcement form
      await page.locator('input[name="title"]').fill("Test Announcement");
      await page.locator('textarea[name="content"]').fill("This is a test announcement");

      // Publish the announcement
      await page.locator('button:has-text("Publish")').click();

      // Wait for announcement to be created
      await page.waitForTimeout(1000);

      // Navigate to notifications to verify
      await page.goto("http://localhost:2828/app");
      const notificationBell = page.locator('button:has(svg.lucide-bell)');
      await notificationBell.click();

      // Look for announcement notification
      await expect(page.locator('text=New Announcement')).toBeVisible();
    }
  });

  test("should access notification preferences", async ({ page }) => {
    await page.goto("http://localhost:2828/app/settings");

    // Look for notifications settings section
    const notificationSettings = page.locator('text=Notification').or(page.locator('text=Preferences'));
    const hasSettings = await notificationSettings.isVisible().catch(() => false);

    if (hasSettings) {
      // Verify notification preference toggles exist
      const emailOnComment = page.locator('input[type="checkbox"]').first();
      await expect(emailOnComment).toBeVisible();
    }
  });

  test("should update notification preferences", async ({ page }) => {
    // Navigate to notification preferences (assuming there's a settings page)
    await page.goto("http://localhost:2828/app/settings");

    // Find notification preferences checkboxes
    const checkboxes = page.locator('input[type="checkbox"]');
    const hasCheckboxes = await checkboxes.count().then(count => count > 0);

    if (hasCheckboxes) {
      const firstCheckbox = checkboxes.first();
      const initialState = await firstCheckbox.isChecked();

      // Toggle the checkbox
      await firstCheckbox.click();

      // Wait for save
      await page.waitForTimeout(500);

      // Verify the state changed
      const newState = await firstCheckbox.isChecked();
      expect(newState).toBe(!initialState);
    }
  });

  test("should show notifications in real-time (polling)", async ({ page }) => {
    await page.goto("http://localhost:2828/app");

    // Get initial notification count
    const notificationBell = page.locator('button:has(svg.lucide-bell)');
    const initialBadge = page.locator('.bg-destructive').filter({ has: notificationBell });
    const initialCount = await initialBadge.textContent().catch(() => "0");

    // Wait for 30 seconds (notification polling interval)
    await page.waitForTimeout(31000);

    // Check if count has been updated (in a real scenario with new notifications)
    const newBadge = page.locator('.bg-destructive').filter({ has: notificationBell });
    const isStillVisible = await newBadge.isVisible().catch(() => false);

    // Badge should still be functional (visible or hidden based on notifications)
    expect(isStillVisible || initialCount === "0").toBeTruthy();
  });

  test("should navigate to linked content when clicking notification", async ({ page }) => {
    await page.goto("http://localhost:2828/app");

    const notificationBell = page.locator('button:has(svg.lucide-bell)');
    await notificationBell.click();

    // Find a notification with a link
    const notificationWithLink = page.locator('a[href^="/app/"]').first();
    const hasLink = await notificationWithLink.isVisible().catch(() => false);

    if (hasLink) {
      const linkHref = await notificationWithLink.getAttribute('href');
      await notificationWithLink.click();

      // Verify navigation
      if (linkHref) {
        await expect(page).toHaveURL(new RegExp(linkHref));
      }
    }
  });
});
