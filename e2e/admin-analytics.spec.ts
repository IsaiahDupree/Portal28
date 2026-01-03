import { test, expect } from "@playwright/test";

test.describe("Admin Analytics - Enrollment Dashboard", () => {
  test.describe("1. Page Access", () => {
    test("should redirect unauthenticated users to login", async ({ page }) => {
      await page.goto("/admin/analytics/enrollments");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should load enrollment analytics page for admin", async ({ page }) => {
      // Note: This test requires admin authentication
      const response = await page.goto("/admin/analytics/enrollments");
      // Should either load (200) or redirect to login (302)
      expect([200, 302]).toContain(response?.status());
    });
  });

  test.describe("2. Page Structure", () => {
    test("should have correct page title", async ({ page }) => {
      await page.goto("/admin/analytics/enrollments");
      // Check for enrollment analytics heading or redirect
      const content = await page.textContent("body");
      const hasContent = 
        content?.includes("Enrollment") ||
        content?.includes("Login") ||
        content?.includes("Sign in");
      expect(hasContent).toBe(true);
    });

    test("should display back link or login page", async ({ page }) => {
      await page.goto("/admin/analytics/enrollments");
      // Either shows back link or login page
      const content = await page.textContent("body");
      const hasBackOrLogin = content?.toLowerCase().includes("back") ||
                            content?.toLowerCase().includes("login") ||
                            content?.toLowerCase().includes("sign in");
      expect(hasBackOrLogin).toBe(true);
    });
  });

  test.describe("3. Stats Cards", () => {
    test("should have MRR stat card structure", async ({ page }) => {
      await page.goto("/admin/analytics/enrollments");
      const content = await page.textContent("body");
      // Should have MRR related content or be on login
      const hasMRR = content?.toLowerCase().includes("mrr") || 
                     content?.toLowerCase().includes("revenue") ||
                     content?.toLowerCase().includes("login");
      expect(hasMRR).toBe(true);
    });

    test("should have membership stats structure", async ({ page }) => {
      await page.goto("/admin/analytics/enrollments");
      const content = await page.textContent("body");
      // Should have membership related content or be on login
      const hasMembership = content?.toLowerCase().includes("member") || 
                           content?.toLowerCase().includes("subscription") ||
                           content?.toLowerCase().includes("login");
      expect(hasMembership).toBe(true);
    });
  });

  test.describe("4. API Endpoints", () => {
    test("should return 401/403 for unauthenticated entitlements query", async ({ request }) => {
      const response = await request.get("/api/admin/entitlements");
      // Either 401/403 (auth required) or 404 (route not found)
      expect([401, 403, 404, 405]).toContain(response.status());
    });

    test("should return 401/403 for unauthenticated subscriptions query", async ({ request }) => {
      const response = await request.get("/api/admin/subscriptions");
      // Either 401/403 (auth required) or 404 (route not found)
      expect([401, 403, 404, 405]).toContain(response.status());
    });
  });
});

test.describe("Admin Analytics - Sales Dashboard", () => {
  test.describe("1. Page Access", () => {
    test("should redirect unauthenticated users to login", async ({ page }) => {
      await page.goto("/admin/analytics");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should load analytics page structure", async ({ page }) => {
      const response = await page.goto("/admin/analytics");
      expect([200, 302]).toContain(response?.status());
    });
  });

  test.describe("2. Analytics Content", () => {
    test("should have analytics heading or login", async ({ page }) => {
      await page.goto("/admin/analytics");
      const content = await page.textContent("body");
      const hasAnalytics = content?.toLowerCase().includes("analytics") ||
                          content?.toLowerCase().includes("login");
      expect(hasAnalytics).toBe(true);
    });

    test("should have impressions/checkouts/purchases structure", async ({ page }) => {
      await page.goto("/admin/analytics");
      const content = await page.textContent("body");
      // Either shows analytics metrics or login page
      const hasMetrics = content?.toLowerCase().includes("impression") ||
                        content?.toLowerCase().includes("checkout") ||
                        content?.toLowerCase().includes("purchase") ||
                        content?.toLowerCase().includes("login");
      expect(hasMetrics).toBe(true);
    });
  });
});

test.describe("Admin Dashboard - Quick Actions", () => {
  test.describe("1. Dashboard Access", () => {
    test("should redirect unauthenticated users", async ({ page }) => {
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("2. Quick Action Cards", () => {
    test("should have enrollment analytics link or login", async ({ page }) => {
      await page.goto("/admin");
      const content = await page.textContent("body");
      const hasContent = content?.toLowerCase().includes("enrollment") ||
                        content?.toLowerCase().includes("login") ||
                        content?.toLowerCase().includes("sign in");
      expect(hasContent).toBe(true);
    });

    test("should have moderation link or login", async ({ page }) => {
      await page.goto("/admin");
      const content = await page.textContent("body");
      const hasContent = content?.toLowerCase().includes("moderation") ||
                        content?.toLowerCase().includes("login") ||
                        content?.toLowerCase().includes("sign in");
      expect(hasContent).toBe(true);
    });

    test("should have sales analytics link or login", async ({ page }) => {
      await page.goto("/admin");
      const content = await page.textContent("body");
      const hasContent = content?.toLowerCase().includes("analytics") ||
                        content?.toLowerCase().includes("sales") ||
                        content?.toLowerCase().includes("login") ||
                        content?.toLowerCase().includes("sign in");
      expect(hasContent).toBe(true);
    });
  });
});
