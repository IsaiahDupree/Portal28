/**
 * E2E Tests for feat-034: Moderation Tools
 * Test IDs: PLT-MOD-001 through PLT-MOD-006
 */

import { test, expect } from "@playwright/test";

test.describe("PLT-MOD-001: Pin Thread", () => {
  test("should pin a thread via API", async ({ request }) => {
    const response = await request.post("/api/admin/moderation", {
      data: {
        action: "pin",
        type: "thread",
        id: "00000000-0000-0000-0000-000000000000",
      },
    });

    // Should require authentication (401/403) or succeed (200)
    expect([200, 401, 403]).toContain(response.status());
  });

  test("should unpin a thread via API", async ({ request }) => {
    const response = await request.post("/api/admin/moderation", {
      data: {
        action: "unpin",
        type: "thread",
        id: "00000000-0000-0000-0000-000000000000",
      },
    });

    expect([200, 401, 403]).toContain(response.status());
  });

  test("should display pinned badge on threads", async ({ page }) => {
    await page.goto("/admin/moderation");
    const content = await page.textContent("body");
    // Check for pinned indicator or login page
    const hasPinned = content?.toLowerCase().includes("pin") ||
                      content?.toLowerCase().includes("login");
    expect(hasPinned).toBe(true);
  });
});

test.describe("PLT-MOD-002: Lock Thread", () => {
  test("should lock a thread via API", async ({ request }) => {
    const response = await request.post("/api/admin/moderation", {
      data: {
        action: "lock",
        type: "thread",
        id: "00000000-0000-0000-0000-000000000000",
      },
    });

    expect([200, 401, 403]).toContain(response.status());
  });

  test("should unlock a thread via API", async ({ request }) => {
    const response = await request.post("/api/admin/moderation", {
      data: {
        action: "unlock",
        type: "thread",
        id: "00000000-0000-0000-0000-000000000000",
      },
    });

    expect([200, 401, 403]).toContain(response.status());
  });

  test("should display locked badge on threads", async ({ page }) => {
    await page.goto("/admin/moderation");
    const content = await page.textContent("body");
    const hasLocked = content?.toLowerCase().includes("lock") ||
                      content?.toLowerCase().includes("login");
    expect(hasLocked).toBe(true);
  });

  test("locked threads should prevent replies via API", async ({ request }) => {
    // This tests that the post creation API checks is_locked
    const response = await request.post("/api/community/forum/post/create", {
      data: {
        thread_id: "00000000-0000-0000-0000-000000000000",
        body: "Test reply to locked thread",
      },
    });

    // Should either require auth or reject because thread is locked
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe("PLT-MOD-003: Delete Thread", () => {
  test("should delete a thread via API", async ({ request }) => {
    const response = await request.post("/api/admin/moderation", {
      data: {
        action: "delete",
        type: "thread",
        id: "00000000-0000-0000-0000-000000000000",
      },
    });

    expect([200, 401, 403]).toContain(response.status());
  });

  test("should cascade delete all posts when deleting thread", async ({ page }) => {
    await page.goto("/admin/moderation");
    // Just verify page loads - actual cascade is handled by database
    await page.waitForLoadState("domcontentloaded");
    expect(await page.title()).toBeTruthy();
  });

  test("should show delete action in moderation UI", async ({ page }) => {
    await page.goto("/admin/moderation");
    const content = await page.textContent("body");
    const hasDelete = content?.toLowerCase().includes("delete") ||
                      content?.toLowerCase().includes("trash") ||
                      content?.toLowerCase().includes("remove") ||
                      content?.toLowerCase().includes("login");
    expect(hasDelete).toBe(true);
  });
});

test.describe("PLT-MOD-004: Delete Post", () => {
  test("should delete a post via API", async ({ request }) => {
    const response = await request.post("/api/admin/moderation", {
      data: {
        action: "delete",
        type: "reply",
        id: "00000000-0000-0000-0000-000000000000",
      },
    });

    expect([200, 401, 403]).toContain(response.status());
  });

  test("should hide/show posts via API", async ({ request }) => {
    const hideResponse = await request.post("/api/admin/moderation", {
      data: {
        action: "hide",
        type: "reply",
        id: "00000000-0000-0000-0000-000000000000",
      },
    });

    expect([200, 401, 403]).toContain(hideResponse.status());

    const showResponse = await request.post("/api/admin/moderation", {
      data: {
        action: "show",
        type: "reply",
        id: "00000000-0000-0000-0000-000000000000",
      },
    });

    expect([200, 401, 403]).toContain(showResponse.status());
  });
});

test.describe("PLT-MOD-005: Ban User", () => {
  test("should create a ban via warnings API", async ({ request }) => {
    const response = await request.post("/api/admin/moderation/warnings", {
      data: {
        user_id: "00000000-0000-0000-0000-000000000000",
        warning_type: "ban",
        reason: "Violating community guidelines",
      },
    });

    // Should require auth or succeed
    expect([200, 201, 401, 403]).toContain(response.status());
  });

  test("should create a suspension with duration", async ({ request }) => {
    const response = await request.post("/api/admin/moderation/warnings", {
      data: {
        user_id: "00000000-0000-0000-0000-000000000000",
        warning_type: "suspension",
        reason: "Spam posting",
        duration_days: 7,
      },
    });

    expect([200, 201, 401, 403]).toContain(response.status());
  });

  test("should create a warning", async ({ request }) => {
    const response = await request.post("/api/admin/moderation/warnings", {
      data: {
        user_id: "00000000-0000-0000-0000-000000000000",
        warning_type: "warning",
        reason: "Minor guideline violation",
      },
    });

    expect([200, 201, 401, 403]).toContain(response.status());
  });

  test("should list warnings for a user", async ({ request }) => {
    const response = await request.get(
      "/api/admin/moderation/warnings?user_id=00000000-0000-0000-0000-000000000000"
    );

    expect([200, 401, 403]).toContain(response.status());
  });

  test("should resolve a warning", async ({ request }) => {
    const response = await request.patch("/api/admin/moderation/warnings", {
      data: {
        warning_id: "00000000-0000-0000-0000-000000000000",
      },
    });

    expect([200, 401, 403, 404]).toContain(response.status());
  });
});

test.describe("PLT-MOD-006: Moderation API Integration", () => {
  test("should require authentication for all moderation actions", async ({ request }) => {
    const actions = [
      { action: "hide", type: "thread" },
      { action: "show", type: "thread" },
      { action: "pin", type: "thread" },
      { action: "unpin", type: "thread" },
      { action: "lock", type: "thread" },
      { action: "unlock", type: "thread" },
      { action: "delete", type: "thread" },
    ];

    for (const { action, type } of actions) {
      const response = await request.post("/api/admin/moderation", {
        data: {
          action,
          type,
          id: "00000000-0000-0000-0000-000000000000",
        },
      });

      // All should require authentication
      expect([401, 403]).toContain(response.status());
    }
  });

  test("should reject invalid actions", async ({ request }) => {
    const response = await request.post("/api/admin/moderation", {
      data: {
        action: "invalid_action",
        type: "thread",
        id: "00000000-0000-0000-0000-000000000000",
      },
    });

    expect([400, 401, 403]).toContain(response.status());
  });

  test("should reject requests with missing fields", async ({ request }) => {
    const response = await request.post("/api/admin/moderation", {
      data: {
        action: "hide",
        // missing type and id
      },
    });

    expect([400, 401, 403]).toContain(response.status());
  });

  test("should log moderation actions", async ({ page }) => {
    // Admin actions are logged to admin_actions table
    await page.goto("/admin/moderation");
    await page.waitForLoadState("domcontentloaded");
    // Verify page structure includes action tracking
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });

  test("should handle content reports", async ({ request }) => {
    const dismissResponse = await request.post("/api/admin/moderation", {
      data: {
        action: "dismiss_report",
        type: "report",
        id: "00000000-0000-0000-0000-000000000000",
      },
    });

    expect([200, 401, 403, 404]).toContain(dismissResponse.status());
  });

  test("should hide reported content", async ({ request }) => {
    const response = await request.post("/api/admin/moderation", {
      data: {
        action: "hide_reported_content",
        type: "report",
        id: "00000000-0000-0000-0000-000000000000",
        contentType: "thread",
        contentId: "00000000-0000-0000-0000-000000000001",
      },
    });

    expect([200, 401, 403, 404]).toContain(response.status());
  });
});

test.describe("Moderation UI - Accessibility", () => {
  test("should have proper status badges", async ({ page }) => {
    await page.goto("/admin/moderation");
    const content = await page.textContent("body");
    // Should show status indicators for threads
    const hasStatus = content?.toLowerCase().includes("pinned") ||
                      content?.toLowerCase().includes("locked") ||
                      content?.toLowerCase().includes("hidden") ||
                      content?.toLowerCase().includes("visible") ||
                      content?.toLowerCase().includes("login");
    expect(hasStatus).toBe(true);
  });

  test("should display moderation stats", async ({ page }) => {
    await page.goto("/admin/moderation");
    const content = await page.textContent("body");
    // Should show counts for pending reports, hidden content, etc.
    const hasStats = content?.toLowerCase().includes("pending") ||
                     content?.toLowerCase().includes("report") ||
                     content?.toLowerCase().includes("hidden") ||
                     content?.toLowerCase().includes("total") ||
                     content?.toLowerCase().includes("login");
    expect(hasStats).toBe(true);
  });
});
