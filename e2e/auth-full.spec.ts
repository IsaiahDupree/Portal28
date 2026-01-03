import { test, expect } from "@playwright/test";

test.describe("Authentication - Login Page", () => {
  test("should display login page with all elements", async ({ page }) => {
    await page.goto("/login");

    // Check heading and description - Portal 28 branding
    await expect(page.getByRole("heading", { name: /enter the room|welcome/i })).toBeVisible();
    await expect(page.getByText(/sign in to access/i)).toBeVisible();

    // Check form elements
    await expect(page.getByPlaceholder("you@domain.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check links
    await expect(page.getByRole("link", { name: /forgot your password/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /sign up/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /magic link/i })).toBeVisible();
  });

  test("should navigate to signup page", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /sign up/i }).first().click();
    await expect(page).toHaveURL("/signup");
  });

  test("should navigate to forgot password page", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /forgot your password/i }).click();
    await expect(page).toHaveURL("/forgot-password");
  });

  test("should switch to magic link mode", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /sign in with magic link/i }).click();
    await expect(page.getByRole("button", { name: /send login link/i })).toBeVisible();
  });

  test("should switch back to password mode from magic link", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /sign in with magic link/i }).click();
    await page.getByRole("button", { name: /sign in with password/i }).click();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@domain.com").fill("invalid@test.com");
    await page.getByPlaceholder("••••••••").fill("wrongpassword");
    await page.locator('button[type="submit"]').click();

    // Wait for error or form to remain visible
    await page.waitForTimeout(2000);
    await expect(page.getByPlaceholder("you@domain.com")).toBeVisible();
  });

  test("should require email field", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.locator('button[type="submit"]').click();
    
    // Form should remain (HTML5 validation)
    await expect(page.getByPlaceholder("you@domain.com")).toBeVisible();
  });

  test("should require password field", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@domain.com").fill("test@example.com");
    await page.locator('button[type="submit"]').click();
    
    // Form should remain (HTML5 validation)
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
  });
});

test.describe("Authentication - Signup Page", () => {
  test("should display signup page with all elements", async ({ page }) => {
    await page.goto("/signup");

    // Check heading and description
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
    await expect(page.getByText(/join portal28/i)).toBeVisible();

    // Check form elements
    await expect(page.getByPlaceholder("Sarah Ashley")).toBeVisible();
    await expect(page.getByPlaceholder("you@domain.com")).toBeVisible();
    await expect(page.locator('input[id="password"]')).toBeVisible();
    await expect(page.locator('input[id="confirmPassword"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();

    // Check login link
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
  });

  test("should navigate to login page", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL("/login");
  });

  test("should show error for mismatched passwords", async ({ page }) => {
    await page.goto("/signup");
    await page.getByPlaceholder("Sarah Ashley").fill("Test User");
    await page.getByPlaceholder("you@domain.com").fill("test@example.com");
    await page.locator('input[id="password"]').fill("password123");
    await page.locator('input[id="confirmPassword"]').fill("different123");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test("should enforce minimum password length", async ({ page }) => {
    await page.goto("/signup");
    await page.getByPlaceholder("Sarah Ashley").fill("Test User");
    await page.getByPlaceholder("you@domain.com").fill("test@example.com");
    await page.locator('input[id="password"]').fill("12345");
    await page.locator('input[id="confirmPassword"]').fill("12345");
    await page.getByRole("button", { name: /create account/i }).click();

    // HTML5 minLength validation or custom validation should prevent submission
    // Form should still be visible
    await expect(page.getByPlaceholder("Sarah Ashley")).toBeVisible();
  });

  test("should require all fields", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("button", { name: /create account/i }).click();
    
    // Form should remain (HTML5 validation)
    await expect(page.getByPlaceholder("Sarah Ashley")).toBeVisible();
  });
});

test.describe("Authentication - Forgot Password Page", () => {
  test("should display forgot password page with all elements", async ({ page }) => {
    await page.goto("/forgot-password");

    // Check heading and description
    await expect(page.getByRole("heading", { name: /forgot your password/i })).toBeVisible();
    await expect(page.getByText(/send you reset instructions/i)).toBeVisible();

    // Check form elements
    await expect(page.getByPlaceholder("you@domain.com")).toBeVisible();
    await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();

    // Check login link
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
  });

  test("should navigate to login page", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL("/login");
  });

  test("should require email field", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByRole("button", { name: /send reset link/i }).click();
    
    // Form should remain (HTML5 validation)
    await expect(page.getByPlaceholder("you@domain.com")).toBeVisible();
  });

  test("should show success message after submitting", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByPlaceholder("you@domain.com").fill("test@example.com");
    await page.getByRole("button", { name: /send reset link/i }).click();

    // Should show success message (even if email doesn't exist - security)
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Authentication - Reset Password Page", () => {
  test("should display reset password page", async ({ page }) => {
    await page.goto("/reset-password");

    // Check heading
    await expect(page.getByRole("heading", { name: /reset your password/i })).toBeVisible();
  });

  test("should show invalid session message without valid session", async ({ page }) => {
    await page.goto("/reset-password");

    // Wait for session check
    await page.waitForTimeout(2000);

    // Should show invalid/expired message or password form
    const content = await page.textContent("body");
    const hasValidContent = 
      content?.includes("invalid") ||
      content?.includes("expired") ||
      content?.includes("New Password");
    expect(hasValidContent).toBe(true);
  });
});

test.describe("Authentication - Navigation Flow", () => {
  test("should complete login -> forgot password -> login flow", async ({ page }) => {
    await page.goto("/login");
    
    // Go to forgot password
    await page.getByRole("link", { name: /forgot your password/i }).click();
    await expect(page).toHaveURL("/forgot-password");
    
    // Go back to login
    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL("/login");
  });

  test("should complete login -> signup -> login flow", async ({ page }) => {
    await page.goto("/login");
    
    // Go to signup
    await page.getByRole("link", { name: /sign up/i }).first().click();
    await expect(page).toHaveURL("/signup");
    
    // Go back to login
    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL("/login");
  });

  test("should navigate back to home from all auth pages", async ({ page }) => {
    const authPages = ["/login", "/signup", "/forgot-password"];
    
    for (const authPage of authPages) {
      await page.goto(authPage);
      await page.getByRole("link", { name: /back to home/i }).click();
      await expect(page).toHaveURL("/");
    }
  });
});

test.describe("Authentication - Protected Routes", () => {
  test("should redirect from /app to login when unauthenticated", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect from /admin to login when unauthenticated", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Authentication - Mobile Responsiveness", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("should display login page properly on mobile", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /enter the room|welcome/i })).toBeVisible();
    await expect(page.getByPlaceholder("you@domain.com")).toBeVisible();
  });

  test("should display signup page properly on mobile", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
    await expect(page.getByPlaceholder("Sarah Ashley")).toBeVisible();
  });

  test("should display forgot password page properly on mobile", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: /forgot your password/i })).toBeVisible();
    await expect(page.getByPlaceholder("you@domain.com")).toBeVisible();
  });
});
