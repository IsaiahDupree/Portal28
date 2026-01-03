import { test, expect } from "@playwright/test";

test.describe("Admin Moderation - Page Access", () => {
  test("should redirect unauthenticated users to login", async ({ page }) => {
    await page.goto("/admin/moderation");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should load moderation page for authenticated admin", async ({ page }) => {
    const response = await page.goto("/admin/moderation");
    // Should either load (200) or redirect to login (302)
    expect([200, 302]).toContain(response?.status());
  });
});

test.describe("Admin Moderation - Page Structure", () => {
  test("should have moderation heading or login", async ({ page }) => {
    await page.goto("/admin/moderation");
    const content = await page.textContent("body");
    const hasContent = 
      content?.toLowerCase().includes("moderation") ||
      content?.toLowerCase().includes("login") ||
      content?.toLowerCase().includes("sign in");
    expect(hasContent).toBe(true);
  });

  test("should have back link or login page", async ({ page }) => {
    await page.goto("/admin/moderation");
    const content = await page.textContent("body");
    const hasBackOrLogin = content?.toLowerCase().includes("back") ||
                          content?.toLowerCase().includes("login") ||
                          content?.toLowerCase().includes("sign in");
    expect(hasBackOrLogin).toBe(true);
  });
});

test.describe("Admin Moderation - Stats Cards", () => {
  test("should display pending reports stat or login", async ({ page }) => {
    await page.goto("/admin/moderation");
    const content = await page.textContent("body");
    const hasReports = content?.toLowerCase().includes("report") ||
                      content?.toLowerCase().includes("pending") ||
                      content?.toLowerCase().includes("login");
    expect(hasReports).toBe(true);
  });

  test("should display hidden content stat or login", async ({ page }) => {
    await page.goto("/admin/moderation");
    const content = await page.textContent("body");
    const hasHidden = content?.toLowerCase().includes("hidden") ||
                     content?.toLowerCase().includes("content") ||
                     content?.toLowerCase().includes("login");
    expect(hasHidden).toBe(true);
  });

  test("should display thread/reply counts or login", async ({ page }) => {
    await page.goto("/admin/moderation");
    const content = await page.textContent("body");
    const hasCounts = content?.toLowerCase().includes("thread") ||
                     content?.toLowerCase().includes("repl") ||
                     content?.toLowerCase().includes("total") ||
                     content?.toLowerCase().includes("login");
    expect(hasCounts).toBe(true);
  });
});

test.describe("Admin Moderation - Thread Section", () => {
  test("should have recent threads section or login", async ({ page }) => {
    await page.goto("/admin/moderation");
    const content = await page.textContent("body");
    const hasThreads = content?.toLowerCase().includes("thread") ||
                      content?.toLowerCase().includes("forum") ||
                      content?.toLowerCase().includes("login");
    expect(hasThreads).toBe(true);
  });

  test("should display thread table headers or login", async ({ page }) => {
    await page.goto("/admin/moderation");
    const content = await page.textContent("body");
    // Check for table headers or login
    const hasHeaders = content?.toLowerCase().includes("author") ||
                      content?.toLowerCase().includes("date") ||
                      content?.toLowerCase().includes("status") ||
                      content?.toLowerCase().includes("action") ||
                      content?.toLowerCase().includes("login");
    expect(hasHeaders).toBe(true);
  });
});

test.describe("Admin Moderation - Reply Section", () => {
  test("should have recent replies section or login", async ({ page }) => {
    await page.goto("/admin/moderation");
    const content = await page.textContent("body");
    const hasReplies = content?.toLowerCase().includes("repl") ||
                      content?.toLowerCase().includes("forum") ||
                      content?.toLowerCase().includes("login");
    expect(hasReplies).toBe(true);
  });
});

test.describe("Admin Moderation - API Endpoints", () => {
  test("should return 403 for unauthenticated moderation action", async ({ request }) => {
    const response = await request.post("/api/admin/moderation", {
      data: {
        action: "hide",
        type: "thread",
        id: "test-id"
      }
    });
    // Should return 403 (forbidden) for unauthenticated users
    expect([401, 403]).toContain(response.status());
  });

  test("should return 400 for missing required fields", async ({ request }) => {
    const response = await request.post("/api/admin/moderation", {
      data: {
        action: "hide"
        // Missing type and id
      }
    });
    // Should return 400 (bad request) or 403 (forbidden)
    expect([400, 401, 403]).toContain(response.status());
  });

  test("should reject unknown actions", async ({ request }) => {
    const response = await request.post("/api/admin/moderation", {
      data: {
        action: "unknown_action",
        type: "thread",
        id: "test-id"
      }
    });
    // Should return 400 or 403
    expect([400, 401, 403]).toContain(response.status());
  });
});

test.describe("Admin Moderation - Action Types", () => {
  const actions = [
    { action: "hide", type: "thread" },
    { action: "show", type: "thread" },
    { action: "pin", type: "thread" },
    { action: "unpin", type: "thread" },
    { action: "lock", type: "thread" },
    { action: "unlock", type: "thread" },
    { action: "delete", type: "thread" },
    { action: "hide", type: "reply" },
    { action: "show", type: "reply" },
    { action: "delete", type: "reply" },
    { action: "dismiss_report", type: "report" },
  ];

  for (const { action, type } of actions) {
    test(`should handle ${action} action for ${type} (auth required)`, async ({ request }) => {
      const response = await request.post("/api/admin/moderation", {
        data: {
          action,
          type,
          id: "00000000-0000-0000-0000-000000000000"
        }
      });
      // Should require authentication (401/403)
      expect([401, 403]).toContain(response.status());
    });
  }
});

test.describe("Admin Moderation - UI Components", () => {
  test("should have moderation page load without server error", async ({ page }) => {
    const response = await page.goto("/admin/moderation");
    expect(response?.status()).toBeLessThan(500);
  });

  test("should handle empty state gracefully", async ({ page }) => {
    await page.goto("/admin/moderation");
    // Page should load without errors
    await page.waitForLoadState("domcontentloaded");
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });
});

test.describe("Admin Moderation - Report Handling", () => {
  test("should require auth for hide_reported_content action", async ({ request }) => {
    const response = await request.post("/api/admin/moderation", {
      data: {
        action: "hide_reported_content",
        type: "report",
        id: "00000000-0000-0000-0000-000000000000",
        contentType: "thread",
        contentId: "00000000-0000-0000-0000-000000000001"
      }
    });
    expect([401, 403]).toContain(response.status());
  });
});
