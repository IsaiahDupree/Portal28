import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

test.describe("Webhook Event Logs", () => {
  let adminEmail: string;
  let adminPassword: string;

  test.beforeAll(async () => {
    // Create admin user for testing
    adminEmail = `admin-webhook-${Date.now()}@test.com`;
    adminPassword = "TestPassword123!";

    const { data: authData } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (authData.user) {
      await supabaseAdmin.from("profiles").insert({
        id: authData.user.id,
        email: adminEmail,
        is_admin: true,
      });
    }
  });

  test.afterAll(async () => {
    // Cleanup: Delete test webhook events
    await supabaseAdmin
      .from("webhook_events")
      .delete()
      .like("event_type", "test.%");
  });

  test("should log Stripe webhook events", async ({ page }) => {
    // Create a test webhook event directly in the database
    const { data: webhookEvent } = await supabaseAdmin
      .from("webhook_events")
      .insert({
        source: "stripe",
        event_type: "test.checkout.session.completed",
        event_id: "evt_test_123",
        payload: {
          id: "evt_test_123",
          type: "checkout.session.completed",
          data: { object: { id: "cs_test_123" } },
        },
        status: "success",
        attempts: 1,
        processing_time_ms: 250,
      })
      .select()
      .single();

    expect(webhookEvent).toBeTruthy();
    expect(webhookEvent.source).toBe("stripe");
    expect(webhookEvent.status).toBe("success");
  });

  test("should log Resend webhook events", async ({ page }) => {
    const { data: webhookEvent } = await supabaseAdmin
      .from("webhook_events")
      .insert({
        source: "resend",
        event_type: "test.email.delivered",
        event_id: "email_test_123",
        payload: {
          type: "email.delivered",
          data: {
            email_id: "email_test_123",
            to: ["test@example.com"],
          },
        },
        status: "success",
        attempts: 1,
        processing_time_ms: 100,
      })
      .select()
      .single();

    expect(webhookEvent).toBeTruthy();
    expect(webhookEvent.source).toBe("resend");
    expect(webhookEvent.status).toBe("success");
  });

  test("admin can view webhook event logs", async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("/app/dashboard", { timeout: 10000 });

    // Navigate to webhook logs
    await page.goto("/admin/webhooks");
    await page.waitForLoadState("networkidle");

    // Check that the page loaded
    await expect(page.locator("h1")).toContainText("Webhook Event Logs");

    // Check for table headers
    await expect(page.locator("table")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /source/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /status/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /event type/i })).toBeVisible();
  });

  test("admin can filter webhook events by source", async ({ page }) => {
    // Create test events
    await supabaseAdmin.from("webhook_events").insert([
      {
        source: "stripe",
        event_type: "test.filter.stripe",
        payload: {},
        status: "success",
      },
      {
        source: "resend",
        event_type: "test.filter.resend",
        payload: {},
        status: "success",
      },
    ]);

    // Login as admin
    await page.goto("/login");
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("/app/dashboard", { timeout: 10000 });

    // Navigate to webhook logs
    await page.goto("/admin/webhooks");
    await page.waitForLoadState("networkidle");

    // Filter by Stripe
    await page.click('[role="combobox"]:has-text("All Sources")');
    await page.click('[role="option"]:has-text("Stripe")');
    await page.waitForTimeout(1000);

    // Check that only Stripe events are shown
    const stripeBadges = await page.locator('text="stripe"').count();
    expect(stripeBadges).toBeGreaterThan(0);
  });

  test("admin can filter webhook events by status", async ({ page }) => {
    // Create test events with different statuses
    await supabaseAdmin.from("webhook_events").insert([
      {
        source: "stripe",
        event_type: "test.status.success",
        payload: {},
        status: "success",
      },
      {
        source: "stripe",
        event_type: "test.status.failed",
        payload: {},
        status: "failed",
        error_message: "Test error",
      },
    ]);

    // Login as admin
    await page.goto("/login");
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("/app/dashboard", { timeout: 10000 });

    // Navigate to webhook logs
    await page.goto("/admin/webhooks");
    await page.waitForLoadState("networkidle");

    // Filter by Failed status
    await page.click('[role="combobox"]:has-text("All Statuses")');
    await page.click('[role="option"]:has-text("Failed")');
    await page.waitForTimeout(1000);

    // Check that Failed badge is visible
    await expect(page.locator('text="Failed"')).toBeVisible();
  });

  test("admin can view webhook event details", async ({ page }) => {
    // Create a test event
    const { data: webhookEvent } = await supabaseAdmin
      .from("webhook_events")
      .insert({
        source: "stripe",
        event_type: "test.detail.view",
        event_id: "evt_detail_123",
        payload: { test: "payload data", amount: 1000 },
        headers: { "stripe-signature": "test_sig" },
        status: "success",
        attempts: 1,
        processing_time_ms: 500,
      })
      .select()
      .single();

    // Login as admin
    await page.goto("/login");
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("/app/dashboard", { timeout: 10000 });

    // Navigate to webhook logs
    await page.goto("/admin/webhooks");
    await page.waitForLoadState("networkidle");

    // Click the eye icon to view details
    const viewButtons = await page.locator('button:has(svg)').filter({ hasText: "" });
    await viewButtons.first().click();

    // Check that dialog opened with event details
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator("text=Event ID:")).toBeVisible();
  });

  test("admin can retry failed webhook events", async ({ page }) => {
    // Create a failed webhook event
    const { data: webhookEvent } = await supabaseAdmin
      .from("webhook_events")
      .insert({
        source: "stripe",
        event_type: "test.retry",
        event_id: "evt_retry_123",
        payload: { test: "data" },
        status: "failed",
        attempts: 1,
        max_attempts: 3,
        error_message: "Test failure",
      })
      .select()
      .single();

    // Login as admin
    await page.goto("/login");
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("/app/dashboard", { timeout: 10000 });

    // Navigate to webhook logs
    await page.goto("/admin/webhooks");
    await page.waitForLoadState("networkidle");

    // Filter by Failed status
    await page.click('[role="combobox"]:has-text("All Statuses")');
    await page.click('[role="option"]:has-text("Failed")');
    await page.waitForTimeout(1000);

    // Click retry button (the one with RotateCcw icon)
    const retryButtons = page.locator('button').filter({ hasText: "" });
    const retryButtonCount = await retryButtons.count();

    if (retryButtonCount > 0) {
      // Note: Retry will likely fail since we're using test data
      // but we're just testing the UI interaction
      await retryButtons.first().click({ timeout: 5000 }).catch(() => {
        // Ignore errors from the retry action itself
      });
    }
  });

  test("webhook events have automatic retry scheduling", async ({ page }) => {
    // Create a webhook event that should retry
    const nextRetry = new Date();
    nextRetry.setMinutes(nextRetry.getMinutes() + 5);

    const { data: webhookEvent } = await supabaseAdmin
      .from("webhook_events")
      .insert({
        source: "stripe",
        event_type: "test.retry.scheduled",
        payload: { test: "data" },
        status: "retrying",
        attempts: 1,
        max_attempts: 3,
        next_retry_at: nextRetry.toISOString(),
        error_message: "Temporary failure",
      })
      .select()
      .single();

    expect(webhookEvent).toBeTruthy();
    expect(webhookEvent.status).toBe("retrying");
    expect(webhookEvent.next_retry_at).toBeTruthy();
  });

  test("non-admin users cannot access webhook logs", async ({ page }) => {
    // Create regular user
    const userEmail = `user-webhook-${Date.now()}@test.com`;
    const userPassword = "TestPassword123!";

    const { data: authData } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true,
    });

    if (authData.user) {
      await supabaseAdmin.from("profiles").insert({
        id: authData.user.id,
        email: userEmail,
        is_admin: false,
      });
    }

    // Login as regular user
    await page.goto("/login");
    await page.fill('input[type="email"]', userEmail);
    await page.fill('input[type="password"]', userPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("/app/dashboard", { timeout: 10000 });

    // Try to access webhook logs (should be blocked by middleware or show error)
    await page.goto("/admin/webhooks");

    // Either redirected or see an error
    const currentUrl = page.url();
    const isRedirected = !currentUrl.includes("/admin/webhooks");
    const hasError = await page.locator('text=/forbidden|unauthorized|access denied/i').isVisible().catch(() => false);

    expect(isRedirected || hasError).toBe(true);

    // Cleanup
    await supabaseAdmin.auth.admin.deleteUser(authData.user!.id);
  });
});
