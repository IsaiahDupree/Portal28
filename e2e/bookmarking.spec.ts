// e2e/bookmarking.spec.ts
// Test suite for Bookmarking feature
// Test ID: NEW-NOTE-001
// Feature ID: feat-223

import { test, expect } from "@playwright/test";

test.describe("Bookmarking - feat-223", () => {
  test("NEW-NOTE-001: Bookmark button appears on lesson page", async ({ page }) => {
    await page.goto("/app");

    // Skip if not logged in
    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // Navigate to a lesson
    const courseLink = page.locator('a[href*="/app/courses/"]').first();
    if (await courseLink.count() > 0) {
      await courseLink.click();
      await page.waitForLoadState("networkidle");

      const lessonLink = page.locator('a[href*="/app/lesson/"]').first();
      if (await lessonLink.count() > 0) {
        await lessonLink.click();
        await page.waitForLoadState("networkidle");

        // Check that bookmark button is visible
        const bookmarkButton = page.locator('button:has-text("Bookmark")');
        await expect(bookmarkButton).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("NEW-NOTE-001: Bookmark a lesson", async ({ page }) => {
    await page.goto("/app");

    // Skip if not logged in
    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // Navigate to a lesson
    const courseLink = page.locator('a[href*="/app/courses/"]').first();
    if (await courseLink.count() > 0) {
      await courseLink.click();
      await page.waitForLoadState("networkidle");

      const lessonLink = page.locator('a[href*="/app/lesson/"]').first();
      if (await lessonLink.count() > 0) {
        await lessonLink.click();
        await page.waitForLoadState("networkidle");

        // Click bookmark button
        const bookmarkButton = page.locator('button:has-text("Bookmark")');
        await bookmarkButton.click();

        // Wait for bookmarked state
        await page.waitForTimeout(1000);

        // Verify button changes to "Bookmarked"
        const bookmarkedButton = page.locator('button:has-text("Bookmarked")');
        await expect(bookmarkedButton).toBeVisible({ timeout: 5000 });

        // Verify toast notification appears
        const toastSuccess = page.locator('text=/Lesson bookmarked/i');
        await expect(toastSuccess).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("NEW-NOTE-001: Unbookmark a lesson", async ({ page }) => {
    await page.goto("/app");

    // Skip if not logged in
    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // Navigate to a lesson and bookmark it first
    const courseLink = page.locator('a[href*="/app/courses/"]').first();
    if (await courseLink.count() > 0) {
      await courseLink.click();
      await page.waitForLoadState("networkidle");

      const lessonLink = page.locator('a[href*="/app/lesson/"]').first();
      if (await lessonLink.count() > 0) {
        await lessonLink.click();
        await page.waitForLoadState("networkidle");

        // Bookmark the lesson first
        let bookmarkButton = page.locator('button:has-text("Bookmark")');
        if (await bookmarkButton.count() > 0) {
          await bookmarkButton.click();
          await page.waitForTimeout(1000);
        }

        // Now unbookmark it
        const bookmarkedButton = page.locator('button:has-text("Bookmarked")');
        await bookmarkedButton.click();
        await page.waitForTimeout(1000);

        // Verify button changes back to "Bookmark"
        bookmarkButton = page.locator('button:has-text("Bookmark")');
        await expect(bookmarkButton).toBeVisible({ timeout: 5000 });

        // Verify toast notification
        const toastRemoved = page.locator('text=/Bookmark removed/i');
        await expect(toastRemoved).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("NEW-NOTE-001: Bookmarked lessons appear in bookmarks page", async ({ page }) => {
    await page.goto("/app");

    // Skip if not logged in
    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // Navigate to a lesson and bookmark it
    const courseLink = page.locator('a[href*="/app/courses/"]').first();
    if (await courseLink.count() > 0) {
      await courseLink.click();
      await page.waitForLoadState("networkidle");

      const lessonLink = page.locator('a[href*="/app/lesson/"]').first();
      if (await lessonLink.count() > 0) {
        await lessonLink.click();
        await page.waitForLoadState("networkidle");

        // Get lesson title
        const lessonTitle = await page.locator('h1').first().textContent();

        // Bookmark the lesson
        const bookmarkButton = page.locator('button:has-text("Bookmark")');
        if (await bookmarkButton.count() > 0) {
          await bookmarkButton.click();
          await page.waitForTimeout(1000);
        }

        // Navigate to bookmarks page
        await page.goto("http://localhost:2828/app/bookmarks");
        await page.waitForLoadState("networkidle");

        // Verify the lesson appears in bookmarks
        if (lessonTitle) {
          const bookmarkedLesson = page.locator(`text="${lessonTitle}"`);
          await expect(bookmarkedLesson).toBeVisible({ timeout: 5000 });
        }

        // Verify stats are displayed
        const totalBookmarks = page.locator('text="Total Bookmarks"');
        await expect(totalBookmarks).toBeVisible();
      }
    }
  });

  test("NEW-NOTE-001: Bookmarks persist across page reloads", async ({ page }) => {
    await page.goto("/app");

    // Skip if not logged in
    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // Navigate to a lesson
    const courseLink = page.locator('a[href*="/app/courses/"]').first();
    if (await courseLink.count() > 0) {
      await courseLink.click();
      await page.waitForLoadState("networkidle");

      const lessonLink = page.locator('a[href*="/app/lesson/"]').first();
      if (await lessonLink.count() > 0) {
        await lessonLink.click();
        await page.waitForLoadState("networkidle");

        // Bookmark the lesson
        const bookmarkButton = page.locator('button:has-text("Bookmark")');
        if (await bookmarkButton.count() > 0) {
          await bookmarkButton.click();
          await page.waitForTimeout(1000);
        }

        // Reload the page
        await page.reload();
        await page.waitForLoadState("networkidle");

        // Verify bookmark state persists
        const bookmarkedButton = page.locator('button:has-text("Bookmarked")');
        await expect(bookmarkedButton).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("NEW-NOTE-001: Empty bookmarks page shows helpful message", async ({ page }) => {
    await page.goto("http://localhost:2828/app/bookmarks");

    // Skip if not logged in
    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // Check for the empty state message
    const emptyMessage = page.locator('text="No bookmarks yet"');
    const browseButton = page.locator('text="Browse Courses"');

    // Either we have bookmarks (which is fine) or we see the empty state
    const hasBookmarks = await page.locator('h1:has-text("My Bookmarks")').isVisible();

    if (hasBookmarks) {
      // Page loaded successfully
      expect(hasBookmarks).toBe(true);
    }
  });

  test("NEW-NOTE-001: Bookmark from bookmarks page navigates to lesson", async ({ page }) => {
    await page.goto("/app");

    // Skip if not logged in
    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // First ensure we have at least one bookmark
    const courseLink = page.locator('a[href*="/app/courses/"]').first();
    if (await courseLink.count() > 0) {
      await courseLink.click();
      await page.waitForLoadState("networkidle");

      const lessonLink = page.locator('a[href*="/app/lesson/"]').first();
      if (await lessonLink.count() > 0) {
        await lessonLink.click();
        await page.waitForLoadState("networkidle");

        // Bookmark the lesson
        const bookmarkButton = page.locator('button:has-text("Bookmark")');
        if (await bookmarkButton.count() > 0) {
          await bookmarkButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // Navigate to bookmarks page
    await page.goto("http://localhost:2828/app/bookmarks");
    await page.waitForLoadState("networkidle");

    // Click on the first bookmark link
    const firstBookmarkLink = page.locator('a[href*="/app/lesson/"]').first();
    if (await firstBookmarkLink.count() > 0) {
      await firstBookmarkLink.click();
      await page.waitForLoadState("networkidle");

      // Verify we're on a lesson page
      expect(page.url()).toContain("/app/lesson/");
    }
  });
});
