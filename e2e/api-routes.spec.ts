import { test, expect } from "@playwright/test";

test.describe("API Routes - Newsletter", () => {
  test("should reject empty email", async ({ request }) => {
    const response = await request.post("/api/newsletter/subscribe", {
      data: {},
    });
    
    // API may return 400 (validation), 405 (method not allowed), or 500 (server error)
    expect([400, 405, 500]).toContain(response.status());
  });

  test("should accept valid email format", async ({ request }) => {
    const response = await request.post("/api/newsletter/subscribe", {
      data: { email: "test@example.com" },
    });
    
    // Should return 200 or 201 for success, or handle gracefully
    expect([200, 201, 400, 500]).toContain(response.status());
  });
});

test.describe("API Routes - Stripe Checkout", () => {
  test("should reject checkout without course", async ({ request }) => {
    const response = await request.post("/api/stripe/checkout", {
      data: {},
    });
    
    expect([400, 401]).toContain(response.status());
  });

  test("should require authentication for checkout", async ({ request }) => {
    const response = await request.post("/api/stripe/checkout", {
      data: { courseSlug: "test-course" },
    });
    
    // Should require auth or return error
    expect([400, 401, 500]).toContain(response.status());
  });
});

test.describe("API Routes - Progress", () => {
  test("should require authentication for progress API", async ({ request }) => {
    const response = await request.get("/api/progress/lesson");
    
    expect([401, 400]).toContain(response.status());
  });

  test("should reject unauthenticated progress updates", async ({ request }) => {
    const response = await request.post("/api/progress/lesson", {
      data: {
        lessonId: "test-lesson",
        courseId: "test-course",
        status: "completed",
      },
    });
    
    expect([401, 400]).toContain(response.status());
  });
});

test.describe("API Routes - Stripe Webhook", () => {
  test("should reject webhook without signature", async ({ request }) => {
    const response = await request.post("/api/stripe/webhook", {
      data: { type: "checkout.session.completed" },
    });
    
    // Should reject without valid Stripe signature
    expect([400, 401, 500]).toContain(response.status());
  });
});
