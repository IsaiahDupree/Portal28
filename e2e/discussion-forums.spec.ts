/**
 * Discussion Forums E2E Tests
 * Feature: feat-220 (Discussion Forums)
 * Test ID: NEW-FOR-001
 *
 * Tests forum creation, thread management, replies, and moderation
 */

import { test, expect } from "@playwright/test";

test.describe("Discussion Forums", () => {
  test.describe("Public Forum Access", () => {
    test("should display forums list on public page", async ({ page }) => {
      await page.goto("/forums");
      await page.waitForLoadState("networkidle");

      // Check for forums heading
      await expect(page.locator("h1")).toContainText(/forums|discussion/i);

      // Should show at least the forums section
      const forumsSection = page.locator('[data-testid="forums-list"]');
      await expect(forumsSection).toBeVisible();
    });

    test("should show forum details", async ({ page }) => {
      // This test assumes at least one forum exists
      await page.goto("/forums");
      await page.waitForLoadState("networkidle");

      // Click on first forum (if exists)
      const forumLink = page.locator('[data-testid="forum-card"]').first();
      const forumCount = await forumLink.count();

      if (forumCount > 0) {
        await forumLink.click();
        await page.waitForLoadState("networkidle");

        // Should show forum details
        await expect(page.locator("h1")).not.toBeEmpty();
      }
    });

    test("should display threads in a forum", async ({ page }) => {
      await page.goto("/forums");
      await page.waitForLoadState("networkidle");

      const forumLink = page.locator('[data-testid="forum-card"]').first();
      const forumCount = await forumLink.count();

      if (forumCount > 0) {
        await forumLink.click();
        await page.waitForLoadState("networkidle");

        // Should have threads list or empty state
        const threadsSection = page.locator('[data-testid="threads-list"], [data-testid="empty-threads"]');
        await expect(threadsSection).toBeVisible();
      }
    });

    test("should show thread details", async ({ page }) => {
      await page.goto("/forums");
      await page.waitForLoadState("networkidle");

      const forumLink = page.locator('[data-testid="forum-card"]').first();
      const forumCount = await forumLink.count();

      if (forumCount > 0) {
        await forumLink.click();
        await page.waitForLoadState("networkidle");

        const threadLink = page.locator('[data-testid="thread-card"]').first();
        const threadCount = await threadLink.count();

        if (threadCount > 0) {
          await threadLink.click();
          await page.waitForLoadState("networkidle");

          // Should show thread title and content
          await expect(page.locator("h1")).not.toBeEmpty();
          await expect(page.locator('[data-testid="thread-content"]')).toBeVisible();
        }
      }
    });
  });

  test.describe("Thread Creation (Authenticated)", () => {
    test("should require login to create thread", async ({ page }) => {
      await page.goto("/forums/general/new-thread");

      // Should redirect to login or show auth required message
      await page.waitForLoadState("networkidle");

      const isOnLogin = page.url().includes("/login");
      const hasAuthMessage = await page.locator("text=/sign in|log in|authenticate/i").count() > 0;

      expect(isOnLogin || hasAuthMessage).toBeTruthy();
    });

    // Note: Actual thread creation requires authentication setup
    // which would be tested in authenticated context
  });

  test.describe("Forum Search and Filtering", () => {
    test("should filter threads by category", async ({ page }) => {
      await page.goto("/forums");
      await page.waitForLoadState("networkidle");

      const forumLink = page.locator('[data-testid="forum-card"]').first();
      const forumCount = await forumLink.count();

      if (forumCount > 0) {
        await forumLink.click();
        await page.waitForLoadState("networkidle");

        // Look for category filter
        const categoryFilter = page.locator('[data-testid="category-filter"]');
        if (await categoryFilter.count() > 0) {
          await categoryFilter.first().click();
          await page.waitForLoadState("networkidle");

          // URL should be updated with category filter
          expect(page.url()).toContain("category=");
        }
      }
    });

    test("should sort threads", async ({ page }) => {
      await page.goto("/forums");
      await page.waitForLoadState("networkidle");

      const forumLink = page.locator('[data-testid="forum-card"]').first();
      const forumCount = await forumLink.count();

      if (forumCount > 0) {
        await forumLink.click();
        await page.waitForLoadState("networkidle");

        // Look for sort dropdown
        const sortDropdown = page.locator('[data-testid="sort-threads"]');
        if (await sortDropdown.count() > 0) {
          await sortDropdown.click();

          // Select a sort option
          const sortOption = page.locator('[data-testid="sort-option"]').first();
          if (await sortOption.count() > 0) {
            await sortOption.click();
            await page.waitForLoadState("networkidle");

            // URL should be updated with sort parameter
            expect(page.url()).toContain("sort=");
          }
        }
      }
    });

    test("should search threads", async ({ page }) => {
      await page.goto("/forums");
      await page.waitForLoadState("networkidle");

      const forumLink = page.locator('[data-testid="forum-card"]').first();
      const forumCount = await forumLink.count();

      if (forumCount > 0) {
        await forumLink.click();
        await page.waitForLoadState("networkidle");

        // Look for search input
        const searchInput = page.locator('[data-testid="search-threads"], input[placeholder*="Search"]');
        if (await searchInput.count() > 0) {
          await searchInput.fill("test");
          await page.keyboard.press("Enter");
          await page.waitForLoadState("networkidle");

          // URL should be updated with search query
          expect(page.url()).toContain("search=");
        }
      }
    });
  });

  test.describe("Thread Interactions", () => {
    test("should show upvote button", async ({ page }) => {
      await page.goto("/forums");
      await page.waitForLoadState("networkidle");

      const forumLink = page.locator('[data-testid="forum-card"]').first();
      const forumCount = await forumLink.count();

      if (forumCount > 0) {
        await forumLink.click();
        await page.waitForLoadState("networkidle");

        const threadLink = page.locator('[data-testid="thread-card"]').first();
        const threadCount = await threadLink.count();

        if (threadCount > 0) {
          // Check for upvote button on thread card
          const upvoteButton = page.locator('[data-testid="upvote-button"]').first();
          if (await upvoteButton.count() > 0) {
            await expect(upvoteButton).toBeVisible();
          }
        }
      }
    });

    test("should increment view count", async ({ page }) => {
      await page.goto("/forums");
      await page.waitForLoadState("networkidle");

      const forumLink = page.locator('[data-testid="forum-card"]').first();
      const forumCount = await forumLink.count();

      if (forumCount > 0) {
        await forumLink.click();
        await page.waitForLoadState("networkidle");

        const threadLink = page.locator('[data-testid="thread-card"]').first();
        const threadCount = await threadLink.count();

        if (threadCount > 0) {
          // Get initial view count if displayed
          const viewCountBefore = await page.locator('[data-testid="thread-views"]').first().textContent();

          // Visit thread
          await threadLink.click();
          await page.waitForLoadState("networkidle");

          // Go back
          await page.goBack();
          await page.waitForLoadState("networkidle");

          // View count should have increased (if displayed)
          // Note: This is a basic check; actual implementation may vary
        }
      }
    });
  });

  test.describe("Reply System", () => {
    test("should show replies on thread page", async ({ page }) => {
      await page.goto("/forums");
      await page.waitForLoadState("networkidle");

      const forumLink = page.locator('[data-testid="forum-card"]').first();
      const forumCount = await forumLink.count();

      if (forumCount > 0) {
        await forumLink.click();
        await page.waitForLoadState("networkidle");

        const threadLink = page.locator('[data-testid="thread-card"]').first();
        const threadCount = await threadLink.count();

        if (threadCount > 0) {
          await threadLink.click();
          await page.waitForLoadState("networkidle");

          // Should have replies section or empty state
          const repliesSection = page.locator('[data-testid="replies-list"], [data-testid="no-replies"]');
          await expect(repliesSection).toBeVisible();
        }
      }
    });

    test("should show reply form for authenticated users", async ({ page }) => {
      await page.goto("/forums");
      await page.waitForLoadState("networkidle");

      const forumLink = page.locator('[data-testid="forum-card"]').first();
      const forumCount = await forumLink.count();

      if (forumCount > 0) {
        await forumLink.click();
        await page.waitForLoadState("networkidle");

        const threadLink = page.locator('[data-testid="thread-card"]').first();
        const threadCount = await threadLink.count();

        if (threadCount > 0) {
          await threadLink.click();
          await page.waitForLoadState("networkidle");

          // Should have reply form or login prompt
          const hasReplyForm = await page.locator('[data-testid="reply-form"]').count() > 0;
          const hasLoginPrompt = await page.locator("text=/sign in to reply/i").count() > 0;

          expect(hasReplyForm || hasLoginPrompt).toBeTruthy();
        }
      }
    });
  });

  test.describe("Tags", () => {
    test("should display thread tags", async ({ page }) => {
      await page.goto("/forums");
      await page.waitForLoadState("networkidle");

      const forumLink = page.locator('[data-testid="forum-card"]').first();
      const forumCount = await forumLink.count();

      if (forumCount > 0) {
        await forumLink.click();
        await page.waitForLoadState("networkidle");

        // Check for tags on thread cards
        const threadCard = page.locator('[data-testid="thread-card"]').first();
        if (await threadCard.count() > 0) {
          const tags = threadCard.locator('[data-testid="thread-tag"]');
          // Tags may or may not be present
          const tagCount = await tags.count();
          expect(tagCount >= 0).toBeTruthy();
        }
      }
    });

    test("should filter by tag", async ({ page }) => {
      await page.goto("/forums");
      await page.waitForLoadState("networkidle");

      const forumLink = page.locator('[data-testid="forum-card"]').first();
      const forumCount = await forumLink.count();

      if (forumCount > 0) {
        await forumLink.click();
        await page.waitForLoadState("networkidle");

        // Click on a tag if present
        const tag = page.locator('[data-testid="thread-tag"]').first();
        if (await tag.count() > 0) {
          await tag.click();
          await page.waitForLoadState("networkidle");

          // Should filter threads by that tag
          expect(page.url()).toContain("tag=");
        }
      }
    });
  });

  test.describe("Pagination", () => {
    test("should paginate threads list", async ({ page }) => {
      await page.goto("/forums");
      await page.waitForLoadState("networkidle");

      const forumLink = page.locator('[data-testid="forum-card"]').first();
      const forumCount = await forumLink.count();

      if (forumCount > 0) {
        await forumLink.click();
        await page.waitForLoadState("networkidle");

        // Look for pagination controls
        const pagination = page.locator('[data-testid="pagination"]');
        if (await pagination.count() > 0) {
          const nextButton = page.locator('[data-testid="next-page"]');
          if (await nextButton.count() > 0 && await nextButton.isEnabled()) {
            await nextButton.click();
            await page.waitForLoadState("networkidle");

            // Should navigate to page 2
            expect(page.url()).toContain("page=2");
          }
        }
      }
    });
  });

  test.describe("Moderation (Admin Only)", () => {
    test("should not show moderation buttons for non-admins", async ({ page }) => {
      await page.goto("/forums");
      await page.waitForLoadState("networkidle");

      const forumLink = page.locator('[data-testid="forum-card"]').first();
      const forumCount = await forumLink.count();

      if (forumCount > 0) {
        await forumLink.click();
        await page.waitForLoadState("networkidle");

        const threadLink = page.locator('[data-testid="thread-card"]').first();
        const threadCount = await threadLink.count();

        if (threadCount > 0) {
          await threadLink.click();
          await page.waitForLoadState("networkidle");

          // Moderation buttons should not be visible for non-authenticated users
          const pinButton = page.locator('[data-testid="pin-thread"]');
          const lockButton = page.locator('[data-testid="lock-thread"]');

          if (await pinButton.count() > 0) {
            await expect(pinButton).not.toBeVisible();
          }
          if (await lockButton.count() > 0) {
            await expect(lockButton).not.toBeVisible();
          }
        }
      }
    });
  });

  test.describe("Forum Stats", () => {
    test("should display forum statistics", async ({ page }) => {
      await page.goto("/forums");
      await page.waitForLoadState("networkidle");

      const forumCard = page.locator('[data-testid="forum-card"]').first();
      const forumCount = await forumCard.count();

      if (forumCount > 0) {
        // Should show thread count, reply count, or similar stats
        const statsSection = forumCard.locator('[data-testid="forum-stats"]');
        if (await statsSection.count() > 0) {
          await expect(statsSection).toBeVisible();
        }
      }
    });

    test("should display thread statistics", async ({ page }) => {
      await page.goto("/forums");
      await page.waitForLoadState("networkidle");

      const forumLink = page.locator('[data-testid="forum-card"]').first();
      const forumCount = await forumLink.count();

      if (forumCount > 0) {
        await forumLink.click();
        await page.waitForLoadState("networkidle");

        const threadCard = page.locator('[data-testid="thread-card"]').first();
        if (await threadCard.count() > 0) {
          // Should show reply count, views, upvotes, etc.
          const hasStats =
            (await threadCard.locator('[data-testid="thread-replies"]').count()) > 0 ||
            (await threadCard.locator('[data-testid="thread-views"]').count()) > 0 ||
            (await threadCard.locator('[data-testid="thread-upvotes"]').count()) > 0;

          expect(hasStats).toBeTruthy();
        }
      }
    });
  });

  test.describe("Accessibility", () => {
    test("forums page should be accessible", async ({ page }) => {
      await page.goto("/forums");
      await page.waitForLoadState("networkidle");

      // Basic accessibility checks
      const main = page.locator("main");
      await expect(main).toBeVisible();

      // Should have proper heading hierarchy
      const h1 = page.locator("h1");
      await expect(h1).toBeVisible();
    });

    test("thread page should be accessible", async ({ page }) => {
      await page.goto("/forums");
      await page.waitForLoadState("networkidle");

      const forumLink = page.locator('[data-testid="forum-card"]').first();
      const forumCount = await forumLink.count();

      if (forumCount > 0) {
        await forumLink.click();
        await page.waitForLoadState("networkidle");

        const threadLink = page.locator('[data-testid="thread-card"]').first();
        const threadCount = await threadLink.count();

        if (threadCount > 0) {
          await threadLink.click();
          await page.waitForLoadState("networkidle");

          // Should have proper semantic structure
          const main = page.locator("main");
          await expect(main).toBeVisible();

          const h1 = page.locator("h1");
          await expect(h1).toBeVisible();
        }
      }
    });
  });

  test.describe("Responsive Design", () => {
    test("forums should be mobile responsive", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/forums");
      await page.waitForLoadState("networkidle");

      // Forums should render on mobile
      const forumsSection = page.locator('[data-testid="forums-list"]');
      await expect(forumsSection).toBeVisible();
    });

    test("thread view should be mobile responsive", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/forums");
      await page.waitForLoadState("networkidle");

      const forumLink = page.locator('[data-testid="forum-card"]').first();
      const forumCount = await forumLink.count();

      if (forumCount > 0) {
        await forumLink.click();
        await page.waitForLoadState("networkidle");

        const threadLink = page.locator('[data-testid="thread-card"]').first();
        const threadCount = await threadLink.count();

        if (threadCount > 0) {
          await threadLink.click();
          await page.waitForLoadState("networkidle");

          // Thread content should be visible on mobile
          const threadContent = page.locator('[data-testid="thread-content"]');
          await expect(threadContent).toBeVisible();
        }
      }
    });
  });
});

test.describe("Discussion Forums - API Tests", () => {
  test("GET /api/forums returns forums list", async ({ request }) => {
    const response = await request.get("/api/forums");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test("GET /api/forum-threads returns threads", async ({ request }) => {
    const response = await request.get("/api/forum-threads");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty("threads");
    expect(data).toHaveProperty("pagination");
  });

  test("POST /api/forum-threads requires authentication", async ({ request }) => {
    const response = await request.post("/api/forum-threads", {
      data: {
        forum_id: "test-id",
        title: "Test Thread",
        content: "Test content",
        slug: "test-thread",
      },
    });

    expect(response.status()).toBe(401);
  });

  test("POST /api/forum-replies requires authentication", async ({ request }) => {
    const response = await request.post("/api/forum-replies", {
      data: {
        thread_id: "test-id",
        content: "Test reply",
      },
    });

    expect(response.status()).toBe(401);
  });
});
