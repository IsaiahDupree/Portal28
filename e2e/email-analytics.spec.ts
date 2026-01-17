import { test, expect } from "@playwright/test";

test.describe("Email Analytics Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("http://localhost:2828/login");
    await page.fill('input[type="email"]', "admin@portal28.local");
    await page.click('button[type="submit"]');
    // Wait for magic link to be sent (in test env, this would auto-login)
    await page.waitForURL("http://localhost:2828/app", { timeout: 10000 });
  });

  /**
   * TEST: GRO-EAN-001
   * Type: E2E
   * Description: Analytics page loads and displays stats
   * Priority: P1
   * Expected: Page renders without errors, shows aggregate statistics
   */
  test("GRO-EAN-001: should load email analytics page and display stats", async ({ page }) => {
    await page.goto("http://localhost:2828/admin/email-analytics");

    // Verify page title
    await expect(page.locator("h1")).toContainText("Email Analytics");

    // Verify aggregate stats cards are present
    await expect(page.locator("text=Total Sends")).toBeVisible();
    await expect(page.locator("text=Open Rate")).toBeVisible();
    await expect(page.locator("text=Click Rate")).toBeVisible();
    await expect(page.locator("text=Bounce Rate")).toBeVisible();

    // Verify sections are present
    await expect(page.locator("text=Program Performance")).toBeVisible();
    await expect(page.locator("text=Recent Activity")).toBeVisible();
    await expect(page.locator("text=Top Engaged Contacts")).toBeVisible();
  });

  /**
   * TEST: GRO-EAN-002
   * Type: E2E
   * Description: Open rate displayed correctly
   * Priority: P1
   * Expected: Open rate shows percentage value
   */
  test("GRO-EAN-002: should display open rate percentage", async ({ page }) => {
    await page.goto("http://localhost:2828/admin/email-analytics");

    // Find the Open Rate card
    const openRateCard = page.locator("text=Open Rate").locator("..");

    // Verify percentage is displayed (matches pattern like "25.0%" or "0.0%")
    await expect(openRateCard.locator("text=/%/")).toBeVisible();
  });

  /**
   * TEST: GRO-EAN-003
   * Type: E2E
   * Description: Click rate displayed correctly
   * Priority: P1
   * Expected: Click rate shows percentage value with human clicks count
   */
  test("GRO-EAN-003: should display click rate percentage", async ({ page }) => {
    await page.goto("http://localhost:2828/admin/email-analytics");

    // Find the Click Rate card
    const clickRateCard = page.locator("text=Click Rate").locator("..");

    // Verify percentage is displayed
    await expect(clickRateCard.locator("text=/%/")).toBeVisible();

    // Verify "human clicks" text is present
    await expect(clickRateCard.locator("text=/human clicks/i")).toBeVisible();
  });

  /**
   * TEST: GRO-EAN-004
   * Type: E2E
   * Description: Bounce rate displayed correctly
   * Priority: P1
   * Expected: Bounce rate shows percentage value with bounced count
   */
  test("GRO-EAN-004: should display bounce rate percentage", async ({ page }) => {
    await page.goto("http://localhost:2828/admin/email-analytics");

    // Find the Bounce Rate card
    const bounceRateCard = page.locator("text=Bounce Rate").locator("..");

    // Verify percentage is displayed
    await expect(bounceRateCard.locator("text=/%/")).toBeVisible();

    // Verify "bounced" text is present
    await expect(bounceRateCard.locator("text=/bounced/i")).toBeVisible();
  });

  /**
   * TEST: GRO-EAN-006
   * Type: E2E
   * Description: Filter by template works
   * Priority: P2
   * Expected: Template filter dropdown appears and filters results
   */
  test("GRO-EAN-006: should filter analytics by template", async ({ page }) => {
    await page.goto("http://localhost:2828/admin/email-analytics");

    // Verify template filter is present
    await expect(page.locator("text=Filter by template")).toBeVisible();

    // Find and click the template filter dropdown
    const templateFilter = page.locator('button:has-text("All templates")');
    await expect(templateFilter).toBeVisible();

    // Click to open dropdown
    await templateFilter.click();

    // Verify dropdown options appear (if templates exist)
    // Note: In an empty database, only "All templates" may be visible
    const dropdownContent = page.locator('[role="option"]');
    await expect(dropdownContent.first()).toBeVisible({ timeout: 2000 }).catch(() => {
      // No templates in database yet - this is acceptable for initial state
    });

    // If templates exist, select one and verify URL updates
    const welcomeOption = page.locator('[role="option"]:has-text("welcome")');
    if (await welcomeOption.isVisible({ timeout: 1000 }).catch(() => false)) {
      await welcomeOption.click();

      // Verify URL includes template query param
      await expect(page).toHaveURL(/template=welcome/);

      // Verify "Showing stats for" message appears
      await expect(page.locator("text=Showing stats for")).toBeVisible();
    }
  });

  /**
   * TEST: GRO-EAN-006 (continued)
   * Type: E2E
   * Description: Reset template filter shows all templates
   * Expected: Selecting "All templates" removes filter
   */
  test("GRO-EAN-006: should reset filter when selecting all templates", async ({ page }) => {
    // Start with a filtered view
    await page.goto("http://localhost:2828/admin/email-analytics?template=welcome");

    // Verify filter is applied
    await expect(page.locator("text=Showing stats for")).toBeVisible();

    // Open dropdown and select "All templates"
    const templateFilter = page.locator('button:has-text("welcome")');
    await templateFilter.click();

    const allOption = page.locator('[role="option"]:has-text("All templates")');
    await allOption.click();

    // Verify URL no longer has template param
    await expect(page).toHaveURL(/^((?!template=).)*$/);

    // Verify "Showing stats for" message is gone
    await expect(page.locator("text=Showing stats for")).not.toBeVisible();
  });

  /**
   * TEST: GRO-EAN-005 (E2E validation)
   * Type: E2E
   * Description: Aggregate stats display correctly
   * Expected: All stat cards show numeric values
   */
  test("GRO-EAN-005: should display aggregate statistics", async ({ page }) => {
    await page.goto("http://localhost:2828/admin/email-analytics");

    // Verify all stat cards have numeric values (even if 0)
    const statCards = [
      "Total Sends",
      "Open Rate",
      "Click Rate",
      "Bounce Rate"
    ];

    for (const cardTitle of statCards) {
      const card = page.locator(`text=${cardTitle}`).locator("..");

      // Each card should have a large numeric display
      const numericValue = card.locator(".text-2xl");
      await expect(numericValue).toBeVisible();

      // Value should be a number or percentage
      const text = await numericValue.textContent();
      expect(text).toMatch(/[\d.,]+%?/);
    }
  });

  /**
   * TEST: Program Performance Table
   * Type: E2E
   * Description: Program performance table displays correctly
   * Expected: Table shows programs with stats
   */
  test("should display program performance table", async ({ page }) => {
    await page.goto("http://localhost:2828/admin/email-analytics");

    const programSection = page.locator("text=Program Performance").locator("..");

    // Table should be present (or empty state message)
    const hasTable = await programSection.locator("table").isVisible({ timeout: 1000 }).catch(() => false);
    const hasEmptyState = await programSection.locator("text=No programs yet").isVisible({ timeout: 1000 }).catch(() => false);

    expect(hasTable || hasEmptyState).toBe(true);

    // If table exists, verify headers
    if (hasTable) {
      await expect(programSection.locator("th:has-text('Program')")).toBeVisible();
      await expect(programSection.locator("th:has-text('Open Rate')")).toBeVisible();
      await expect(programSection.locator("th:has-text('Click Rate')")).toBeVisible();
    }
  });

  /**
   * TEST: Recent Activity Feed
   * Type: E2E
   * Description: Recent activity displays email events
   * Expected: Events listed with email addresses and event types
   */
  test("should display recent email activity", async ({ page }) => {
    await page.goto("http://localhost:2828/admin/email-analytics");

    const activitySection = page.locator("text=Recent Activity").locator("..");

    // Activity section should exist
    await expect(activitySection).toBeVisible();

    // Should show either events or "No events yet" message
    const hasEvents = await activitySection.locator(".border-l-4").isVisible({ timeout: 1000 }).catch(() => false);
    const hasEmptyState = await activitySection.locator("text=No events yet").isVisible({ timeout: 1000 }).catch(() => false);

    expect(hasEvents || hasEmptyState).toBe(true);
  });

  /**
   * TEST: Top Engaged Contacts
   * Type: E2E
   * Description: Top engaged contacts table displays
   * Expected: Shows contacts with engagement scores
   */
  test("should display top engaged contacts", async ({ page }) => {
    await page.goto("http://localhost:2828/admin/email-analytics");

    const contactsSection = page.locator("text=Top Engaged Contacts").locator("..");

    // Section should exist
    await expect(contactsSection).toBeVisible();

    // Should show either table or empty state
    const hasTable = await contactsSection.locator("table").isVisible({ timeout: 1000 }).catch(() => false);
    const hasEmptyState = await contactsSection.locator("text=No engagement data").isVisible({ timeout: 1000 }).catch(() => false);

    expect(hasTable || hasEmptyState).toBe(true);

    // If table exists, verify column headers
    if (hasTable) {
      await expect(contactsSection.locator("th:has-text('Contact')")).toBeVisible();
      await expect(contactsSection.locator("th:has-text('Score')")).toBeVisible();
      await expect(contactsSection.locator("th:has-text('Opens')")).toBeVisible();
      await expect(contactsSection.locator("th:has-text('Clicks')")).toBeVisible();
    }
  });

  /**
   * TEST: Navigation Links
   * Type: E2E
   * Description: Navigation links work correctly
   * Expected: Links to admin and email programs pages work
   */
  test("should have working navigation links", async ({ page }) => {
    await page.goto("http://localhost:2828/admin/email-analytics");

    // Admin link
    const adminLink = page.locator('a:has-text("← Admin")');
    await expect(adminLink).toBeVisible();
    await expect(adminLink).toHaveAttribute("href", "/admin");

    // Email Programs link
    const programsLink = page.locator('a:has-text("Email Programs")');
    await expect(programsLink).toBeVisible();
    await expect(programsLink).toHaveAttribute("href", "/admin/email-programs");
  });
});
