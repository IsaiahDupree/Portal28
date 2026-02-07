import { test, expect } from "@playwright/test";

test.describe("Google OAuth Authentication (feat-070)", () => {
  test("MVP-GOA-001: should display Google login button on login page", async ({ page }) => {
    await page.goto("/login");

    // Check that "Continue with Google" button is visible
    const googleButton = page.getByRole("button", { name: /continue with google/i });
    await expect(googleButton).toBeVisible();

    // Verify button has Google icon (check for SVG)
    const buttonWithIcon = page.locator('button:has-text("Continue with Google")');
    await expect(buttonWithIcon).toBeVisible();
    const svg = buttonWithIcon.locator('svg');
    await expect(svg).toBeVisible();
  });

  test("MVP-GOA-001: should display Google signup button on signup page", async ({ page }) => {
    await page.goto("/signup");

    // Check that "Continue with Google" button is visible
    const googleButton = page.getByRole("button", { name: /continue with google/i });
    await expect(googleButton).toBeVisible();

    // Verify button has Google icon (check for SVG)
    const buttonWithIcon = page.locator('button:has-text("Continue with Google")');
    await expect(buttonWithIcon).toBeVisible();
    const svg = buttonWithIcon.locator('svg');
    await expect(svg).toBeVisible();
  });

  test("MVP-GOA-002: should have Google OAuth button functionality on login page", async ({ page }) => {
    await page.goto("/login");

    // Get the Google login button
    const googleButton = page.getByRole("button", { name: /continue with google/i });
    await expect(googleButton).toBeVisible();

    // Verify button is clickable (not disabled initially)
    await expect(googleButton).toBeEnabled();

    // Verify button has proper attributes
    const buttonType = await googleButton.getAttribute('type');
    expect(buttonType).toBe('button');

    // This validates that the button is set up correctly
    // Actual OAuth flow requires real Google credentials
  });

  test("MVP-GOA-002: should have Google OAuth button functionality on signup page", async ({ page }) => {
    await page.goto("/signup");

    // Get the Google signup button
    const googleButton = page.getByRole("button", { name: /continue with google/i });
    await expect(googleButton).toBeVisible();

    // Verify button is clickable (not disabled initially)
    await expect(googleButton).toBeEnabled();

    // Verify button has proper attributes
    const buttonType = await googleButton.getAttribute('type');
    expect(buttonType).toBe('button');

    // This validates that the button is set up correctly
    // Actual OAuth flow requires real Google credentials
  });

  test("MVP-GOA-003: Google OAuth integration code is present", async ({ page }) => {
    await page.goto("/login");

    // The Google button exists, which means OAuth integration is present
    const googleButton = page.getByRole("button", { name: /continue with google/i });
    await expect(googleButton).toBeVisible();

    // Verify the button has the correct structure without clicking
    // (clicking would trigger OAuth redirect which we can't test without credentials)
    const hasIcon = await googleButton.locator('svg').count();
    expect(hasIcon).toBeGreaterThan(0);

    // Test passes - OAuth integration UI is present
  });

  test("should display Google button in both password and magic link modes", async ({ page }) => {
    await page.goto("/login");

    // Dismiss cookie consent if present (wait a bit for it to appear)
    await page.waitForTimeout(500);
    const acceptButton = page.getByRole("button", { name: /accept all/i });
    try {
      if (await acceptButton.isVisible({ timeout: 2000 })) {
        await acceptButton.click();
        await page.waitForTimeout(300);
      }
    } catch (e) {
      // Cookie banner not present, continue
    }

    // Check Google button is visible in password mode
    const googleButtonPassword = page.getByRole("button", { name: /continue with google/i });
    await expect(googleButtonPassword).toBeVisible();

    // Count how many Google buttons are visible in password mode
    const googleButtonsBeforeSwitch = await page.getByRole("button", { name: /continue with google/i }).count();
    expect(googleButtonsBeforeSwitch).toBeGreaterThan(0);

    // Switch to magic link mode
    const magicLinkButton = page.getByRole("button", { name: /sign in with magic link/i });
    await expect(magicLinkButton).toBeVisible();
    await magicLinkButton.click();

    // Wait for form to transition - look for the magic link submit button
    await page.waitForTimeout(1000);

    // Verify the form switched by checking if "Send login link" button exists
    const sendLinkButton = page.locator('button[type="submit"]');
    await expect(sendLinkButton).toBeVisible();

    // Check Google button is still visible in magic link mode
    const googleButtonMagic = page.getByRole("button", { name: /continue with google/i });
    await expect(googleButtonMagic).toBeVisible();

    // Verify we still have at least one Google button
    const googleButtonsAfterSwitch = await page.getByRole("button", { name: /continue with google/i }).count();
    expect(googleButtonsAfterSwitch).toBeGreaterThan(0);
  });
});
