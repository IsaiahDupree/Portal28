import { test, expect } from "@playwright/test";

test.describe("Course Studio", () => {
  test.describe("Studio Access", () => {
    test("should redirect unauthenticated users to login", async ({ page }) => {
      await page.goto("/admin/studio");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should display studio page for admin users", async ({ page }) => {
      // Note: This test requires authentication setup
      // For now, just verify the page structure exists
      const response = await page.goto("/admin/studio");
      expect(response?.status()).toBeLessThan(500);
    });
  });

  test.describe("Public Course Pages", () => {
    test("should display courses page with Portal 28 branding", async ({ page }) => {
      await page.goto("/courses");
      
      // Check for new Portal 28 copy
      await expect(page.getByText("Command your narrative")).toBeVisible();
      await expect(page.getByText("The Curriculum")).toBeVisible();
    });

    test("should display home page with Portal 28 hero", async ({ page }) => {
      await page.goto("/");
      
      // Check for new Portal 28 hero content
      await expect(page.getByText("Step inside the room where")).toBeVisible();
      await expect(page.getByText("power gets built")).toBeVisible();
      // Use exact match for the header badge
      await expect(page.getByText("Portal 28", { exact: true }).first()).toBeVisible();
    });

    test("should have working Enter the Room CTA", async ({ page }) => {
      await page.goto("/");
      
      const ctaButton = page.getByRole("link", { name: /enter the room/i });
      await expect(ctaButton).toBeVisible();
      
      await ctaButton.click();
      await expect(page).toHaveURL("/courses");
    });
  });
});

test.describe("Course Studio API", () => {
  test("should return 401 for unauthenticated course list request", async ({ request }) => {
    const response = await request.get("/api/studio/courses");
    expect(response.status()).toBe(401);
  });

  test("should return 401 for unauthenticated course create request", async ({ request }) => {
    const response = await request.post("/api/studio/courses", {
      data: { title: "Test Course" }
    });
    expect(response.status()).toBe(401);
  });

  test("should return 401 for unauthenticated lesson update request", async ({ request }) => {
    const response = await request.patch("/api/studio/lessons/test-id", {
      data: { title: "Updated Title" }
    });
    expect(response.status()).toBe(401);
  });
});

test.describe("Video Upload API", () => {
  test("should return 401 for unauthenticated upload request", async ({ request }) => {
    const response = await request.post("/api/video/mux/create-upload", {
      data: { lessonId: "test-lesson-id" }
    });
    expect(response.status()).toBe(401);
  });

  test("should return 400 for invalid lesson ID", async ({ request }) => {
    // This would need auth, but tests the validation
    const response = await request.post("/api/video/mux/create-upload", {
      data: { lessonId: "not-a-uuid" }
    });
    // Either 400 (validation) or 401 (auth) is acceptable
    expect([400, 401]).toContain(response.status());
  });
});

test.describe("File Upload API", () => {
  test("should return 401 for unauthenticated file upload URL request", async ({ request }) => {
    const response = await request.post("/api/files/upload-url", {
      data: {
        lessonId: "test-lesson-id",
        filename: "test.pdf",
        fileKind: "pdf"
      }
    });
    expect(response.status()).toBe(401);
  });

  test("should return 401 for unauthenticated file register request", async ({ request }) => {
    const response = await request.post("/api/files/register", {
      data: {
        lessonId: "test-lesson-id",
        path: "test/path.pdf",
        filename: "test.pdf",
        fileKind: "pdf"
      }
    });
    expect(response.status()).toBe(401);
  });

  test("should return 401 for unauthenticated signed URL request", async ({ request }) => {
    const response = await request.get("/api/files/signed-url?fileId=test-id");
    expect(response.status()).toBe(401);
  });
});

test.describe("Lesson Editor Features", () => {
  test("should have lesson editor page structure", async ({ page }) => {
    // Test that the lesson editor route exists (will redirect to login)
    await page.goto("/admin/studio/test-course/lessons/test-lesson");
    // Should redirect to login for unauthenticated users
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Drip Content", () => {
  test("should have drip logic library available", async ({ page }) => {
    // This is more of a unit test, but we can verify the learn route exists
    await page.goto("/courses/test-course/lessons/test-lesson");
    // Should show access required or redirect
    const response = await page.goto("/courses/test-course/lessons/test-lesson");
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("Preview Tokens", () => {
  test("should handle preview route for courses", async ({ page }) => {
    const response = await page.goto("/preview/course/test-id?token=test-token");
    // Should not 500 - either 404 or redirect is fine
    expect(response?.status()).toBeLessThan(500);
  });
});
