import { test, expect } from "@playwright/test";

/**
 * Feature: feat-061 - Cohort Analytics
 * Test IDs: GRO-COH-001, GRO-COH-002, GRO-COH-003
 */

test.describe("Cohort Analytics (feat-061)", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("http://localhost:2828/login");
    await page.fill('input[type="email"]', "admin@test.com");
    await page.click('button[type="submit"]');

    // Wait for email and click magic link
    await page.goto("http://localhost:28324"); // Mailpit
    await page.click("text=Sign in to Portal28");
    const linkElement = await page.locator('a:has-text("Sign in to Portal28")');
    const href = await linkElement.getAttribute("href");

    if (href) {
      await page.goto(href);
      await page.waitForURL("**/app/**");
    }

    // Navigate to cohort analytics page
    await page.goto("http://localhost:2828/admin/analytics/cohorts");
  });

  test("GRO-COH-001: should display cohort groupings", async ({ page }) => {
    // Check page loaded
    await expect(page.locator("h1")).toContainText("Cohort Analytics");

    // Check for cohort retention table
    await expect(page.locator("table")).toBeVisible();

    // Check for table headers
    await expect(page.locator('th:has-text("Cohort")')).toBeVisible();
    await expect(page.locator('th:has-text("Size")')).toBeVisible();
    await expect(page.locator('th:has-text("Revenue")')).toBeVisible();
    await expect(page.locator('th:has-text("Avg LTV")')).toBeVisible();

    // Check retention columns
    await expect(page.locator('th:has-text("Week 1")')).toBeVisible();
    await expect(page.locator('th:has-text("Week 2")')).toBeVisible();
    await expect(page.locator('th:has-text("Week 4")')).toBeVisible();
    await expect(page.locator('th:has-text("Week 8")')).toBeVisible();
    await expect(page.locator('th:has-text("Week 12")')).toBeVisible();
  });

  test("GRO-COH-002: should display retention curves", async ({ page }) => {
    // Check for retention data in table
    const retentionCells = page.locator('td:has-text("%")');
    const count = await retentionCells.count();

    if (count > 0) {
      // Verify retention percentages are displayed
      const firstRetention = await retentionCells.first().textContent();
      expect(firstRetention).toMatch(/\d+\.\d%/);

      // Verify retention values are valid percentages (0-100)
      for (let i = 0; i < Math.min(count, 5); i++) {
        const text = await retentionCells.nth(i).textContent();
        const value = parseFloat(text?.replace("%", "") || "0");
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }

    // Check summary stats are displayed
    await expect(page.locator('text="Total Cohorts"')).toBeVisible();
    await expect(page.locator('text="Latest Cohort Size"')).toBeVisible();
    await expect(page.locator('text="Avg LTV (Latest)"')).toBeVisible();
  });

  test("GRO-COH-003: should display LTV comparison by cohort", async ({ page }) => {
    // Check for LTV comparison chart
    await expect(
      page.locator('text="Lifetime Value by Cohort"')
    ).toBeVisible();

    // Check for chart description
    await expect(
      page.locator(
        'text="Compare average, median, and maximum LTV across cohorts"'
      )
    ).toBeVisible();

    // Verify LTV values in table are in dollar format
    const ltvCells = page.locator('td:has-text("$")');
    const count = await ltvCells.count();

    if (count > 0) {
      // Verify dollar amounts are displayed
      const firstLTV = await ltvCells.first().textContent();
      expect(firstLTV).toMatch(/\$\d+\.\d{2}/);
    }
  });

  test("should toggle between weekly and monthly cohorts", async ({ page }) => {
    // Check period filter exists
    await expect(page.locator('text="Period:"')).toBeVisible();

    // Default should be monthly
    const monthlyButton = page.locator('a:has-text("Monthly")');
    await expect(monthlyButton).toBeVisible();

    // Switch to weekly
    const weeklyButton = page.locator('a:has-text("Weekly")');
    await weeklyButton.click();

    // Verify URL changed
    await page.waitForURL("**/cohorts?period=week");

    // Verify table still displays
    await expect(page.locator("table")).toBeVisible();

    // Switch back to monthly
    await monthlyButton.click();
    await page.waitForURL("**/cohorts?period=month");
    await expect(page.locator("table")).toBeVisible();
  });

  test("should display cohorts in descending order (newest first)", async ({
    page,
  }) => {
    // Get all cohort date cells
    const cohortCells = page.locator('tbody td:first-child');
    const count = await cohortCells.count();

    if (count >= 2) {
      const dates: string[] = [];
      for (let i = 0; i < count; i++) {
        const text = await cohortCells.nth(i).textContent();
        if (text) dates.push(text.trim());
      }

      // Verify dates are in descending order
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i] <= dates[i - 1]).toBe(true);
      }
    }
  });

  test("should handle empty cohort data gracefully", async ({ page }) => {
    // If no cohorts exist, should show empty state
    const tableBody = page.locator("tbody");
    const rowCount = await tableBody.locator("tr").count();

    if (rowCount === 0) {
      await expect(
        page.locator('text="No cohort data available yet"')
      ).toBeVisible();
    }
  });

  test("should display cohort size correctly", async ({ page }) => {
    const sizeCells = page.locator("tbody td:nth-child(2)");
    const count = await sizeCells.count();

    if (count > 0) {
      // Verify cohort sizes are numbers
      for (let i = 0; i < Math.min(count, 3); i++) {
        const text = await sizeCells.nth(i).textContent();
        const size = parseInt(text?.trim() || "0");
        expect(size).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("should display total revenue per cohort", async ({ page }) => {
    const revenueCells = page.locator("tbody td:nth-child(3)");
    const count = await revenueCells.count();

    if (count > 0) {
      // Verify revenue is in dollar format
      for (let i = 0; i < Math.min(count, 3); i++) {
        const text = await revenueCells.nth(i).textContent();
        expect(text).toMatch(/\$\d+\.\d{2}/);
      }
    }
  });

  test("should calculate average LTV per cohort", async ({ page }) => {
    const ltvCells = page.locator("tbody td:nth-child(4)");
    const count = await ltvCells.count();

    if (count > 0) {
      // Verify LTV is in dollar format
      for (let i = 0; i < Math.min(count, 3); i++) {
        const text = await ltvCells.nth(i).textContent();
        expect(text).toMatch(/\$\d+\.\d{2}/);
      }
    }
  });

  test("should show retention declining over time", async ({ page }) => {
    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // For the first cohort, retention should generally decline
      const row = rows.first();
      const week1 = await row.locator("td:nth-child(5)").textContent();
      const week12 = await row.locator("td:nth-child(9)").textContent();

      if (week1 && week12) {
        const week1Value = parseFloat(week1.replace("%", ""));
        const week12Value = parseFloat(week12.replace("%", ""));

        // Week 12 retention should be <= Week 1 retention (or both 0)
        if (week1Value > 0 || week12Value > 0) {
          expect(week12Value).toBeLessThanOrEqual(week1Value);
        }
      }
    }
  });

  test("should display summary statistics", async ({ page }) => {
    // Check all summary cards are present
    await expect(page.locator('text="Total Cohorts"')).toBeVisible();
    await expect(page.locator('text="Latest Cohort Size"')).toBeVisible();
    await expect(page.locator('text="Avg LTV (Latest)"')).toBeVisible();

    // Verify summary cards display numbers
    const summaryValues = page.locator(".text-3xl.font-bold");
    const count = await summaryValues.count();

    expect(count).toBeGreaterThanOrEqual(3);

    // First value should be total cohorts (number)
    const totalCohorts = await summaryValues.nth(0).textContent();
    expect(totalCohorts).toMatch(/\d+/);

    // Second value should be cohort size (number)
    const cohortSize = await summaryValues.nth(1).textContent();
    expect(cohortSize).toMatch(/\d+/);

    // Third value should be LTV (dollar amount)
    const avgLTV = await summaryValues.nth(2).textContent();
    expect(avgLTV).toMatch(/\$\d+\.\d{2}/);
  });
});
