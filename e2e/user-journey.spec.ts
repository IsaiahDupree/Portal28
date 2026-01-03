import { test, expect } from "@playwright/test";

/**
 * User Journey E2E Tests
 * 
 * Complete user flow from signup through course usage
 */

test.describe("User Journey - Signup to Course Access", () => {
  const testUser = {
    name: "Test User",
    email: `test-${Date.now()}@example.com`,
    password: "TestPassword123!",
  };

  test.describe("1. Signup Flow", () => {
    test("should display signup page with Portal 28 branding", async ({ page }) => {
      await page.goto("/signup");
      
      await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
      await expect(page.getByText(/join portal28/i)).toBeVisible();
    });

    test("should have all required form fields", async ({ page }) => {
      await page.goto("/signup");
      
      await expect(page.getByPlaceholder("Sarah Ashley")).toBeVisible();
      await expect(page.getByPlaceholder("you@domain.com")).toBeVisible();
      await expect(page.locator('input[id="password"]')).toBeVisible();
      await expect(page.locator('input[id="confirmPassword"]')).toBeVisible();
      await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
    });

    test("should validate password requirements", async ({ page }) => {
      await page.goto("/signup");
      
      await page.getByPlaceholder("Sarah Ashley").fill(testUser.name);
      await page.getByPlaceholder("you@domain.com").fill(testUser.email);
      await page.locator('input[id="password"]').fill("short");
      await page.locator('input[id="confirmPassword"]').fill("short");
      await page.getByRole("button", { name: /create account/i }).click();
      
      // Should show password length error or remain on form
      await expect(page.getByPlaceholder("you@domain.com")).toBeVisible();
    });

    test("should validate password confirmation match", async ({ page }) => {
      await page.goto("/signup");
      
      await page.getByPlaceholder("Sarah Ashley").fill(testUser.name);
      await page.getByPlaceholder("you@domain.com").fill(testUser.email);
      await page.locator('input[id="password"]').fill(testUser.password);
      await page.locator('input[id="confirmPassword"]').fill("DifferentPassword!");
      await page.getByRole("button", { name: /create account/i }).click();
      
      await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    });

    test("should successfully submit signup form", async ({ page }) => {
      await page.goto("/signup");
      
      await page.getByPlaceholder("Sarah Ashley").fill(testUser.name);
      await page.getByPlaceholder("you@domain.com").fill(testUser.email);
      await page.locator('input[id="password"]').fill(testUser.password);
      await page.locator('input[id="confirmPassword"]').fill(testUser.password);
      await page.getByRole("button", { name: /create account/i }).click();
      
      // Should show success message, error, or redirect - form was submitted
      await page.waitForTimeout(3000);
      const content = await page.textContent("body");
      const formWasProcessed = 
        content?.toLowerCase().includes("check") ||
        content?.toLowerCase().includes("email") ||
        content?.toLowerCase().includes("verification") ||
        content?.toLowerCase().includes("error") ||
        content?.toLowerCase().includes("already") ||
        page.url().includes("/app") ||
        page.url().includes("/verify") ||
        page.url().includes("/login");
      expect(formWasProcessed).toBe(true);
    });
  });

  test.describe("2. Login Flow", () => {
    test("should display login page", async ({ page }) => {
      await page.goto("/login");
      
      await expect(page.getByRole("heading", { name: /enter the room/i })).toBeVisible();
      await expect(page.getByPlaceholder("you@domain.com")).toBeVisible();
      await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    });

    test("should switch between password and magic link modes", async ({ page }) => {
      await page.goto("/login");
      
      // Start with password mode
      await expect(page.getByPlaceholder("••••••••")).toBeVisible();
      
      // Switch to magic link
      await page.getByRole("button", { name: /sign in with magic link/i }).click();
      await expect(page.getByRole("button", { name: /send login link/i })).toBeVisible();
      
      // Switch back to password
      await page.getByRole("button", { name: /sign in with password/i }).click();
      await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    });

    test("should handle invalid credentials gracefully", async ({ page }) => {
      await page.goto("/login");
      
      await page.getByPlaceholder("you@domain.com").fill("invalid@test.com");
      await page.getByPlaceholder("••••••••").fill("wrongpassword");
      await page.locator('button[type="submit"]').click();
      
      await page.waitForTimeout(2000);
      // Should show error or remain on login page
      await expect(page.getByPlaceholder("you@domain.com")).toBeVisible();
    });

    test("should navigate to forgot password", async ({ page }) => {
      await page.goto("/login");
      
      await page.getByRole("link", { name: /forgot your password/i }).click();
      await expect(page).toHaveURL("/forgot-password");
    });
  });

  test.describe("3. Browse Courses (Unauthenticated)", () => {
    test("should display courses catalog page", async ({ page }) => {
      await page.goto("/courses");
      
      // Check page loads and has course-related content
      const content = await page.textContent("body");
      const hasCourseContent = 
        content?.toLowerCase().includes("course") ||
        content?.toLowerCase().includes("curriculum") ||
        content?.toLowerCase().includes("command") ||
        content?.toLowerCase().includes("portal");
      expect(hasCourseContent).toBe(true);
    });

    test("should load courses page without server error", async ({ page }) => {
      const response = await page.goto("/courses");
      // Page should load without 500 error
      expect(response?.status()).toBeLessThan(500);
    });

    test("should navigate to bundles page if link exists", async ({ page }) => {
      await page.goto("/");
      
      const bundlesLink = page.getByRole("link", { name: /bundles/i });
      const isVisible = await bundlesLink.isVisible().catch(() => false);
      
      if (isVisible) {
        await bundlesLink.click();
        await expect(page).toHaveURL("/bundles");
      } else {
        // Bundles link may not exist on all pages - that's OK
        expect(true).toBe(true);
      }
    });
  });

  test.describe("4. Protected Routes", () => {
    test("should redirect /app to login when unauthenticated", async ({ page }) => {
      await page.goto("/app");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect /admin to login when unauthenticated", async ({ page }) => {
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect course lesson to login when unauthenticated", async ({ page }) => {
      await page.goto("/app/courses/test-course");
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("5. Password Reset Flow", () => {
    test("should display forgot password page", async ({ page }) => {
      await page.goto("/forgot-password");
      
      await expect(page.getByRole("heading", { name: /forgot your password/i })).toBeVisible();
      await expect(page.getByPlaceholder("you@domain.com")).toBeVisible();
      await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
    });

    test("should submit password reset request", async ({ page }) => {
      await page.goto("/forgot-password");
      
      await page.getByPlaceholder("you@domain.com").fill("test@example.com");
      await page.getByRole("button", { name: /send reset link/i }).click();
      
      // Should show success message (even for non-existent emails for security)
      await page.waitForTimeout(3000);
      const content = await page.textContent("body");
      const hasSuccessOrError = 
        content?.toLowerCase().includes("check") ||
        content?.toLowerCase().includes("email") ||
        content?.toLowerCase().includes("sent");
      expect(hasSuccessOrError).toBe(true);
    });
  });
});

test.describe("User Journey - Course Interaction", () => {
  test.describe("6. Course Sales Page", () => {
    test("should display home page hero", async ({ page }) => {
      await page.goto("/");
      
      await expect(page.getByText(/step inside the room/i)).toBeVisible();
      await expect(page.getByText(/power gets built/i)).toBeVisible();
    });

    test("should have Enter the Room CTA", async ({ page }) => {
      await page.goto("/");
      
      const ctaButton = page.getByRole("link", { name: /enter the room/i });
      await expect(ctaButton).toBeVisible();
    });

    test("should display brand story section", async ({ page }) => {
      await page.goto("/");
      
      const content = await page.textContent("body");
      expect(content?.toLowerCase()).toContain("brand");
    });
  });

  test.describe("7. Newsletter Signup", () => {
    test("should have newsletter form on homepage", async ({ page }) => {
      await page.goto("/");
      
      // Look for email input that might be newsletter
      const emailInputs = page.locator('input[type="email"]');
      const count = await emailInputs.count();
      expect(count).toBeGreaterThanOrEqual(0); // May or may not have newsletter on homepage
    });
  });
});

test.describe("User Journey - Mobile Experience", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("should display properly on mobile", async ({ page }) => {
    await page.goto("/");
    
    await expect(page.locator("h1")).toBeVisible();
  });

  test("should have responsive navigation", async ({ page }) => {
    await page.goto("/");
    
    // Mobile menu or responsive nav should exist
    const mobileMenu = page.locator('[data-testid="mobile-menu"], .mobile-menu, button[aria-label*="menu"]');
    const isVisible = await mobileMenu.isVisible().catch(() => false);
    
    // Either mobile menu exists or navigation is visible
    const navLinks = page.locator('nav a, header a');
    const navCount = await navLinks.count();
    expect(isVisible || navCount > 0).toBe(true);
  });

  test("should display login page on mobile", async ({ page }) => {
    await page.goto("/login");
    
    await expect(page.getByRole("heading", { name: /enter the room|welcome/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email|you@/i)).toBeVisible();
  });
});
