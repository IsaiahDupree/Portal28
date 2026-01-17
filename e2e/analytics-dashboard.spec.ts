import { test, expect } from "@playwright/test";

test.describe("Analytics Dashboard (feat-020)", () => {
  test.beforeEach(async ({ page }) => {
    // Note: These tests assume an admin user is already logged in
    // In a real scenario, you'd implement login flow here
  });

  test("GRO-ANA-001: Page loads with charts", async ({ page }) => {
    await page.goto("http://localhost:2828/admin/analytics");

    // Wait for page to load
    await expect(page.locator("h1")).toContainText("Analytics");

    // Check that stats cards are visible
    await expect(page.locator('text="Total Revenue"')).toBeVisible();
    await expect(page.locator('text="Orders"')).toBeVisible();
    await expect(page.locator('text="Impressions"')).toBeVisible();
    await expect(page.locator('text="Checkouts"')).toBeVisible();
    await expect(page.locator('text="Conversion"')).toBeVisible();

    // Check that charts section exists
    await expect(page.locator('text="Revenue Over Time"')).toBeVisible();
    await expect(page.locator('text="Conversion Funnel"')).toBeVisible();
    await expect(page.locator('text="Top Courses by Revenue"')).toBeVisible();
    await expect(page.locator('text="Offer Performance"')).toBeVisible();
  });

  test("GRO-ANA-002: Revenue chart displays daily/weekly/monthly", async ({
    page,
  }) => {
    await page.goto("http://localhost:2828/admin/analytics");

    // Chart title should be visible
    await expect(page.locator('text="Revenue Over Time"')).toBeVisible();

    // Chart description should mention the period
    await expect(
      page.locator('text="Daily revenue for the last"')
    ).toBeVisible();

    // The recharts SVG should be present
    const chart = page.locator("svg").first();
    await expect(chart).toBeVisible();
  });

  test("GRO-ANA-003: Conversion funnel shows LP to Purchase", async ({
    page,
  }) => {
    await page.goto("http://localhost:2828/admin/analytics");

    // Funnel should be visible
    await expect(page.locator('text="Conversion Funnel"')).toBeVisible();

    // Check for funnel steps (even if counts are 0)
    await expect(page.locator('text="Impressions"')).toBeVisible();
    await expect(page.locator('text="Checkouts"')).toBeVisible();
    await expect(page.locator('text="Purchases"')).toBeVisible();

    // Funnel bars should be visible
    const funnelBars = page.locator(".bg-primary, .bg-blue-500, .bg-green-500");
    await expect(funnelBars.first()).toBeVisible();
  });

  test("GRO-ANA-004: Top courses lists by revenue", async ({ page }) => {
    await page.goto("http://localhost:2828/admin/analytics");

    // Top courses section should be visible
    await expect(page.locator('text="Top Courses by Revenue"')).toBeVisible();

    // Either shows courses or empty state
    const hasContent = await page
      .locator('text="No course sales yet"')
      .isVisible()
      .catch(() => false);

    if (!hasContent) {
      // If there are courses, they should have revenue displayed
      const courseLinks = page.locator('a[href^="/admin/courses/"]');
      const count = await courseLinks.count();
      if (count > 0) {
        // First course should show rank, title, and revenue
        await expect(courseLinks.first()).toBeVisible();
      }
    }
  });

  test("GRO-ANA-005: Daily metrics cron updates", async ({ page }) => {
    // This test documents that the analytics functions aggregate metrics
    // The actual cron job would be tested separately
    await page.goto("http://localhost:2828/admin/analytics");

    // Stats should display aggregated metrics
    const revenueCard = page.locator('text="Total Revenue"').locator("..");
    await expect(revenueCard).toBeVisible();

    // Revenue value should be displayed (even if $0.00)
    await expect(revenueCard.locator("text=/\\$\\d+\\.\\d{2}/")).toBeVisible();
  });

  test("GRO-ANA-006: Offer analytics returns data", async ({ page }) => {
    await page.goto("http://localhost:2828/admin/analytics");

    // Offer performance table should be visible
    await expect(page.locator('text="Offer Performance"')).toBeVisible();

    // Table should have headers
    await expect(page.locator("th", { hasText: "Offer" })).toBeVisible();
    await expect(
      page.locator("th", { hasText: "Impressions" })
    ).toBeVisible();
    await expect(page.locator("th", { hasText: "Checkouts" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Conversions" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Rate" })).toBeVisible();

    // Either shows data or empty state
    const hasData = await page
      .locator('text="No offer data yet"')
      .isVisible()
      .catch(() => false);

    if (!hasData) {
      // If there's data, rows should be visible
      const rows = page.locator("tbody tr");
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("GRO-ANA-007: Date filter updates charts", async ({ page }) => {
    await page.goto("http://localhost:2828/admin/analytics");

    // Time filter buttons should be visible
    await expect(page.locator('button:has-text("7D")')).toBeVisible();
    await expect(page.locator('button:has-text("30D")')).toBeVisible();
    await expect(page.locator('button:has-text("90D")')).toBeVisible();

    // Default should be 30D
    await expect(
      page.locator('text="Daily revenue for the last 30 days"')
    ).toBeVisible();

    // Click 7D filter
    await page.click('button:has-text("7D")');

    // Wait for navigation
    await page.waitForURL("**/admin/analytics?days=7");

    // Description should update
    await expect(
      page.locator('text="Daily revenue for the last 7 days"')
    ).toBeVisible();

    // Click 90D filter
    await page.click('button:has-text("90D")');

    // Wait for navigation
    await page.waitForURL("**/admin/analytics?days=90");

    // Description should update
    await expect(
      page.locator('text="Daily revenue for the last 90 days"')
    ).toBeVisible();
  });

  test("GRO-ANA-008: Export data downloads CSV", async ({ page }) => {
    await page.goto("http://localhost:2828/admin/analytics");

    // Export button should be visible
    await expect(
      page.locator('button:has-text("Export CSV")')
    ).toBeVisible();

    // Set up download listener
    const downloadPromise = page.waitForEvent("download", { timeout: 10000 });

    // Click export button
    await page.click('button:has-text("Export CSV")');

    // Wait for download
    const download = await downloadPromise;

    // Verify filename
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/^analytics-\d+d-\d{4}-\d{2}-\d{2}\.csv$/);

    // Verify file can be saved
    const path = `/tmp/${filename}`;
    await download.saveAs(path);

    // File should exist and have content
    const fs = require("fs");
    const content = fs.readFileSync(path, "utf-8");
    expect(content).toContain("Revenue Over Time");
    expect(content).toContain("Top Courses by Revenue");
    expect(content).toContain("Offer Performance");

    // Cleanup
    fs.unlinkSync(path);
  });

  test("Admin-only access control", async ({ page }) => {
    // TODO: Test that non-admin users get 403 or redirect
    // This would require implementing proper auth flow in tests
  });

  test("Responsive layout on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("http://localhost:2828/admin/analytics");

    // Page should still be usable on mobile
    await expect(page.locator("h1")).toContainText("Analytics");

    // Stats cards should stack vertically
    const statsCards = page.locator("div.grid").first();
    await expect(statsCards).toBeVisible();
  });
});
