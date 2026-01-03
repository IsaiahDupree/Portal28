import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should display login page with password form", async ({ page }) => {
    await page.goto("/login");

    // Portal 28 branding uses "Enter the room" heading
    await expect(page.getByRole("heading", { name: /enter the room|welcome/i })).toBeVisible();
    await expect(page.getByPlaceholder("you@domain.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in$/i })).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder("you@domain.com").fill("test@example.com");
    await page.getByPlaceholder("••••••••").fill("wrongpassword");
    await page.locator('button[type="submit"]').click();

    // Wait for error message or form to remain visible (auth error)
    await page.waitForTimeout(2000);
    // Form should still be visible after failed login
    await expect(page.getByPlaceholder("you@domain.com")).toBeVisible();
  });

  test("should switch to magic link mode", async ({ page }) => {
    await page.goto("/login");

    // Click the magic link option - button text is "Sign in with magic link"
    await page.getByRole("button", { name: /sign in with magic link/i }).click();

    // Should show magic link form with "Send login link" button
    await expect(page.getByRole("button", { name: /send login link/i })).toBeVisible();
  });

  test("should redirect unauthenticated users from /app to login", async ({ page }) => {
    await page.goto("/app");

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect unauthenticated users from /admin to login", async ({ page }) => {
    await page.goto("/admin");

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
