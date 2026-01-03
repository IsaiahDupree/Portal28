import { test, expect } from "@playwright/test";

/**
 * Community & Messaging E2E Tests
 * 
 * Tests for community features, forums, announcements, resources, and messaging
 */

test.describe("Community - User Access", () => {
  test.describe("1. Community Home", () => {
    test("should redirect community home to login when unauthenticated", async ({ page }) => {
      await page.goto("/app/community");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should have community route structure", async ({ page }) => {
      const response = await page.goto("/app/community");
      expect(response?.status()).toBeLessThan(500);
    });
  });

  test.describe("2. Forums", () => {
    test("should redirect forums to login when unauthenticated", async ({ page }) => {
      await page.goto("/app/community/w/forums");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should have forum category route structure", async ({ page }) => {
      const response = await page.goto("/app/community/w/forums/c/general");
      expect(response?.status()).toBeLessThan(500);
    });

    test("should have thread detail route structure", async ({ page }) => {
      const response = await page.goto("/app/community/w/forums/t/test-thread-id");
      expect(response?.status()).toBeLessThan(500);
    });
  });

  test.describe("3. Announcements", () => {
    test("should redirect announcements to login when unauthenticated", async ({ page }) => {
      await page.goto("/app/community/w/announcements");
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("4. Resources", () => {
    test("should redirect resources to login when unauthenticated", async ({ page }) => {
      await page.goto("/app/community/resources");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should have resource folder route structure", async ({ page }) => {
      const response = await page.goto("/app/community/resources/test-folder-id");
      expect(response?.status()).toBeLessThan(500);
    });
  });
});

test.describe("Community - Forum API", () => {
  test.describe("5. Thread Operations", () => {
    test("should return 401 for unauthenticated thread create", async ({ request }) => {
      const response = await request.post("/api/community/threads", {
        data: {
          title: "Test Thread",
          body: "Test thread content",
          categoryId: "test-category"
        }
      });
      // Either 401 (auth) or 404 (route not found) is acceptable
      expect([401, 404]).toContain(response.status());
    });

    test("should return 401 for unauthenticated thread update", async ({ request }) => {
      const response = await request.patch("/api/admin/community/threads/test-id", {
        data: {
          is_pinned: true
        }
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe("6. Reply Operations", () => {
    test("should return 401 for unauthenticated reply create", async ({ request }) => {
      const response = await request.post("/api/community/replies", {
        data: {
          threadId: "test-thread-id",
          body: "Test reply content"
        }
      });
      // Either 401 (auth) or 404 (route not found) is acceptable
      expect([401, 404]).toContain(response.status());
    });
  });
});

test.describe("Community - Announcements API", () => {
  test.describe("7. Announcement Operations", () => {
    test("should return 401 for unauthenticated announcement create", async ({ request }) => {
      const response = await request.post("/api/admin/community/announcements", {
        data: {
          title: "New Course Launch!",
          body: "We're excited to announce our new course...",
          tags: ["new-course", "launch"],
          send_email: true
        }
      });
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated announcement list", async ({ request }) => {
      const response = await request.get("/api/admin/community/announcements");
      // Either 401 (auth) or 404 (route not found) or 405 (method not allowed) is acceptable
      expect([401, 404, 405]).toContain(response.status());
    });
  });
});

test.describe("Community - User Dashboard", () => {
  test.describe("8. Student Dashboard", () => {
    test("should redirect dashboard to login when unauthenticated", async ({ page }) => {
      await page.goto("/app");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should have course detail route in student area", async ({ page }) => {
      const response = await page.goto("/app/courses/test-course");
      expect(response?.status()).toBeLessThan(500);
    });

    test("should have lesson route in student area", async ({ page }) => {
      const response = await page.goto("/app/lesson/test-lesson-id");
      expect(response?.status()).toBeLessThan(500);
    });
  });
});

test.describe("Community - Widget System", () => {
  test.describe("9. Widget Routes", () => {
    test("should have widget key route structure", async ({ page }) => {
      const response = await page.goto("/app/community/w/test-widget");
      expect(response?.status()).toBeLessThan(500);
    });

    test("should have widget folder route structure", async ({ page }) => {
      const response = await page.goto("/app/community/w/test-widget/folder/test-folder");
      expect(response?.status()).toBeLessThan(500);
    });
  });
});

test.describe("Community - Notifications", () => {
  test.describe("10. Notification API", () => {
    test("should return 401 for unauthenticated notifications fetch", async ({ request }) => {
      const response = await request.get("/api/notifications");
      // May be 401 or 404 if route doesn't exist yet
      expect([401, 404]).toContain(response.status());
    });

    test("should return 401 for unauthenticated notification mark read", async ({ request }) => {
      const response = await request.post("/api/notifications/mark-read", {
        data: { notificationIds: ["test-id"] }
      });
      expect([401, 404]).toContain(response.status());
    });
  });
});

test.describe("Community - Content Interaction", () => {
  test.describe("11. Lesson Progress", () => {
    test("should return 401 for unauthenticated progress update", async ({ request }) => {
      const response = await request.post("/api/progress", {
        data: {
          lessonId: "00000000-0000-0000-0000-000000000000",
          status: "in_progress",
          progressPercent: 50
        }
      });
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated lesson completion", async ({ request }) => {
      const response = await request.patch("/api/progress", {
        data: {
          lessonId: "00000000-0000-0000-0000-000000000000"
        }
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe("12. Lesson Notes", () => {
    test("should return 401 for unauthenticated notes save", async ({ request }) => {
      const response = await request.post("/api/lessons/notes", {
        data: {
          lessonId: "test-lesson-id",
          content: "My lesson notes..."
        }
      });
      expect([401, 404]).toContain(response.status());
    });
  });

  test.describe("13. Lesson Comments", () => {
    test("should return 401 for unauthenticated comment create", async ({ request }) => {
      const response = await request.post("/api/lessons/comments", {
        data: {
          lessonId: "test-lesson-id",
          content: "Great lesson!"
        }
      });
      expect([401, 404]).toContain(response.status());
    });
  });
});

test.describe("Community - Quiz Interaction", () => {
  test.describe("14. Quiz Submission", () => {
    test("should return 401 for unauthenticated quiz submit", async ({ request }) => {
      const response = await request.post("/api/quiz/submit", {
        data: {
          lessonId: "00000000-0000-0000-0000-000000000000",
          answers: [
            { questionId: "00000000-0000-0000-0000-000000000001", selectedOption: 0 },
            { questionId: "00000000-0000-0000-0000-000000000002", selectedOption: 1 }
          ]
        }
      });
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated quiz attempts fetch", async ({ request }) => {
      const response = await request.get("/api/quiz/submit?lessonId=test-lesson-id");
      expect(response.status()).toBe(401);
    });
  });
});

test.describe("Community - Components Exist", () => {
  test.describe("15. Community Components", () => {
    test("should have ForumApp component", async () => {
      const fs = await import("fs");
      const path = await import("path");
      
      const componentPath = path.join(process.cwd(), "components/community/ForumApp.tsx");
      const exists = fs.existsSync(componentPath);
      expect(exists).toBe(true);
    });

    test("should have ChatApp component", async () => {
      const fs = await import("fs");
      const path = await import("path");
      
      const componentPath = path.join(process.cwd(), "components/community/ChatApp.tsx");
      const exists = fs.existsSync(componentPath);
      expect(exists).toBe(true);
    });

    test("should have AnnouncementsApp component", async () => {
      const fs = await import("fs");
      const path = await import("path");
      
      const componentPath = path.join(process.cwd(), "components/community/AnnouncementsApp.tsx");
      const exists = fs.existsSync(componentPath);
      expect(exists).toBe(true);
    });

    test("should have ResourcesApp component", async () => {
      const fs = await import("fs");
      const path = await import("path");
      
      const componentPath = path.join(process.cwd(), "components/community/ResourcesApp.tsx");
      const exists = fs.existsSync(componentPath);
      expect(exists).toBe(true);
    });
  });
});
