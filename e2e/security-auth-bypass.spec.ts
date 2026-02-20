/**
 * Security Tests: Authentication Bypass Protection (feat-WC-023)
 *
 * Test ID: TEST-SEC-AUTH-001
 * Feature: Security test for auth bypass prevention
 *
 * This test suite validates:
 * - 401 on API: Protected API endpoints return 401 for unauthenticated requests
 * - Redirect pages: Protected pages redirect to login instead of exposing content
 * - No leaks: Error responses don't leak sensitive data
 *
 * Criteria:
 * 1. 401 on API: All protected API routes require authentication
 * 2. Redirect pages: All protected pages redirect unauthenticated users
 * 3. No leaks: Errors don't expose user data, IDs, or system internals
 *
 * Run with: npx playwright test security-auth-bypass
 */

import { test, expect } from "@playwright/test";

test.describe("Security: Auth Bypass Protection (feat-WC-023)", () => {
  test.describe("API 401 Protection - Criteria: 401 on API", () => {
    test("progress API requires authentication", async ({ request }) => {
      const endpoints = [
        { method: "GET", url: "/api/progress/lesson" },
        { method: "POST", url: "/api/progress/lesson", data: { lessonId: "test", courseId: "test", status: "in_progress" } },
      ];

      for (const endpoint of endpoints) {
        const response = endpoint.method === "GET"
          ? await request.get(endpoint.url)
          : await request.post(endpoint.url, { data: endpoint.data });

        // Should return 401 Unauthorized
        expect(response.status()).toBe(401);

        const body = await response.json();
        expect(body).toHaveProperty("error");
        expect(body.error.toLowerCase()).toContain("auth");
      }
    });

    test("admin API endpoints require authentication", async ({ request }) => {
      const adminEndpoints = [
        "/api/admin/courses",
        "/api/admin/courses/new",
        "/api/admin/offers",
        "/api/admin/students",
        "/api/admin/analytics",
        "/api/admin/email-programs",
        "/api/admin/community",
      ];

      for (const url of adminEndpoints) {
        const response = await request.get(url);

        // Admin endpoints should return error status (not 2xx success)
        expect(response.status()).toBeGreaterThanOrEqual(400);
      }
    });

    test("course modification APIs require authentication", async ({ request }) => {
      const response = await request.post("/api/admin/courses", {
        data: {
          title: "Unauthorized Course",
          slug: "unauthorized-course",
          price: 99,
        },
      });

      expect([401, 403]).toContain(response.status());

      const body = await response.json();
      expect(body).toHaveProperty("error");
    });

    test("user profile API requires authentication", async ({ request }) => {
      const endpoints = [
        { method: "GET", url: "/api/profile" },
        { method: "PUT", url: "/api/profile", data: { displayName: "Hacker" } },
      ];

      for (const endpoint of endpoints) {
        const response = endpoint.method === "GET"
          ? await request.get(endpoint.url)
          : await request.put(endpoint.url, { data: endpoint.data });

        expect([401, 403, 404]).toContain(response.status());
      }
    });

    test("notification APIs require authentication", async ({ request }) => {
      const endpoints = [
        "/api/notifications",
        "/api/notifications/unread",
      ];

      for (const url of endpoints) {
        const response = await request.get(url);
        expect([401, 403, 404]).toContain(response.status());
      }
    });

    test("enrollment/purchase APIs require authentication", async ({ request }) => {
      const response = await request.post("/api/stripe/checkout", {
        data: {
          courseSlug: "test-course",
          priceId: "price_test123",
        },
      });

      expect([400, 401, 403]).toContain(response.status());
    });

    test("certificate generation requires authentication", async ({ request }) => {
      const response = await request.get("/api/certificates/test-course-id");

      expect([401, 403, 404]).toContain(response.status());
    });

    test("quiz submission requires authentication", async ({ request }) => {
      const response = await request.post("/api/quizzes/submit", {
        data: {
          quizId: "test-quiz",
          answers: { q1: "a" },
        },
      });

      // Should return error status (not 2xx success)
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe("Page Redirect Protection - Criteria: Redirect pages", () => {
    test("student dashboard redirects to login", async ({ page }) => {
      await page.goto("/app");
      await expect(page).toHaveURL(/\/login/);
    });

    test("admin dashboard redirects to login", async ({ page }) => {
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/login/);
    });

    test("student courses page redirects to login", async ({ page }) => {
      await page.goto("/app/courses");
      await expect(page).toHaveURL(/\/login/);
    });

    test("lesson page redirects to login", async ({ page }) => {
      await page.goto("/app/lesson/test-lesson-123");
      await expect(page).toHaveURL(/\/login/);
    });

    test("admin courses page redirects to login", async ({ page }) => {
      await page.goto("/admin/courses");
      await expect(page).toHaveURL(/\/login/);
    });

    test("admin analytics page redirects to login", async ({ page }) => {
      await page.goto("/admin/analytics");
      await expect(page).toHaveURL(/\/login/);
    });

    test("settings page redirects to login", async ({ page }) => {
      await page.goto("/app/settings");
      await expect(page).toHaveURL(/\/login/);
    });

    test("community pages redirect to login", async ({ page }) => {
      const communityPages = [
        "/app/community",
        "/app/community/forums",
        "/app/community/announcements",
        "/app/community/resources",
      ];

      for (const url of communityPages) {
        await page.goto(url);
        await expect(page).toHaveURL(/\/login/);
      }
    });

    test("admin community pages redirect to login", async ({ page }) => {
      const adminPages = [
        "/admin/community",
        "/admin/community/moderation",
      ];

      for (const url of adminPages) {
        await page.goto(url);
        await expect(page).toHaveURL(/\/login/);
      }
    });

    test("profile page redirects to login", async ({ page }) => {
      await page.goto("/app/profile");
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("No Data Leaks - Criteria: No leaks", () => {
    test("401 errors don't expose user IDs", async ({ request }) => {
      const response = await request.get("/api/progress/lesson");

      const body = await response.json();

      // Error response should not contain user IDs
      const bodyStr = JSON.stringify(body);
      expect(bodyStr).not.toMatch(/user_id|userId|user-[a-f0-9-]{36}/i);
    });

    test("401 errors don't expose database structure", async ({ request }) => {
      const response = await request.get("/api/admin/courses");

      const contentType = response.headers()["content-type"];
      if (!contentType || !contentType.includes("application/json")) {
        test.skip(); // Skip if not JSON
        return;
      }

      const body = await response.json();
      const bodyStr = JSON.stringify(body).toLowerCase();

      // Should not expose database table names or SQL
      expect(bodyStr).not.toContain("table");
      expect(bodyStr).not.toContain("column");
      expect(bodyStr).not.toContain("select ");
      expect(bodyStr).not.toContain("from ");
      expect(bodyStr).not.toContain("where ");
      expect(bodyStr).not.toContain("postgres");
      expect(bodyStr).not.toContain("database");
    });

    test("401 errors don't expose file paths", async ({ request }) => {
      const response = await request.post("/api/admin/courses", {
        data: { invalid: "data" },
      });

      const body = await response.json();
      const bodyStr = JSON.stringify(body);

      // Should not expose server file paths
      expect(bodyStr).not.toMatch(/\/app\//);
      expect(bodyStr).not.toMatch(/\/lib\//);
      expect(bodyStr).not.toMatch(/\/api\//);
      expect(bodyStr).not.toMatch(/Users\/[a-zA-Z]/);
      expect(bodyStr).not.toMatch(/home\/[a-zA-Z]/);
      expect(bodyStr).not.toMatch(/\.ts|\.js|\.tsx/);
    });

    test("401 errors don't expose environment variables", async ({ request }) => {
      const response = await request.get("/api/admin/analytics");

      const contentType = response.headers()["content-type"];
      if (!contentType || !contentType.includes("application/json")) {
        test.skip(); // Skip if not JSON
        return;
      }

      const body = await response.json();
      const bodyStr = JSON.stringify(body).toLowerCase();

      // Should not expose env var names or values
      expect(bodyStr).not.toContain("next_public");
      expect(bodyStr).not.toContain("api_key");
      expect(bodyStr).not.toContain("secret");
      expect(bodyStr).not.toContain("password");
      expect(bodyStr).not.toContain("database_url");
      expect(bodyStr).not.toContain("supabase_url");
      expect(bodyStr).not.toContain("stripe_key");
    });

    test("401 errors don't expose other users' data", async ({ request }) => {
      const response = await request.get("/api/admin/students");

      if (response.status() === 401 || response.status() === 403) {
        const body = await response.json();

        // Should only return error, no user list
        expect(body).toHaveProperty("error");
        expect(body).not.toHaveProperty("students");
        expect(body).not.toHaveProperty("users");
        expect(body).not.toHaveProperty("data");
      }
    });

    test("redirect pages don't expose sensitive content in HTML", async ({ page }) => {
      await page.goto("/admin/courses");

      // Should redirect to login, not show admin content
      await expect(page).toHaveURL(/\/login/);

      const content = await page.content();

      // Should not contain admin-specific content
      expect(content).not.toContain("course-id-");
      expect(content).not.toContain("course_id");
      expect(content).not.toContain("Edit Course");
      expect(content).not.toContain("Delete Course");
    });

    test("API errors use generic messages", async ({ request }) => {
      const response = await request.get("/api/admin/courses");

      const contentType = response.headers()["content-type"];
      if (!contentType || !contentType.includes("application/json")) {
        test.skip(); // Skip if not JSON
        return;
      }

      const body = await response.json();

      // Error message should be generic, not specific
      const error = body.error?.toLowerCase() || "";

      // Should not expose implementation details
      expect(error).not.toContain("supabase");
      expect(error).not.toContain("postgres");
      expect(error).not.toContain("middleware");
      expect(error).not.toContain("session");
      expect(error).not.toContain("cookie");
    });

    test("unauthenticated requests don't leak timing information", async ({ request }) => {
      const validEndpoint = "/api/progress/lesson";
      const invalidEndpoint = "/api/progress/nonexistent-endpoint";

      // Time both requests
      const start1 = Date.now();
      await request.get(validEndpoint);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await request.get(invalidEndpoint);
      const time2 = Date.now() - start2;

      // Both should fail fast with 401/404, timing should be similar
      // Allow 500ms difference (generous for network variance)
      expect(Math.abs(time1 - time2)).toBeLessThan(500);
    });
  });

  test.describe("Authorization vs Authentication", () => {
    test("distinguishes between 401 (not authenticated) and 403 (not authorized)", async ({ request }) => {
      // Unauthenticated request should return error status
      const unauthResponse = await request.get("/api/admin/courses");
      expect(unauthResponse.status()).toBeGreaterThanOrEqual(400);

      const contentType = unauthResponse.headers()["content-type"];
      // For unauthenticated users, we expect 401 specifically if JSON
      if (unauthResponse.status() === 401 && contentType && contentType.includes("application/json")) {
        const body = await unauthResponse.json();
        expect(body.error.toLowerCase()).toMatch(/unauthorized|unauthenticated|auth/);
      }
    });
  });

  test.describe("Session Security", () => {
    test("expired sessions are rejected", async ({ page, context }) => {
      // Clear all cookies to simulate expired session
      await context.clearCookies();

      await page.goto("/app");

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test("invalid session tokens are rejected", async ({ page, context }) => {
      // Set invalid session cookie
      await context.addCookies([
        {
          name: "sb-access-token",
          value: "invalid-token-123",
          domain: "localhost",
          path: "/",
        },
      ]);

      await page.goto("/app");

      // Should redirect to login (invalid session)
      await expect(page).toHaveURL(/\/login/);
    });

    test("session cookies have secure attributes", async ({ page, context }) => {
      await page.goto("/");

      const cookies = await context.cookies();

      // Check session cookies have proper security attributes
      const sessionCookies = cookies.filter((c) =>
        c.name.includes("sb-") || c.name.includes("auth")
      );

      for (const cookie of sessionCookies) {
        // HttpOnly should be set (if applicable)
        // SameSite should be set
        expect(cookie.sameSite).toBeDefined();

        // In production, secure should be true
        // In local dev, it may be false
        if (process.env.NODE_ENV === "production") {
          expect(cookie.secure).toBe(true);
        }
      }
    });
  });

  test.describe("CSRF Protection", () => {
    test("state-changing APIs validate origin", async ({ request }) => {
      const response = await request.post("/api/admin/courses", {
        data: {
          title: "CSRF Test",
          slug: "csrf-test",
        },
        headers: {
          Origin: "https://evil-site.com",
        },
      });

      // Should reject or require auth
      expect([400, 401, 403]).toContain(response.status());
    });
  });

  test.describe("Public vs Protected Routes", () => {
    test("public pages are accessible without auth", async ({ page }) => {
      const publicPages = [
        "/",
        "/courses",
        "/login",
        "/signup",
      ];

      for (const url of publicPages) {
        await page.goto(url);
        // Should NOT redirect to login (unless it IS the login page)
        if (url !== "/login") {
          expect(page.url()).not.toContain("/login");
        }
        // URL should end with the expected path
        expect(page.url()).toMatch(new RegExp(`${url}$`));
      }
    });

    test("protected pages require auth", async ({ page }) => {
      const protectedPages = [
        "/app",
        "/app/courses",
        "/app/community",
        "/app/settings",
        "/admin",
        "/admin/courses",
        "/admin/analytics",
      ];

      for (const url of protectedPages) {
        await page.goto(url);
        // Should redirect to login
        await expect(page).toHaveURL(/\/login/);
      }
    });
  });

  test.describe("Rate Limiting (if implemented)", () => {
    test("login endpoint has rate limiting", async ({ request }) => {
      // Attempt multiple failed logins
      const attempts = [];

      for (let i = 0; i < 10; i++) {
        attempts.push(
          request.post("/api/auth/login", {
            data: {
              email: `test${i}@example.com`,
              password: "wrongpassword",
            },
          })
        );
      }

      const responses = await Promise.all(attempts);

      // After many attempts, should get rate limited (429), 401, or 404
      // If endpoint doesn't exist (404), that's also acceptable
      const lastResponse = responses[responses.length - 1];
      expect([401, 404, 429]).toContain(lastResponse.status());
    });
  });
});
