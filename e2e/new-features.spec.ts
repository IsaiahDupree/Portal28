import { test, expect } from "@playwright/test";

test.describe("Quiz Submission API", () => {
  test("should return 401 for unauthenticated quiz submission", async ({ request }) => {
    const response = await request.post("/api/quiz/submit", {
      data: {
        lessonId: "00000000-0000-0000-0000-000000000000",
        answers: [{ questionId: "00000000-0000-0000-0000-000000000001", selectedOption: 0 }]
      }
    });
    expect(response.status()).toBe(401);
  });

  test("should return 401 for unauthenticated quiz attempts fetch", async ({ request }) => {
    const response = await request.get("/api/quiz/submit?lessonId=test-id");
    expect(response.status()).toBe(401);
  });

  test("should validate quiz submission payload", async ({ request }) => {
    const response = await request.post("/api/quiz/submit", {
      data: {
        lessonId: "invalid-uuid",
        answers: []
      }
    });
    // Either 400 (validation) or 401 (auth) is acceptable
    expect([400, 401]).toContain(response.status());
  });
});

test.describe("Progress Tracking API", () => {
  test("should return 401 for unauthenticated progress update", async ({ request }) => {
    const response = await request.post("/api/progress", {
      data: {
        lessonId: "00000000-0000-0000-0000-000000000000",
        progressPercent: 50,
        status: "in_progress"
      }
    });
    expect(response.status()).toBe(401);
  });

  test("should return 401 for unauthenticated progress fetch", async ({ request }) => {
    const response = await request.get("/api/progress?courseId=test-id");
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

  test("should require lessonId for progress update", async ({ request }) => {
    const response = await request.post("/api/progress", {
      data: {
        progressPercent: 50
      }
    });
    // Either 400 (validation) or 401 (auth) is acceptable
    expect([400, 401]).toContain(response.status());
  });
});

test.describe("Course Preview Routes", () => {
  test("should show preview link required message without token", async ({ page }) => {
    await page.goto("/preview/course/00000000-0000-0000-0000-000000000000");
    
    // Should show a message about needing a preview link
    await expect(page.getByText(/preview.*required|preview link/i)).toBeVisible();
  });

  test("should handle invalid preview token gracefully", async ({ page }) => {
    await page.goto("/preview/course/00000000-0000-0000-0000-000000000000?token=invalid");
    
    // Should show invalid or expired message
    const content = await page.textContent("body");
    const hasErrorMessage = 
      content?.toLowerCase().includes("invalid") ||
      content?.toLowerCase().includes("expired") ||
      content?.toLowerCase().includes("not found");
    expect(hasErrorMessage).toBe(true);
  });

  test("should not return 500 for preview route", async ({ page }) => {
    const response = await page.goto("/preview/course/test-id?token=test");
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("Lesson Preview Routes", () => {
  test("should show preview link required for lesson without token", async ({ page }) => {
    await page.goto("/preview/lesson/00000000-0000-0000-0000-000000000000");
    
    // Should show a message about needing a preview link
    await expect(page.getByText(/preview.*required|preview link|token/i)).toBeVisible();
  });

  test("should not return 500 for lesson preview route", async ({ page }) => {
    const response = await page.goto("/preview/lesson/test-id?token=test");
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("Storage API", () => {
  test("should return 401 for unauthenticated file upload URL request", async ({ request }) => {
    const response = await request.post("/api/files/upload-url", {
      data: {
        lessonId: "00000000-0000-0000-0000-000000000000",
        filename: "test.pdf",
        fileKind: "pdf"
      }
    });
    expect(response.status()).toBe(401);
  });
});

test.describe("Health Check", () => {
  test("should have health check script available", async ({ page }) => {
    // Verify the health check script exists by checking package.json scripts
    const fs = await import("fs");
    const packageJson = JSON.parse(
      fs.readFileSync("./package.json", "utf-8")
    );
    expect(packageJson.scripts["health-check"]).toBeDefined();
  });
});
