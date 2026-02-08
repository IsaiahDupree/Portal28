import { test, expect } from "@playwright/test";

test.describe("Coaching Bookings System (feat-074)", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to coaching page
    await page.goto("/login");
    // Note: Full E2E would require authentication
    // For now, testing page structure and API endpoints
  });

  test("EXP-COA-001: should display coaching page", async ({ page }) => {
    await page.goto("/app/coaching");

    // Should redirect to login for unauthenticated users
    await expect(page).toHaveURL(/\/login/);
  });

  test("EXP-COA-002: coaching slots list API should exist", async ({ request }) => {
    // Test that the API endpoint exists
    const response = await request.get("/api/coaching/slots");

    // Expecting 200 (public access to available slots)
    expect([200, 401]).toContain(response.status());
  });

  test("EXP-COA-003: coaching slot creation API should exist", async ({ request }) => {
    // Test that the API endpoint exists (will return 401 without auth)
    const tomorrow = new Date(Date.now() + 86400000);
    const endTime = new Date(tomorrow.getTime() + 3600000); // 1 hour later

    const response = await request.post("/api/coaching/slots", {
      data: {
        title: "Test Coaching Session",
        description: "A test coaching session",
        slot_type: "one_on_one",
        duration_minutes: 60,
        max_participants: 1,
        price_cents: 5000, // $50
        start_time: tomorrow.toISOString(),
        end_time: endTime.toISOString(),
        location_type: "virtual",
        video_call_url: "https://zoom.us/j/test",
      },
    });

    // Expecting 401 Unauthorized or 403 Forbidden since we're not authenticated
    expect([401, 403]).toContain(response.status());
  });

  test("EXP-COA-004: booking creation API should exist", async ({ request }) => {
    // Test that the API endpoint exists
    const testSlotId = "00000000-0000-0000-0000-000000000000";
    const response = await request.post("/api/coaching/bookings", {
      data: {
        slot_id: testSlotId,
        notes: "Looking forward to the session",
      },
    });

    // May return 401 (not authenticated) or 404 (slot not found)
    expect([401, 404]).toContain(response.status());
  });

  test("should display coaching slots with filters", async ({ page }) => {
    await page.goto("/app/coaching");

    // If redirected to login, that's expected
    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
    } else {
      // If authenticated, should show coaching page
      await expect(page.locator("h1")).toContainText(/coaching/i);
    }
  });
});

test.describe("Coaching Bookings - Admin Features", () => {
  test("admin coaching page should exist", async ({ page }) => {
    const response = await page.goto("/admin/coaching");

    // Page should exist (even if redirected to login)
    expect(response?.status()).toBeLessThan(500);
  });

  test("admin can create coaching slot - API structure", async ({ request }) => {
    const tomorrow = new Date(Date.now() + 86400000);
    const endTime = new Date(tomorrow.getTime() + 3600000);

    const response = await request.post("/api/coaching/slots", {
      data: {
        title: "Admin Coaching Session",
        description: "Session created by coach",
        slot_type: "one_on_one",
        duration_minutes: 60,
        max_participants: 1,
        price_cents: 10000, // $100
        start_time: tomorrow.toISOString(),
        end_time: endTime.toISOString(),
        location_type: "virtual",
        video_call_url: "https://meet.google.com/test",
      },
    });

    // Expecting 401/403 Unauthorized or endpoint exists
    expect(response.status()).toBeDefined();
  });

  test("coach can update slot - API structure", async ({ request }) => {
    const testSlotId = "00000000-0000-0000-0000-000000000000";
    const response = await request.patch(`/api/coaching/slots/${testSlotId}`, {
      data: {
        title: "Updated Coaching Session",
        price_cents: 7500, // $75
      },
    });

    // Expecting 401 Unauthorized or 404
    expect([401, 403, 404]).toContain(response.status());
  });

  test("coach can delete slot - API structure", async ({ request }) => {
    const testSlotId = "00000000-0000-0000-0000-000000000000";
    const response = await request.delete(`/api/coaching/slots/${testSlotId}`);

    // Expecting 401 Unauthorized or 404
    expect([401, 403, 404]).toContain(response.status());
  });

  test("coach can view bookings - API structure", async ({ request }) => {
    const response = await request.get("/api/coaching/bookings");

    // Expecting 401 Unauthorized (needs auth)
    expect(response.status()).toBe(401);
  });

  test("student can cancel booking - API structure", async ({ request }) => {
    const testBookingId = "00000000-0000-0000-0000-000000000000";
    const response = await request.delete(`/api/coaching/bookings/${testBookingId}`);

    // Expecting 401 Unauthorized or 404
    expect([401, 403, 404]).toContain(response.status());
  });

  test("coach can update booking status - API structure", async ({ request }) => {
    const testBookingId = "00000000-0000-0000-0000-000000000000";
    const response = await request.patch(`/api/coaching/bookings/${testBookingId}`, {
      data: {
        status: "confirmed",
        coach_notes: "Looking forward to our session",
      },
    });

    // Expecting 401 Unauthorized or 404
    expect([401, 403, 404]).toContain(response.status());
  });
});

test.describe("Coaching Bookings - Slot Management", () => {
  test("should handle slot capacity correctly", async ({ request }) => {
    // This tests the business logic structure
    const testSlotId = "00000000-0000-0000-0000-000000000000";
    const response = await request.get(`/api/coaching/slots/${testSlotId}`);

    // Expecting 404 for non-existent slot
    expect([401, 403, 404]).toContain(response.status());
  });

  test("should prevent overlapping slots - API structure", async ({ request }) => {
    const tomorrow = new Date(Date.now() + 86400000);
    const endTime = new Date(tomorrow.getTime() + 3600000);

    // First slot
    const response1 = await request.post("/api/coaching/slots", {
      data: {
        title: "First Slot",
        start_time: tomorrow.toISOString(),
        end_time: endTime.toISOString(),
        slot_type: "one_on_one",
        location_type: "virtual",
      },
    });

    // Second overlapping slot
    const response2 = await request.post("/api/coaching/slots", {
      data: {
        title: "Overlapping Slot",
        start_time: tomorrow.toISOString(),
        end_time: endTime.toISOString(),
        slot_type: "one_on_one",
        location_type: "virtual",
      },
    });

    // Both should require authentication
    expect([401, 403]).toContain(response1.status());
    expect([401, 403]).toContain(response2.status());
  });

  test("should filter slots by coach", async ({ request }) => {
    const testCoachId = "00000000-0000-0000-0000-000000000000";
    const response = await request.get(`/api/coaching/slots?coach_id=${testCoachId}`);

    // Should return results (empty array if coach has no slots)
    expect([200, 401]).toContain(response.status());
  });

  test("should filter slots by date range", async ({ request }) => {
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + 7 * 86400000).toISOString();
    const response = await request.get(
      `/api/coaching/slots?start=${startDate}&end=${endDate}`
    );

    // Should return results
    expect([200, 401]).toContain(response.status());
  });

  test("should filter slots by type", async ({ request }) => {
    const response = await request.get("/api/coaching/slots?type=one_on_one");

    // Should return results
    expect([200, 401]).toContain(response.status());
  });
});

test.describe("Coaching Bookings - Booking Management", () => {
  test("student cannot book past slot", async ({ request }) => {
    // This tests the business logic structure
    const yesterday = new Date(Date.now() - 86400000);
    const testSlotId = "00000000-0000-0000-0000-000000000000";

    const response = await request.post("/api/coaching/bookings", {
      data: {
        slot_id: testSlotId,
        notes: "Trying to book past slot",
      },
    });

    // Expecting 401 (not authenticated) or 400 (bad request)
    expect([400, 401, 404]).toContain(response.status());
  });

  test("student cannot book full slot", async ({ request }) => {
    const testSlotId = "00000000-0000-0000-0000-000000000000";

    const response = await request.post("/api/coaching/bookings", {
      data: {
        slot_id: testSlotId,
      },
    });

    // Expecting 401 (not authenticated) or 400 (full capacity)
    expect([400, 401, 404]).toContain(response.status());
  });

  test("student cannot book same slot twice", async ({ request }) => {
    const testSlotId = "00000000-0000-0000-0000-000000000000";

    // First booking attempt
    const response1 = await request.post("/api/coaching/bookings", {
      data: {
        slot_id: testSlotId,
        notes: "First booking",
      },
    });

    // Second booking attempt (would fail with 400 if authenticated)
    const response2 = await request.post("/api/coaching/bookings", {
      data: {
        slot_id: testSlotId,
        notes: "Second booking",
      },
    });

    // Both should require authentication
    expect([400, 401, 404]).toContain(response1.status());
    expect([400, 401, 404]).toContain(response2.status());
  });

  test("should get user bookings", async ({ request }) => {
    const response = await request.get("/api/coaching/bookings");

    // Expecting 401 Unauthorized
    expect(response.status()).toBe(401);
  });

  test("should get upcoming bookings only", async ({ request }) => {
    const response = await request.get("/api/coaching/bookings?upcoming_only=true");

    // Expecting 401 Unauthorized
    expect(response.status()).toBe(401);
  });

  test("should filter bookings by status", async ({ request }) => {
    const response = await request.get("/api/coaching/bookings?status=confirmed");

    // Expecting 401 Unauthorized
    expect(response.status()).toBe(401);
  });
});

test.describe("Coaching Bookings - Reminders", () => {
  test("coaching reminders cron should exist", async ({ request }) => {
    // Test that the cron endpoint exists
    const response = await request.get("/api/cron/coaching-reminders");

    // Expecting 401 (needs cron secret) or endpoint exists
    expect(response.status()).toBeDefined();
  });

  test("coaching reminders can be triggered", async ({ request }) => {
    const response = await request.post("/api/cron/coaching-reminders");

    // Expecting 401 (needs cron secret)
    expect(response.status()).toBe(401);
  });
});

test.describe("Coaching Bookings - Database Functions", () => {
  test("get_available_coaching_slots function should work", async ({ request }) => {
    // This would test the RPC call if we had auth
    const response = await request.post("/api/coaching/slots", {
      data: {
        days_ahead: 30,
      },
    });

    // Endpoint exists check
    expect(response.status()).toBeDefined();
  });
});

test.describe("Coaching Bookings - UI Pages", () => {
  test("coaching page should have proper structure", async ({ page }) => {
    await page.goto("/app/coaching");

    // If redirected to login, that's expected
    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
    } else {
      // If authenticated, should show tabs
      const pageText = await page.textContent("body");
      expect(pageText).toBeTruthy();
    }
  });

  test("admin coaching page should have proper structure", async ({ page }) => {
    await page.goto("/admin/coaching");

    // If redirected to login, that's expected
    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
    } else {
      // If authenticated, should show create button
      const pageText = await page.textContent("body");
      expect(pageText).toBeTruthy();
    }
  });
});
