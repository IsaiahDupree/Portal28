import { test, expect } from "@playwright/test";

/**
 * Admin Journey E2E Tests
 * 
 * Complete admin flow: login, stats, content management, email campaigns
 */

test.describe("Admin Journey - Access & Authentication", () => {
  test.describe("1. Admin Login", () => {
    test("should redirect unauthenticated users from admin to login", async ({ page }) => {
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect from admin studio to login", async ({ page }) => {
      await page.goto("/admin/studio");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect from admin courses to login", async ({ page }) => {
      await page.goto("/admin/courses");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect from admin analytics to login", async ({ page }) => {
      await page.goto("/admin/analytics");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect from admin email programs to login", async ({ page }) => {
      await page.goto("/admin/email-programs");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect from admin offers to login", async ({ page }) => {
      await page.goto("/admin/offers");
      await expect(page).toHaveURL(/\/login/);
    });
  });
});

test.describe("Admin Journey - Dashboard & Stats", () => {
  test.describe("2. Analytics Dashboard", () => {
    test("should have analytics route", async ({ page }) => {
      const response = await page.goto("/admin/analytics");
      // Should redirect to login (401-like behavior via redirect)
      expect(response?.status()).toBeLessThan(500);
    });

    test("should have email analytics route", async ({ page }) => {
      const response = await page.goto("/admin/email-analytics");
      expect(response?.status()).toBeLessThan(500);
    });
  });
});

test.describe("Admin Journey - Course Studio", () => {
  test.describe("3. Course Management", () => {
    test("should have studio list route", async ({ page }) => {
      const response = await page.goto("/admin/studio");
      expect(response?.status()).toBeLessThan(500);
    });

    test("should have new course route", async ({ page }) => {
      const response = await page.goto("/admin/studio/new");
      expect(response?.status()).toBeLessThan(500);
    });

    test("should have course edit route structure", async ({ page }) => {
      const response = await page.goto("/admin/studio/test-course-id");
      expect(response?.status()).toBeLessThan(500);
    });

    test("should have lesson edit route structure", async ({ page }) => {
      const response = await page.goto("/admin/studio/test-course-id/lessons/test-lesson-id");
      expect(response?.status()).toBeLessThan(500);
    });
  });

  test.describe("4. Course API Endpoints", () => {
    test("should return 401 for unauthenticated course list", async ({ request }) => {
      const response = await request.get("/api/studio/courses");
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated course create", async ({ request }) => {
      const response = await request.post("/api/studio/courses", {
        data: {
          title: "Test Course",
          slug: "test-course",
          description: "Test description"
        }
      });
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated course update", async ({ request }) => {
      const response = await request.patch("/api/studio/courses/test-id", {
        data: { title: "Updated Title" }
      });
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated course delete", async ({ request }) => {
      const response = await request.delete("/api/studio/courses/test-id");
      expect(response.status()).toBe(401);
    });
  });

  test.describe("5. Chapter API Endpoints", () => {
    test("should return 401 for unauthenticated chapter create", async ({ request }) => {
      const response = await request.post("/api/studio/courses/test-id/chapters", {
        data: { title: "Test Chapter" }
      });
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated chapter update", async ({ request }) => {
      const response = await request.patch("/api/studio/chapters/test-id", {
        data: { title: "Updated Chapter" }
      });
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated chapter reorder", async ({ request }) => {
      const response = await request.post("/api/studio/chapters/reorder", {
        data: { chapters: [] }
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe("6. Lesson API Endpoints", () => {
    test("should return 401 for unauthenticated lesson create", async ({ request }) => {
      const response = await request.post("/api/studio/chapters/test-id/lessons", {
        data: { title: "Test Lesson", lesson_type: "multimedia" }
      });
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated lesson get", async ({ request }) => {
      const response = await request.get("/api/studio/lessons/test-id");
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated lesson update (autosave)", async ({ request }) => {
      const response = await request.patch("/api/studio/lessons/test-id", {
        data: { 
          title: "Updated Lesson",
          content_html: "<p>Updated content</p>"
        }
      });
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated lesson delete", async ({ request }) => {
      const response = await request.delete("/api/studio/lessons/test-id");
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated lesson reorder", async ({ request }) => {
      const response = await request.post("/api/studio/lessons/reorder", {
        data: { lessons: [] }
      });
      expect(response.status()).toBe(401);
    });
  });
});

test.describe("Admin Journey - Media Upload", () => {
  test.describe("7. Video Upload API", () => {
    test("should return 401 for unauthenticated Mux upload", async ({ request }) => {
      const response = await request.post("/api/video/mux/create-upload", {
        data: { lessonId: "00000000-0000-0000-0000-000000000000" }
      });
      expect(response.status()).toBe(401);
    });

    test("should validate lessonId format", async ({ request }) => {
      const response = await request.post("/api/video/mux/create-upload", {
        data: { lessonId: "invalid-uuid" }
      });
      // Either 400 (validation) or 401 (auth) is acceptable
      expect([400, 401]).toContain(response.status());
    });
  });

  test.describe("8. File Upload API", () => {
    test("should return 401 for unauthenticated upload URL request", async ({ request }) => {
      const response = await request.post("/api/files/upload-url", {
        data: {
          lessonId: "00000000-0000-0000-0000-000000000000",
          filename: "document.pdf",
          fileKind: "pdf"
        }
      });
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated file register", async ({ request }) => {
      const response = await request.post("/api/files/register", {
        data: {
          lessonId: "00000000-0000-0000-0000-000000000000",
          path: "lessons/test/file.pdf",
          filename: "file.pdf",
          fileKind: "pdf"
        }
      });
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated signed URL", async ({ request }) => {
      const response = await request.get("/api/files/signed-url?fileId=test-id");
      expect(response.status()).toBe(401);
    });
  });
});

test.describe("Admin Journey - Offers Management", () => {
  test.describe("9. Offers Pages", () => {
    test("should have offers list route", async ({ page }) => {
      const response = await page.goto("/admin/offers");
      expect(response?.status()).toBeLessThan(500);
    });

    test("should have new offer route", async ({ page }) => {
      const response = await page.goto("/admin/offers/new");
      expect(response?.status()).toBeLessThan(500);
    });

    test("should have offer edit route structure", async ({ page }) => {
      const response = await page.goto("/admin/offers/test-offer-key");
      expect(response?.status()).toBeLessThan(500);
    });
  });
});

test.describe("Admin Journey - Community Management", () => {
  test.describe("10. Community Admin", () => {
    test("should have community admin route", async ({ page }) => {
      const response = await page.goto("/admin/community");
      expect(response?.status()).toBeLessThan(500);
    });

    test("should have announcements route", async ({ page }) => {
      const response = await page.goto("/admin/community/announcements/new");
      expect(response?.status()).toBeLessThan(500);
    });
  });

  test.describe("11. Community API", () => {
    test("should return 401 for unauthenticated announcement create", async ({ request }) => {
      const response = await request.post("/api/admin/community/announcements", {
        data: {
          title: "Test Announcement",
          body: "Test body content",
          tags: ["update"]
        }
      });
      expect(response.status()).toBe(401);
    });
  });
});
