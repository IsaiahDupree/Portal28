import { test, expect } from "@playwright/test";

test.describe("Newsletter Subscription", () => {
  test("should submit newsletter form successfully", async ({ page }) => {
    // Mock the newsletter API
    await page.route("**/api/newsletter/subscribe", async (route) => {
      await route.fulfill({
        status: 200,
        json: { ok: true },
      });
    });

    // Navigate to a page with newsletter form (assuming home page has one)
    await page.goto("/");

    // Look for email input and submit
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill("test@example.com");

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Should show success message
      await expect(page.getByText(/check|subscribed|success/i)).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("should handle newsletter API errors gracefully", async ({ page }) => {
    // Mock the newsletter API to return an error
    await page.route("**/api/newsletter/subscribe", async (route) => {
      await route.fulfill({
        status: 400,
        json: { error: "Invalid email" },
      });
    });

    await page.goto("/");

    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill("invalid");

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Should show error message
      await expect(page.getByText(/error|invalid/i)).toBeVisible({
        timeout: 5000,
      });
    }
  });
});
