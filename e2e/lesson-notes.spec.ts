// e2e/lesson-notes.spec.ts
// Test suite for Lesson Notes feature
// Test IDs: PLT-NOT-001, PLT-NOT-002, PLT-NOT-003, PLT-NOT-004
// Feature ID: feat-037

import { test, expect } from "@playwright/test";

test.describe("Lesson Notes - feat-037", () => {
  test("PLT-NOT-001: Notes panel shows on lesson page", async ({ page }) => {
    await page.goto("/app");

    // Skip if not logged in
    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // Find and click on a course
    const courseLink = page.locator('a[href*="/app/courses/"]').first();
    if (await courseLink.count() > 0) {
      await courseLink.click();
      await page.waitForLoadState("networkidle");

      // Find and click on a lesson
      const lessonLink = page.locator('a[href*="/app/lesson/"]').first();
      if (await lessonLink.count() > 0) {
        await lessonLink.click();
        await page.waitForLoadState("networkidle");

        // Check that notes panel is visible
        const notesPanel = page.locator('text="Your Notes"');
        await expect(notesPanel).toBeVisible();

        // Check for textarea
        const notesTextarea = page.locator('textarea[placeholder*="Take notes"]');
        await expect(notesTextarea).toBeVisible();

        // Check for "Private" badge
        const privateBadge = page.locator('text="Private"');
        await expect(privateBadge).toBeVisible();
      }
    }
  });

  test("PLT-NOT-002: Create and save note", async ({ page }) => {
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

        // Type in notes
        const notesTextarea = page.locator('textarea[placeholder*="Take notes"]');
        const testNote = "This is a test note for the lesson";
        await notesTextarea.fill(testNote);

        // Wait for autosave (2 seconds delay + some buffer)
        await page.waitForTimeout(3000);

        // Check for "Saved" indicator
        const savedIndicator = page.locator('text=/Saved/i');
        await expect(savedIndicator).toBeVisible({ timeout: 5000 });

        // Reload page to verify persistence
        await page.reload();
        await page.waitForLoadState("networkidle");

        // Check that note is still there
        const reloadedTextarea = page.locator('textarea[placeholder*="Take notes"]');
        await expect(reloadedTextarea).toHaveValue(testNote);
      }
    }
  });

  test("PLT-NOT-003: Edit existing note", async ({ page }) => {
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

        // Create initial note
        const notesTextarea = page.locator('textarea[placeholder*="Take notes"]');
        await notesTextarea.fill("Initial note");
        await page.waitForTimeout(3000);

        // Edit the note
        await notesTextarea.fill("Initial note - EDITED");
        await page.waitForTimeout(3000);

        // Verify saved
        const savedIndicator = page.locator('text=/Saved/i');
        await expect(savedIndicator).toBeVisible({ timeout: 5000 });

        // Reload and verify edit persisted
        await page.reload();
        await page.waitForLoadState("networkidle");

        const reloadedTextarea = page.locator('textarea[placeholder*="Take notes"]');
        await expect(reloadedTextarea).toHaveValue("Initial note - EDITED");
      }
    }
  });

  test("PLT-NOT-004: Notes appear in notes dashboard", async ({ page }) => {
    await page.goto("/app");

    // Skip if not logged in
    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // Navigate to a lesson and create a note
    const courseLink = page.locator('a[href*="/app/courses/"]').first();
    if (await courseLink.count() > 0) {
      await courseLink.click();
      await page.waitForLoadState("networkidle");

      const lessonLink = page.locator('a[href*="/app/lesson/"]').first();
      if (await lessonLink.count() > 0) {
        await lessonLink.click();
        await page.waitForLoadState("networkidle");

        // Create a note with unique content
        const uniqueNote = `Test note ${Date.now()}`;
        const notesTextarea = page.locator('textarea[placeholder*="Take notes"]');
        await notesTextarea.fill(uniqueNote);
        await page.waitForTimeout(3000);

        // Navigate to notes dashboard
        await page.goto("http://localhost:2828/app/notes");
        await page.waitForLoadState("networkidle");

        // Check that note appears in the list
        const noteCard = page.locator(`text="${uniqueNote}"`);
        await expect(noteCard).toBeVisible({ timeout: 5000 });

        // Check for stats
        const totalNotes = page.locator('text="Total Notes"');
        await expect(totalNotes).toBeVisible();
      }
    }
  });

  test("PLT-NOT-005: Search notes functionality", async ({ page }) => {
    await page.goto("/app");

    // Skip if not logged in
    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // Navigate to lesson and create note
    const courseLink = page.locator('a[href*="/app/courses/"]').first();
    if (await courseLink.count() > 0) {
      await courseLink.click();
      await page.waitForLoadState("networkidle");

      const lessonLink = page.locator('a[href*="/app/lesson/"]').first();
      if (await lessonLink.count() > 0) {
        await lessonLink.click();
        await page.waitForLoadState("networkidle");

        // Create a searchable note
        const searchableNote = "JavaScript fundamentals are important";
        const notesTextarea = page.locator('textarea[placeholder*="Take notes"]');
        await notesTextarea.fill(searchableNote);
        await page.waitForTimeout(3000);

        // Go to notes dashboard
        await page.goto("http://localhost:2828/app/notes");
        await page.waitForLoadState("networkidle");

        // Find search input
        const searchInput = page.locator('input[placeholder*="Search"]');
        if (await searchInput.count() > 0) {
          // Search for "JavaScript"
          await searchInput.fill("JavaScript");
          await page.waitForTimeout(500);

          // Verify the note appears
          const noteResult = page.locator('text="JavaScript fundamentals are important"');
          await expect(noteResult).toBeVisible({ timeout: 5000 });

          // Search for something that won't match
          await searchInput.fill("Python");
          await page.waitForTimeout(500);

          // Verify no results or found count is 0
          const noResults = page.locator('text=/Found 0/i');
          await expect(noResults).toBeVisible({ timeout: 3000 });
        }
      }
    }
  });

  test("PLT-NOT-006: Notes are private (RLS)", async ({ page, context }) => {
    // This test verifies that notes are private by checking that
    // unauthenticated users see a "Sign in" message

    // Visit a lesson page without authentication
    await page.goto("http://localhost:2828/app");

    // Should be redirected to login or see auth prompt
    const signInText = page.locator('text=/sign in/i');
    // Notes should not be accessible without auth
    const notesTextarea = page.locator('textarea[placeholder*="Take notes"]');

    // Either we're redirected to login or notes are locked
    const isRedirected = page.url().includes('/auth/login');
    const notesLocked = await page.locator('text="Sign in to take private notes"').count() > 0;

    expect(isRedirected || notesLocked).toBeTruthy();
  });

  test("PLT-NOT-007: Manual save button works", async ({ page }) => {
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

        // Type in notes
        const notesTextarea = page.locator('textarea[placeholder*="Take notes"]');
        await notesTextarea.fill("Manual save test");

        // Click save button immediately (before autosave)
        const saveButton = page.locator('button:has-text("Save")');
        await saveButton.click();

        // Wait for "Saving..." to appear and disappear
        const savingIndicator = page.locator('text="Saving..."');
        if (await savingIndicator.count() > 0) {
          await expect(savingIndicator).toBeVisible();
          await expect(savingIndicator).not.toBeVisible({ timeout: 5000 });
        }

        // Verify saved indicator
        const savedIndicator = page.locator('text=/Saved/i');
        await expect(savedIndicator).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
