import { test, expect } from "@playwright/test";

test.describe("Role-Based Access Control", () => {
  test.describe("Unauthenticated Users", () => {
    test("can access public pages", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL("/");
      
      await page.goto("/courses");
      await expect(page).toHaveURL("/courses");
      
      await page.goto("/login");
      await expect(page).toHaveURL("/login");
      
      await page.goto("/signup");
      await expect(page).toHaveURL("/signup");
    });

    test("redirected from /app to /login", async ({ page }) => {
      await page.goto("/app");
      await expect(page).toHaveURL(/\/login/);
    });

    test("redirected from /admin to /login", async ({ page }) => {
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("Auth Callback Handling", () => {
    test("redirects code param from root to /auth/callback", async ({ page }) => {
      const response = await page.goto("/?code=test-code-123");
      // Should redirect to /auth/callback with code
      await expect(page).toHaveURL(/\/auth\/callback\?code=test-code-123/);
    });

    test("preserves next param during redirect", async ({ page }) => {
      await page.goto("/?code=test-code&next=/app/courses");
      await expect(page).toHaveURL(/\/auth\/callback.*code=test-code.*next=.*courses/);
    });
  });
});

test.describe("Login Page", () => {
  test("displays login form", async ({ page }) => {
    await page.goto("/login");
    
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    
    await page.fill('input[type="email"]', "invalid@test.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator("text=/invalid|error|incorrect/i")).toBeVisible({ timeout: 10000 });
  });

  test("has link to signup page", async ({ page }) => {
    await page.goto("/login");
    
    const signupLink = page.getByRole("link", { name: /sign up|create account/i });
    await expect(signupLink).toBeVisible();
    await signupLink.click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("has link to forgot password", async ({ page }) => {
    await page.goto("/login");
    
    const forgotLink = page.getByRole("link", { name: /forgot/i });
    await expect(forgotLink).toBeVisible();
  });
});

test.describe("Signup Page", () => {
  test("displays signup form", async ({ page }) => {
    await page.goto("/signup");
    
    await expect(page.locator('input[id="name"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[id="password"]')).toBeVisible();
    await expect(page.locator('input[id="confirmPassword"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("validates password match", async ({ page }) => {
    await page.goto("/signup");
    
    await page.fill('input[id="name"]', "Test User");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[id="password"]', "password123");
    await page.fill('input[id="confirmPassword"]', "differentpassword");
    await page.click('button[type="submit"]');
    
    await expect(page.locator("text=/match/i")).toBeVisible();
  });

  test("validates password length", async ({ page }) => {
    await page.goto("/signup");
    
    await page.fill('input[id="name"]', "Test User");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[id="password"]', "short");
    await page.fill('input[id="confirmPassword"]', "short");
    await page.click('button[type="submit"]');
    
    await expect(page.locator("text=/6 characters/i")).toBeVisible();
  });

  test("has link to login page", async ({ page }) => {
    await page.goto("/signup");
    
    const loginLink = page.getByRole("link", { name: /sign in/i });
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Forgot Password Page", () => {
  test("displays forgot password form", async ({ page }) => {
    await page.goto("/forgot-password");
    
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /reset|send/i })).toBeVisible();
  });

  test("shows success message after submission", async ({ page }) => {
    await page.goto("/forgot-password");
    
    await page.fill('input[type="email"]', "test@example.com");
    await page.click('button[type="submit"]');
    
    // Should show success/check email message
    await expect(page.locator("text=/check|email|sent/i")).toBeVisible({ timeout: 10000 });
  });
});
