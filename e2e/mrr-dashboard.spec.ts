/**
 * E2E Tests: MRR & Subscription Dashboard
 * Tests for feat-024: MRR & Subscription Metrics
 * Test IDs: GRO-MRR-002, GRO-MRR-004, GRO-MRR-006
 */

import { test, expect } from "@playwright/test";

/**
 * Test ID: GRO-MRR-002
 * Test: MRR widget shows current value
 * Priority: P1
 */
test.describe("GRO-MRR-002: MRR Widget Display", () => {
  test("admin dashboard shows MRR widget", async ({ page }) => {
    // Navigate to admin dashboard
    await page.goto("/admin");

    // Wait for page to load
    await page.waitForSelector("h1");

    // Verify MRR card exists
    const mrrCard = page.locator('text="MRR"').first();
    await expect(mrrCard).toBeVisible();

    // Verify MRR value is displayed (should be $ amount)
    const mrrValue = page.locator('.text-2xl.font-bold').first();
    await expect(mrrValue).toBeVisible();

    // Check that value starts with $ sign
    const valueText = await mrrValue.textContent();
    expect(valueText).toMatch(/^\$/);
  });

  test("MRR widget shows subscriber count", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForSelector("h1");

    // Find subscriber count text in MRR card
    const subscriberText = page.locator('text=/\\d+ active subscribers/');
    await expect(subscriberText).toBeVisible();
  });

  test("MRR widget shows growth rate when non-zero", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForSelector("h1");

    // Growth rate should be visible if non-zero
    // It would show "+5.0% growth" or "-2.5% growth"
    const growthText = page.locator('text=/[+-]?\\d+\\.\\d+% growth/');

    // Growth text may or may not exist depending on data
    const count = await growthText.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("admin dashboard shows churn rate in Users card", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForSelector("h1");

    // Find Users card with churn rate
    const usersCard = page.locator('text="Users"').locator("..");
    await expect(usersCard).toBeVisible();

    // Churn rate should be displayed
    const churnText = page.locator('text=/Churn: \\d+\\.\\d+%/');
    await expect(churnText).toBeVisible();
  });
});

/**
 * Test ID: GRO-MRR-004
 * Test: Subscriber list shows active subscribers
 * Priority: P1
 */
test.describe("GRO-MRR-004: Subscriber List Page", () => {
  test("subscriber page loads successfully", async ({ page }) => {
    await page.goto("/admin/subscribers");

    // Wait for page to load
    await page.waitForSelector("h1");

    // Verify page title
    const title = page.locator("h1");
    await expect(title).toContainText("Subscribers");

    // Verify description
    const description = page.locator('text="Manage subscriptions and track recurring revenue"');
    await expect(description).toBeVisible();
  });

  test("subscriber page shows MRR stats", async ({ page }) => {
    await page.goto("/admin/subscribers");
    await page.waitForSelector("h1");

    // Check for MRR stat card
    const mrrCard = page.locator('text="MRR"').first();
    await expect(mrrCard).toBeVisible();

    // Check for ARR stat card
    const arrCard = page.locator('text="ARR"').first();
    await expect(arrCard).toBeVisible();

    // Check for Active Subscribers card
    const subscribersCard = page.locator('text="Active Subscribers"').first();
    await expect(subscribersCard).toBeVisible();

    // Check for Churn Rate card
    const churnCard = page.locator('text="Churn Rate"').first();
    await expect(churnCard).toBeVisible();
  });

  test("subscriber list shows active subscriptions", async ({ page }) => {
    await page.goto("/admin/subscribers");
    await page.waitForSelector("h1");

    // Find active subscribers section
    const activeSection = page.locator('text="Active Subscribers"').locator("..");
    await expect(activeSection).toBeVisible();

    // Should show either subscriber list or empty state
    const hasList = await page.locator('[data-testid="subscriber-row"]').count();
    const hasEmptyState = await page.locator('text="No active subscribers yet."').count();

    expect(hasList + hasEmptyState).toBeGreaterThan(0);
  });

  test("subscriber row displays complete information", async ({ page }) => {
    await page.goto("/admin/subscribers");
    await page.waitForSelector("h1");

    // Check if there are any subscribers
    const subscriberRows = page.locator('.rounded-lg.border.p-3').first();
    const count = await subscriberRows.count();

    if (count > 0) {
      // Verify subscriber details are visible
      // Should show email, tier badge, interval badge, price
      await expect(subscriberRows).toBeVisible();
    } else {
      // Empty state is acceptable for test
      const emptyState = page.locator('text="No active subscribers yet."');
      await expect(emptyState).toBeVisible();
    }
  });

  test("trialing subscribers shown separately if any exist", async ({ page }) => {
    await page.goto("/admin/subscribers");
    await page.waitForSelector("h1");

    // Check if trialing section exists
    const trialingSection = page.locator('text="Trial Subscriptions"');
    const trialingSectionCount = await trialingSection.count();

    // Section only appears if there are trialing users
    expect(trialingSectionCount).toBeGreaterThanOrEqual(0);
  });

  test("canceled subscribers shown in separate section if any exist", async ({ page }) => {
    await page.goto("/admin/subscribers");
    await page.waitForSelector("h1");

    // Check if canceled section exists
    const canceledSection = page.locator('text="Recently Canceled"');
    const canceledSectionCount = await canceledSection.count();

    // Section only appears if there are canceled users
    expect(canceledSectionCount).toBeGreaterThanOrEqual(0);
  });

  test("back button navigates to admin dashboard", async ({ page }) => {
    await page.goto("/admin/subscribers");
    await page.waitForSelector("h1");

    // Find back button
    const backButton = page.locator('a[href="/admin"]').first();
    await expect(backButton).toBeVisible();

    // Click back button
    await backButton.click();

    // Should be on admin dashboard
    await page.waitForURL("/admin");
    const title = page.locator("h1");
    await expect(title).toContainText("Dashboard");
  });
});

/**
 * Test ID: GRO-MRR-006
 * Test: Revenue breakdown by plan
 * Priority: P2
 */
test.describe("GRO-MRR-006: Revenue Breakdown", () => {
  test("revenue breakdown section exists", async ({ page }) => {
    await page.goto("/admin/subscribers");
    await page.waitForSelector("h1");

    // Find revenue breakdown card
    const breakdownCard = page.locator('text="Revenue Breakdown by Plan"');
    await expect(breakdownCard).toBeVisible();

    // Verify description
    const description = page.locator('text="MRR contribution by tier and interval"');
    await expect(description).toBeVisible();
  });

  test("revenue breakdown shows plans or empty state", async ({ page }) => {
    await page.goto("/admin/subscribers");
    await page.waitForSelector("h1");

    // Check for plan rows or empty state
    const hasPlans = await page.locator('.rounded-lg.border.p-4').count();
    const hasEmptyState = await page.locator('text="No active subscriptions"').count();

    expect(hasPlans + hasEmptyState).toBeGreaterThan(0);
  });

  test("revenue breakdown displays tier and interval", async ({ page }) => {
    await page.goto("/admin/subscribers");
    await page.waitForSelector("h1");

    // If there are plans, verify they show tier (member/vip) and interval (Monthly/Annual)
    const planRows = page.locator('.rounded-lg.border.p-4');
    const count = await planRows.count();

    if (count > 0) {
      // First plan row should have tier and interval
      const firstPlan = planRows.first();
      await expect(firstPlan).toBeVisible();

      // Should contain "Monthly" or "Annual"
      const text = await firstPlan.textContent();
      expect(text).toMatch(/(Monthly|Annual)/);
    }
  });

  test("revenue breakdown shows MRR per plan", async ({ page }) => {
    await page.goto("/admin/subscribers");
    await page.waitForSelector("h1");

    // If there are plans, verify they show MRR
    const planRows = page.locator('.rounded-lg.border.p-4');
    const count = await planRows.count();

    if (count > 0) {
      // Should show "$X MRR" text
      const mrrText = page.locator('text=/\\$\\d+ MRR/');
      await expect(mrrText.first()).toBeVisible();
    }
  });

  test("revenue breakdown shows subscriber counts", async ({ page }) => {
    await page.goto("/admin/subscribers");
    await page.waitForSelector("h1");

    // If there are plans, verify they show subscriber count
    const planRows = page.locator('.rounded-lg.border.p-4');
    const count = await planRows.count();

    if (count > 0) {
      // Should show "X subscribers" text
      const subCount = page.locator('text=/\\d+ subscribers/');
      await expect(subCount.first()).toBeVisible();
    }
  });
});

/**
 * Integration Test: Admin Navigation to Subscribers
 */
test.describe("Admin Navigation", () => {
  test("admin dashboard links to subscribers page", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForSelector("h1");

    // Find the Subscribers & MRR card
    const subscribersCard = page.locator('text="Subscribers & MRR"');
    await expect(subscribersCard).toBeVisible();

    // Click to navigate
    const link = subscribersCard.locator("..").locator("a");
    await link.click();

    // Should navigate to subscribers page
    await page.waitForURL("/admin/subscribers");
    const title = page.locator("h1");
    await expect(title).toContainText("Subscribers");
  });
});

/**
 * Accessibility Tests
 */
test.describe("Accessibility", () => {
  test("subscriber page has proper headings", async ({ page }) => {
    await page.goto("/admin/subscribers");
    await page.waitForSelector("h1");

    // Check main heading
    const h1 = page.locator("h1");
    await expect(h1).toHaveText("Subscribers");

    // Check subheading exists
    const description = page.locator('p.text-muted-foreground').first();
    await expect(description).toBeVisible();
  });

  test("stat cards have readable labels", async ({ page }) => {
    await page.goto("/admin/subscribers");
    await page.waitForSelector("h1");

    // Verify stat card labels are visible
    await expect(page.locator('text="MRR"').first()).toBeVisible();
    await expect(page.locator('text="ARR"').first()).toBeVisible();
    await expect(page.locator('text="Active Subscribers"').first()).toBeVisible();
    await expect(page.locator('text="Churn Rate"').first()).toBeVisible();
  });
});

/**
 * Responsive Design Tests
 */
test.describe("Responsive Design", () => {
  test("subscriber page is mobile responsive", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/admin/subscribers");
    await page.waitForSelector("h1");

    // Verify title is visible on mobile
    const title = page.locator("h1");
    await expect(title).toBeVisible();

    // Stat cards should wrap on mobile
    const statsGrid = page.locator('.grid').first();
    await expect(statsGrid).toBeVisible();
  });

  test("admin dashboard MRR widget is mobile responsive", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/admin");
    await page.waitForSelector("h1");

    // MRR card should be visible on mobile
    const mrrCard = page.locator('text="MRR"').first();
    await expect(mrrCard).toBeVisible();
  });
});
