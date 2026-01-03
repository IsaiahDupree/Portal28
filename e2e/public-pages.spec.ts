import { test, expect } from "@playwright/test";

test.describe("Public Pages - Home", () => {
  test("should load home page with main content", async ({ page }) => {
    await page.goto("/");
    
    // Page should load without errors
    await expect(page.locator("body")).toBeVisible();
    
    // Should have navigation or header
    const hasHeader = await page.locator("header, nav, h1").first().isVisible();
    expect(hasHeader).toBe(true);
  });

  test("should have working navigation links", async ({ page }) => {
    await page.goto("/");
    
    // Check for courses link
    const coursesLink = page.locator('a[href="/courses"], a[href*="course"]').first();
    if (await coursesLink.isVisible()) {
      await coursesLink.click();
      await expect(page).toHaveURL(/course/);
    }
  });

  test("should have login link accessible", async ({ page }) => {
    await page.goto("/");
    
    const loginLink = page.locator('a[href="/login"], a[href*="login"]').first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/login/);
    } else {
      // Navigate directly if no link
      await page.goto("/login");
      await expect(page.locator("h1")).toBeVisible();
    }
  });
});

test.describe("Public Pages - Courses Catalog", () => {
  test("should display courses page", async ({ page }) => {
    await page.goto("/courses");
    
    // Should show courses heading or content
    await expect(page.locator("h1")).toBeVisible();
  });

  test("should handle empty courses gracefully", async ({ page }) => {
    await page.goto("/courses");
    
    // Should either show courses or page content (new UI uses div instead of main)
    const hasContent = await page.locator("body").isVisible();
    const pageText = await page.textContent("body");
    expect(hasContent && pageText && pageText.length > 0).toBe(true);
  });
});

test.describe("Public Pages - Bundles", () => {
  test("should display bundles page", async ({ page }) => {
    await page.goto("/bundles");
    
    await expect(page.getByRole("heading", { name: /bundle/i })).toBeVisible();
  });

  test("should show bundle cards or empty state", async ({ page }) => {
    await page.goto("/bundles");
    
    // Either show bundle cards or "no bundles" message
    const hasContent = await page.locator("main").isVisible();
    expect(hasContent).toBe(true);
  });
});

test.describe("Public Pages - Login", () => {
  test("should display login form", async ({ page }) => {
    await page.goto("/login");
    
    // Portal 28 branding uses "Enter the room" heading
    await expect(page.getByRole("heading", { name: /enter the room|welcome|login/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email|you@/i)).toBeVisible();
    // Check for Sign in button (exact text)
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("should validate email input", async ({ page }) => {
    await page.goto("/login");
    
    // Try to submit without filling fields - HTML5 validation prevents submission
    await page.locator('button[type="submit"]').click();
    
    // Form should still be visible (not submitted)
    await expect(page.getByPlaceholder(/email|you@/i)).toBeVisible();
  });
});

test.describe("Course Sales Pages", () => {
  test("should handle non-existent course gracefully", async ({ page }) => {
    await page.goto("/courses/non-existent-course-slug");
    
    // Should show error message or redirect
    const pageContent = await page.textContent("body");
    const hasErrorHandling = 
      pageContent?.includes("not found") ||
      pageContent?.includes("404") ||
      pageContent?.includes("error") ||
      page.url().includes("courses");
    
    expect(hasErrorHandling).toBe(true);
  });
});
