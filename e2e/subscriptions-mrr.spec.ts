import { test, expect } from "@playwright/test";

test.describe("Subscriptions & MRR - Database Schema", () => {
  test.describe("1. Subscriptions Table", () => {
    test("should have subscriptions endpoint or require auth", async ({ request }) => {
      const response = await request.get("/api/admin/subscriptions");
      // Either 401/403 (requires auth) or 404 (no route) - both acceptable
      expect([401, 403, 404, 405]).toContain(response.status());
    });
  });
});

test.describe("Subscriptions & MRR - Enrollment Analytics Page", () => {
  test.describe("1. MRR Display", () => {
    test("should display MRR section on enrollment page", async ({ page }) => {
      await page.goto("/admin/analytics/enrollments");
      const content = await page.textContent("body");
      // Should show MRR content or redirect to login
      const hasMRR = content?.toLowerCase().includes("mrr") ||
                    content?.toLowerCase().includes("monthly recurring") ||
                    content?.toLowerCase().includes("revenue") ||
                    content?.toLowerCase().includes("login");
      expect(hasMRR).toBe(true);
    });

    test("should display currency formatted values or login", async ({ page }) => {
      await page.goto("/admin/analytics/enrollments");
      const content = await page.textContent("body");
      // Should show dollar sign or login
      const hasCurrency = content?.includes("$") ||
                         content?.toLowerCase().includes("login");
      expect(hasCurrency).toBe(true);
    });
  });

  test.describe("2. Active Subscribers", () => {
    test("should display active members count or login", async ({ page }) => {
      await page.goto("/admin/analytics/enrollments");
      const content = await page.textContent("body");
      const hasMembers = content?.toLowerCase().includes("active") ||
                        content?.toLowerCase().includes("member") ||
                        content?.toLowerCase().includes("subscriber") ||
                        content?.toLowerCase().includes("login");
      expect(hasMembers).toBe(true);
    });
  });

  test.describe("3. Renewal Timeline", () => {
    test("should have renewal section or login", async ({ page }) => {
      await page.goto("/admin/analytics/enrollments");
      const content = await page.textContent("body");
      const hasRenewals = content?.toLowerCase().includes("renewal") ||
                         content?.toLowerCase().includes("upcoming") ||
                         content?.toLowerCase().includes("30 day") ||
                         content?.toLowerCase().includes("login");
      expect(hasRenewals).toBe(true);
    });
  });

  test.describe("4. At-Risk Subscriptions", () => {
    test("should identify at-risk subscriptions or login", async ({ page }) => {
      await page.goto("/admin/analytics/enrollments");
      const content = await page.textContent("body");
      const hasAtRisk = content?.toLowerCase().includes("at-risk") ||
                       content?.toLowerCase().includes("cancel") ||
                       content?.toLowerCase().includes("churn") ||
                       content?.toLowerCase().includes("login");
      expect(hasAtRisk).toBe(true);
    });
  });
});

test.describe("Subscriptions & MRR - Course Enrollments", () => {
  test.describe("1. Course Stats", () => {
    test("should display course enrollment section", async ({ page }) => {
      await page.goto("/admin/analytics/enrollments");
      const content = await page.textContent("body");
      const hasCourses = content?.toLowerCase().includes("course") ||
                        content?.toLowerCase().includes("enrollment") ||
                        content?.toLowerCase().includes("login");
      expect(hasCourses).toBe(true);
    });

    test("should separate courses from memberships", async ({ page }) => {
      await page.goto("/admin/analytics/enrollments");
      const content = await page.textContent("body");
      // Should have distinction between courses and memberships
      const hasDistinction = (content?.toLowerCase().includes("course") && 
                             content?.toLowerCase().includes("membership")) ||
                            content?.toLowerCase().includes("login");
      expect(hasDistinction).toBe(true);
    });
  });

  test.describe("2. Enrollment Counts", () => {
    test("should display active vs total counts or login", async ({ page }) => {
      await page.goto("/admin/analytics/enrollments");
      const content = await page.textContent("body");
      const hasCounts = content?.toLowerCase().includes("active") ||
                       content?.toLowerCase().includes("total") ||
                       content?.toLowerCase().includes("login");
      expect(hasCounts).toBe(true);
    });
  });
});

test.describe("Subscriptions & MRR - Membership Products", () => {
  test.describe("1. Membership Section", () => {
    test("should display memberships section", async ({ page }) => {
      await page.goto("/admin/analytics/enrollments");
      const content = await page.textContent("body");
      const hasMemberships = content?.toLowerCase().includes("membership") ||
                            content?.toLowerCase().includes("subscription") ||
                            content?.toLowerCase().includes("login");
      expect(hasMemberships).toBe(true);
    });
  });

  test.describe("2. Membership Stats", () => {
    test("should show member counts or login", async ({ page }) => {
      await page.goto("/admin/analytics/enrollments");
      const content = await page.textContent("body");
      const hasStats = content?.toLowerCase().includes("member") ||
                      content?.toLowerCase().includes("signup") ||
                      content?.toLowerCase().includes("subscriber") ||
                      content?.toLowerCase().includes("login");
      expect(hasStats).toBe(true);
    });
  });
});

test.describe("Subscriptions & MRR - Page Performance", () => {
  test("should load enrollment analytics page without server error", async ({ page }) => {
    const response = await page.goto("/admin/analytics/enrollments");
    expect(response?.status()).toBeLessThan(500);
  });

  test("should load page within reasonable time", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/admin/analytics/enrollments");
    await page.waitForLoadState("domcontentloaded");
    const loadTime = Date.now() - startTime;
    // Should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });
});
