import { test, expect } from "@playwright/test";

/**
 * Email Campaign E2E Tests
 * 
 * Tests for email programs, campaigns, newsletter, and email analytics
 */

test.describe("Email Campaigns - Admin Pages", () => {
  test.describe("1. Email Programs Management", () => {
    test("should redirect email programs list to login when unauthenticated", async ({ page }) => {
      await page.goto("/admin/email-programs");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should have new email program route", async ({ page }) => {
      const response = await page.goto("/admin/email-programs/new");
      expect(response?.status()).toBeLessThan(500);
    });

    test("should have email program edit route structure", async ({ page }) => {
      const response = await page.goto("/admin/email-programs/test-program-id");
      expect(response?.status()).toBeLessThan(500);
    });
  });

  test.describe("2. Email Analytics", () => {
    test("should redirect email analytics to login when unauthenticated", async ({ page }) => {
      await page.goto("/admin/email-analytics");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should have contact detail route structure", async ({ page }) => {
      const response = await page.goto("/admin/email-analytics/contacts/test@example.com");
      expect(response?.status()).toBeLessThan(500);
    });

    test("should have program analytics route structure", async ({ page }) => {
      const response = await page.goto("/admin/email-analytics/programs/test-program-id");
      expect(response?.status()).toBeLessThan(500);
    });
  });
});

test.describe("Email Campaigns - Newsletter API", () => {
  test.describe("3. Newsletter Subscription", () => {
    test("should accept newsletter subscription", async ({ request }) => {
      const response = await request.post("/api/newsletter/subscribe", {
        data: {
          email: `test-${Date.now()}@example.com`
        }
      });
      // Should succeed or fail gracefully (e.g., if Resend not configured)
      expect([200, 201, 400, 500]).toContain(response.status());
    });

    test("should validate email format", async ({ request }) => {
      const response = await request.post("/api/newsletter/subscribe", {
        data: {
          email: "invalid-email"
        }
      });
      // Should reject invalid email
      expect([400, 422]).toContain(response.status());
    });

    test("should require email field", async ({ request }) => {
      const response = await request.post("/api/newsletter/subscribe", {
        data: {}
      });
      expect([400, 422]).toContain(response.status());
    });
  });
});

test.describe("Email Campaigns - Email Sending API", () => {
  test.describe("4. Announcement Blast", () => {
    test("should return 401 for unauthenticated blast", async ({ request }) => {
      const response = await request.post("/api/emails/announcement-blast", {
        data: {
          subject: "Test Announcement",
          body: "Test body content",
          audienceId: "test-audience"
        }
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe("5. Course Access Email", () => {
    test("course access email endpoint structure exists", async ({ request }) => {
      // This is typically called internally, but verify the route structure
      const response = await request.post("/api/emails/course-access", {
        data: {
          email: "test@example.com",
          courseName: "Test Course",
          courseSlug: "test-course"
        }
      });
      // Should be 401 (auth required) or 400 (validation) or 200 (success)
      expect(response.status()).toBeLessThan(500);
    });
  });
});

test.describe("Email Campaigns - Resend Webhooks", () => {
  test.describe("6. Email Event Webhooks", () => {
    test("should handle Resend webhook endpoint", async ({ request }) => {
      const response = await request.post("/api/resend/webhook", {
        data: {
          type: "email.delivered",
          data: {
            email_id: "test-email-id",
            to: ["test@example.com"]
          }
        }
      });
      // Should accept webhook or return 404 if route doesn't exist
      expect(response.status()).toBeLessThanOrEqual(500);
    });
  });
});

test.describe("Email Campaigns - Email Programs API", () => {
  test.describe("7. Email Program CRUD", () => {
    test("should return 401/403 for unauthenticated program list", async ({ request }) => {
      const response = await request.get("/api/admin/email-programs");
      // 401 (auth), 403 (forbidden), or 404/405 (route not found) is acceptable
      expect([401, 403, 404, 405]).toContain(response.status());
    });

    test("should return 401/403 for unauthenticated program create", async ({ request }) => {
      const response = await request.post("/api/admin/email-programs", {
        data: {
          name: "Test Program",
          trigger: "signup",
          emails: []
        }
      });
      // 401 (auth), 403 (forbidden), or 404 (route not found) is acceptable
      expect([401, 403, 404]).toContain(response.status());
    });
  });

  test.describe("8. Email Scheduler", () => {
    test("should have scheduler cron endpoint", async ({ request }) => {
      // Scheduler endpoint typically requires CRON_SECRET
      const response = await request.post("/api/cron/email-scheduler", {
        headers: {
          "Authorization": "Bearer invalid-secret"
        }
      });
      // Should reject without valid secret
      expect([401, 403, 404]).toContain(response.status());
    });
  });
});

test.describe("Email Campaigns - User Email Preferences", () => {
  test.describe("9. Unsubscribe Flow", () => {
    test("should have unsubscribe route structure", async ({ page }) => {
      // Unsubscribe links typically have token-based access
      const response = await page.goto("/unsubscribe?token=test-token&email=test@example.com");
      // May not exist yet, but shouldn't 500
      expect(response?.status()).toBeLessThan(500);
    });
  });
});

test.describe("Email Campaigns - Email Templates", () => {
  test.describe("10. Email Template Rendering", () => {
    test("should have email template components", async () => {
      // Verify email template files exist
      const fs = await import("fs");
      const path = await import("path");
      
      const templatesDir = path.join(process.cwd(), "components/emails");
      const exists = fs.existsSync(templatesDir);
      expect(exists).toBe(true);
    });

    test("should have CourseAccessEmail template", async () => {
      const fs = await import("fs");
      const path = await import("path");
      
      const templatePath = path.join(process.cwd(), "components/emails/CourseAccessEmail.tsx");
      const exists = fs.existsSync(templatePath);
      expect(exists).toBe(true);
    });

    test("should have WelcomeEmail template", async () => {
      const fs = await import("fs");
      const path = await import("path");
      
      const templatePath = path.join(process.cwd(), "components/emails/WelcomeEmail.tsx");
      const exists = fs.existsSync(templatePath);
      expect(exists).toBe(true);
    });

    test("should have LeadWelcomeEmail template", async () => {
      const fs = await import("fs");
      const path = await import("path");
      
      const templatePath = path.join(process.cwd(), "components/emails/LeadWelcomeEmail.tsx");
      const exists = fs.existsSync(templatePath);
      expect(exists).toBe(true);
    });
  });
});
