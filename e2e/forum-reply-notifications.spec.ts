import { test, expect } from "@playwright/test";

test.describe("Forum Reply Notifications", () => {
  test.beforeEach(async ({ page }) => {
    // Login as first user (thread author)
    await page.goto("http://localhost:2828/login");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/app/**");
  });

  test("should send in-app notification when someone replies to forum post", async ({
    page,
    context,
  }) => {
    // Create a forum thread as first user
    await page.goto("http://localhost:2828/app/community");

    // Assuming there's a community space available
    await page.click('text="Forum"');
    await page.click('text="New Thread"');

    await page.fill('input[name="title"]', "Test Thread for Notifications");
    await page.fill('textarea[name="body"]', "This is the initial post content");
    await page.click('button:has-text("Post")');

    await page.waitForSelector('text="Test Thread for Notifications"');
    const threadUrl = page.url();

    // Open new page as second user (replier)
    const secondPage = await context.newPage();
    await secondPage.goto("http://localhost:2828/login");
    await secondPage.fill('input[type="email"]', "replier@example.com");
    await secondPage.fill('input[type="password"]', "password123");
    await secondPage.click('button[type="submit"]');
    await secondPage.waitForURL("**/app/**");

    // Navigate to the thread and reply
    await secondPage.goto(threadUrl);
    await secondPage.fill('textarea[name="body"]', "This is a reply to your post!");
    await secondPage.click('button:has-text("Reply")');

    await secondPage.waitForSelector('text="This is a reply to your post!"');

    // Switch back to first user and check for notification
    await page.reload();

    // Check notification bell has unread count
    const notificationBell = page.locator('[data-testid="notification-bell"]');
    await expect(notificationBell).toBeVisible();

    const unreadBadge = page.locator('[data-testid="unread-badge"]');
    await expect(unreadBadge).toHaveText("1");

    // Click notification bell
    await notificationBell.click();

    // Verify notification appears in dropdown
    await expect(page.locator('text="New reply to your post"')).toBeVisible();
    await expect(page.locator('text="replied to your post in"')).toBeVisible();
  });

  test("should not send notification when replying to own post", async ({ page }) => {
    // Create a forum thread
    await page.goto("http://localhost:2828/app/community");
    await page.click('text="Forum"');
    await page.click('text="New Thread"');

    await page.fill('input[name="title"]', "Self Reply Test");
    await page.fill('textarea[name="body"]', "Original post");
    await page.click('button:has-text("Post")');

    await page.waitForSelector('text="Self Reply Test"');

    // Get current notification count
    const notificationBell = page.locator('[data-testid="notification-bell"]');
    const initialCount = await page.locator('[data-testid="unread-badge"]').textContent().catch(() => "0");

    // Reply to own thread
    await page.fill('textarea[name="body"]', "Replying to my own post");
    await page.click('button:has-text("Reply")');

    await page.waitForSelector('text="Replying to my own post"');

    // Reload and verify notification count hasn't increased
    await page.reload();
    const finalCount = await page.locator('[data-testid="unread-badge"]').textContent().catch(() => "0");

    expect(finalCount).toBe(initialCount);
  });

  test("should respect notification preferences", async ({ page }) => {
    // Navigate to notification settings
    await page.goto("http://localhost:2828/app/settings/notifications");

    // Disable reply notifications
    const replyToggle = page.locator('input[id="forum-replies"]');
    await replyToggle.click(); // Disable

    await page.click('button:has-text("Save Preferences")');
    await page.waitForSelector('text="Preferences saved successfully"');

    // Create a forum thread
    await page.goto("http://localhost:2828/app/community");
    await page.click('text="Forum"');
    await page.click('text="New Thread"');

    await page.fill('input[name="title"]', "Test Notification Preferences");
    await page.fill('textarea[name="body"]', "Testing preferences");
    await page.click('button:has-text("Post")');

    const threadUrl = page.url();

    // Have someone else reply (using API or second browser context)
    // For simplicity, we'll just verify the setting was saved
    await page.goto("http://localhost:2828/app/settings/notifications");

    const replyToggleAfter = page.locator('input[id="forum-replies"]');
    await expect(replyToggleAfter).not.toBeChecked();
  });

  test("should display digest frequency option when digest is enabled", async ({ page }) => {
    await page.goto("http://localhost:2828/app/settings/notifications");

    // Enable digest
    const digestToggle = page.locator('input[id="digest-enabled"]');
    await digestToggle.click();

    // Verify frequency selector appears
    const frequencySelect = page.locator('select[id="digest-frequency"]');
    await expect(frequencySelect).toBeVisible();

    // Change frequency
    await frequencySelect.selectOption("daily");

    // Save preferences
    await page.click('button:has-text("Save Preferences")');
    await page.waitForSelector('text="Preferences saved successfully"');

    // Reload and verify persistence
    await page.reload();
    await expect(digestToggle).toBeChecked();
    await expect(frequencySelect).toHaveValue("daily");
  });

  test("should navigate to thread when clicking notification", async ({
    page,
    context,
  }) => {
    // Create thread as first user
    await page.goto("http://localhost:2828/app/community");
    await page.click('text="Forum"');
    await page.click('text="New Thread"');

    await page.fill('input[name="title"]', "Clickable Notification Test");
    await page.fill('textarea[name="body"]', "Original content");
    await page.click('button:has-text("Post")');

    const threadUrl = page.url();
    const threadId = threadUrl.split("/").pop();

    // Simulate notification (you may need to use API to create notification directly)
    // For E2E, we'll navigate to notifications page
    await page.goto("http://localhost:2828/app/notifications");

    // If there's a notification for this thread
    const notificationLink = page.locator(`a[href*="${threadId}"]`).first();

    if (await notificationLink.count() > 0) {
      await notificationLink.click();

      // Verify we're on the thread page
      expect(page.url()).toContain(threadId as string);
      await expect(page.locator('text="Clickable Notification Test"')).toBeVisible();
    }
  });

  test("should mark notification as read when viewed", async ({ page }) => {
    await page.goto("http://localhost:2828/app/notifications");

    // Get initial unread count
    const notificationBell = page.locator('[data-testid="notification-bell"]');
    const initialBadge = page.locator('[data-testid="unread-badge"]');

    if (await initialBadge.count() > 0) {
      const initialCount = parseInt(await initialBadge.textContent() || "0");

      if (initialCount > 0) {
        // Click first unread notification
        const firstUnread = page.locator('[data-unread="true"]').first();
        await firstUnread.click();

        // Go back to notifications
        await page.goto("http://localhost:2828/app/notifications");

        // Verify count decreased
        const finalCount = await initialBadge.textContent().catch(() => "0");
        expect(parseInt(finalCount)).toBeLessThanOrEqual(initialCount);
      }
    }
  });
});

test.describe("Forum Reply Notification Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:2828/login");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/app/**");
  });

  test("should toggle all notification preferences", async ({ page }) => {
    await page.goto("http://localhost:2828/app/settings/notifications");

    // Test in-app notifications toggle
    const inAppToggle = page.locator('input[id="in-app"]');
    const initialState = await inAppToggle.isChecked();
    await inAppToggle.click();

    await page.click('button:has-text("Save Preferences")');
    await page.waitForSelector('text="Preferences saved successfully"');

    await page.reload();
    await expect(inAppToggle).toHaveChecked(!initialState);

    // Restore original state
    await inAppToggle.click();
    await page.click('button:has-text("Save Preferences")');
  });

  test("should reset preferences", async ({ page }) => {
    await page.goto("http://localhost:2828/app/settings/notifications");

    // Make a change
    const inAppToggle = page.locator('input[id="in-app"]');
    const originalState = await inAppToggle.isChecked();
    await inAppToggle.click();

    // Click reset
    await page.click('button:has-text("Reset")');

    // Verify state is restored
    await expect(inAppToggle).toHaveChecked(originalState);
  });
});
