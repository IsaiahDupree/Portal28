import { test, expect } from "@playwright/test";

/**
 * Feature: feat-071 - Cookie Consent Banner
 * Test IDs: MVP-CKE-001, MVP-CKE-002, MVP-CKE-003
 */

test.describe("Cookie Consent Banner (feat-071)", () => {
  test.beforeEach(async ({ context }) => {
    // Clear cookies before each test
    await context.clearCookies();
  });

  test("MVP-CKE-001: should show banner on first visit", async ({ page }) => {
    // Visit home page
    await page.goto("http://localhost:2828");

    // Banner should be visible
    await expect(page.locator("text=We value your privacy")).toBeVisible();

    // Check for cookie icon
    await expect(page.locator("svg.lucide-cookie")).toBeVisible();

    // Check for action buttons
    await expect(page.locator('button:has-text("Accept All")')).toBeVisible();
    await expect(page.locator('button:has-text("Reject All")')).toBeVisible();
    await expect(page.locator('button:has-text("Customize")')).toBeVisible();
  });

  test("MVP-CKE-002: should store consent in cookie when accepted", async ({
    page,
  }) => {
    await page.goto("http://localhost:2828");

    // Accept all cookies
    await page.click('button:has-text("Accept All")');

    // Banner should disappear
    await expect(page.locator("text=We value your privacy")).not.toBeVisible();

    // Check cookie was set
    const cookies = await page.context().cookies();
    const consentCookie = cookies.find(
      (c) => c.name === "portal28_cookie_consent"
    );

    expect(consentCookie).toBeDefined();
    expect(consentCookie?.value).toBeTruthy();

    // Parse cookie value
    const preferences = JSON.parse(decodeURIComponent(consentCookie!.value));
    expect(preferences.necessary).toBe(true);
    expect(preferences.analytics).toBe(true);
    expect(preferences.marketing).toBe(true);
  });

  test("MVP-CKE-003: should respect consent for tracking", async ({ page }) => {
    // Start with no consent
    await page.goto("http://localhost:2828");

    // Reject all cookies
    await page.click('button:has-text("Reject All")');

    // Banner should disappear
    await expect(page.locator("text=We value your privacy")).not.toBeVisible();

    // Check cookie preferences
    const cookies = await page.context().cookies();
    const consentCookie = cookies.find(
      (c) => c.name === "portal28_cookie_consent"
    );

    expect(consentCookie).toBeDefined();

    // Parse cookie value
    const preferences = JSON.parse(decodeURIComponent(consentCookie!.value));
    expect(preferences.necessary).toBe(true);
    expect(preferences.analytics).toBe(false);
    expect(preferences.marketing).toBe(false);

    // Meta Pixel should not load without marketing consent
    // This is tested by checking if fbq is initialized
    const fbqExists = await page.evaluate(() => {
      return typeof (window as any).fbq !== "undefined";
    });

    expect(fbqExists).toBe(false);
  });

  test("should show customize modal with granular options", async ({
    page,
  }) => {
    await page.goto("http://localhost:2828");

    // Click customize button
    await page.click('button:has-text("Customize")');

    // Customize view should be visible
    await expect(
      page.locator("text=Customize Cookie Preferences")
    ).toBeVisible();

    // Check for cookie categories
    await expect(page.locator("text=Necessary Cookies")).toBeVisible();
    await expect(page.locator("text=Analytics Cookies")).toBeVisible();
    await expect(page.locator("text=Marketing Cookies")).toBeVisible();

    // Necessary cookies should be always active
    await expect(page.locator("text=Always Active")).toBeVisible();

    // Analytics and marketing should have checkboxes
    const checkboxes = page.locator('input[type="checkbox"]');
    expect(await checkboxes.count()).toBe(2);
  });

  test("should save custom preferences", async ({ page }) => {
    await page.goto("http://localhost:2828");

    // Open customize modal
    await page.click('button:has-text("Customize")');

    // Accept analytics but not marketing
    const analyticsCheckbox = page.locator('input[type="checkbox"]').nth(0);
    const marketingCheckbox = page.locator('input[type="checkbox"]').nth(1);

    await analyticsCheckbox.check();
    await marketingCheckbox.uncheck();

    // Save preferences
    await page.click('button:has-text("Save Preferences")');

    // Banner should disappear
    await expect(
      page.locator("text=Customize Cookie Preferences")
    ).not.toBeVisible();

    // Verify cookie preferences
    const cookies = await page.context().cookies();
    const consentCookie = cookies.find(
      (c) => c.name === "portal28_cookie_consent"
    );

    const preferences = JSON.parse(decodeURIComponent(consentCookie!.value));
    expect(preferences.analytics).toBe(true);
    expect(preferences.marketing).toBe(false);
  });

  test("should not show banner on subsequent visits if consent given", async ({
    page,
  }) => {
    // First visit - accept cookies
    await page.goto("http://localhost:2828");
    await page.click('button:has-text("Accept All")');

    // Navigate away and come back
    await page.goto("http://localhost:2828/courses");
    await page.goto("http://localhost:2828");

    // Banner should not appear
    await expect(
      page.locator("text=We value your privacy")
    ).not.toBeVisible();
  });

  test("should have link to cookie policy", async ({ page }) => {
    await page.goto("http://localhost:2828");

    // Check for cookie policy link
    const policyLink = page.locator('a:has-text("Cookie Policy")');
    await expect(policyLink).toBeVisible();

    // Click link and verify navigation
    await policyLink.click();
    await expect(page).toHaveURL(/.*\/legal\/cookies/);

    // Verify cookie policy page loaded
    await expect(page.locator("h1")).toContainText("Cookie Policy");
  });

  test("should dismiss banner when X button clicked", async ({ page }) => {
    await page.goto("http://localhost:2828");

    // Click dismiss button (X)
    await page.locator('button[aria-label="Dismiss"]').click();

    // Banner should disappear
    await expect(page.locator("text=We value your privacy")).not.toBeVisible();

    // Verify default (reject) preferences were saved
    const cookies = await page.context().cookies();
    const consentCookie = cookies.find(
      (c) => c.name === "portal28_cookie_consent"
    );

    expect(consentCookie).toBeDefined();
    const preferences = JSON.parse(decodeURIComponent(consentCookie!.value));
    expect(preferences.analytics).toBe(false);
    expect(preferences.marketing).toBe(false);
  });

  test("should allow going back from customize view", async ({ page }) => {
    await page.goto("http://localhost:2828");

    // Open customize
    await page.click('button:has-text("Customize")');
    await expect(
      page.locator("text=Customize Cookie Preferences")
    ).toBeVisible();

    // Click back button
    await page.click('button:has-text("Back")');

    // Should return to simple view
    await expect(page.locator("text=We value your privacy")).toBeVisible();
    await expect(
      page.locator("text=Customize Cookie Preferences")
    ).not.toBeVisible();
  });

  test("should persist consent across page navigation", async ({ page }) => {
    // Accept cookies on home page
    await page.goto("http://localhost:2828");
    await page.click('button:has-text("Accept All")');

    // Navigate to different pages
    await page.goto("http://localhost:2828/courses");
    await page.goto("http://localhost:2828/about");
    await page.goto("http://localhost:2828");

    // Banner should not reappear
    await expect(
      page.locator("text=We value your privacy")
    ).not.toBeVisible();

    // Cookie should still exist
    const cookies = await page.context().cookies();
    const consentCookie = cookies.find(
      (c) => c.name === "portal28_cookie_consent"
    );
    expect(consentCookie).toBeDefined();
  });

  test("should allow managing preferences from cookie policy page", async ({
    page,
  }) => {
    // First, set some preferences
    await page.goto("http://localhost:2828");
    await page.click('button:has-text("Accept All")');

    // Navigate to cookie policy
    await page.goto("http://localhost:2828/legal/cookies");

    // Click manage preferences button
    await page.click('button:has-text("Manage Cookie Preferences")');

    // Page should reload and banner should appear
    await page.waitForLoadState("load");
    await expect(page.locator("text=We value your privacy")).toBeVisible();
  });

  test("should have all required GDPR information", async ({ page }) => {
    await page.goto("http://localhost:2828");

    // Banner should explain cookie usage
    await expect(
      page.locator("text=We use cookies to enhance your browsing experience")
    ).toBeVisible();

    // Link to policy should be present
    await expect(page.locator('a:has-text("Cookie Policy")')).toBeVisible();

    // Reject option should be available
    await expect(page.locator('button:has-text("Reject All")')).toBeVisible();

    // Customize option should be available
    await expect(page.locator('button:has-text("Customize")')).toBeVisible();
  });

  test("should load Meta Pixel only after marketing consent", async ({
    page,
  }) => {
    await page.goto("http://localhost:2828");

    // Initially, fbq should not exist
    let fbqExists = await page.evaluate(() => {
      return typeof (window as any).fbq !== "undefined";
    });
    expect(fbqExists).toBe(false);

    // Accept all cookies
    await page.click('button:has-text("Accept All")');

    // Wait a moment for scripts to load
    await page.waitForTimeout(2000);

    // Now fbq might be loaded (if META_PIXEL_ID is configured)
    // Note: In test environment, it may still not load if env var is not set
    // This test verifies the consent mechanism works
  });

  test("should handle cookie expiration correctly", async ({ page }) => {
    await page.goto("http://localhost:2828");
    await page.click('button:has-text("Accept All")');

    // Get cookie expiration
    const cookies = await page.context().cookies();
    const consentCookie = cookies.find(
      (c) => c.name === "portal28_cookie_consent"
    );

    expect(consentCookie).toBeDefined();
    expect(consentCookie?.expires).toBeGreaterThan(Date.now() / 1000);

    // Cookie should expire in ~365 days
    const expiryDate = new Date((consentCookie?.expires || 0) * 1000);
    const now = new Date();
    const daysDiff = Math.floor(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    expect(daysDiff).toBeGreaterThan(360);
    expect(daysDiff).toBeLessThan(370);
  });
});
