/**
 * Visual Regression Tests
 *
 * Test ID: TEST-VIS-001
 * Feature: Visual regression testing framework
 *
 * This test suite validates visual consistency across the application
 * by taking screenshots and comparing them against baseline images.
 *
 * Run with: npx playwright test visual-regression
 * Update baselines: npx playwright test visual-regression --update-snapshots
 */

import { test, expect } from "@playwright/test";

test.describe("Visual Regression Tests", () => {
  test.describe("Public Pages", () => {
    test("homepage renders correctly", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Take full page screenshot
      await expect(page).toHaveScreenshot("homepage-full.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("homepage hero section", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const hero = page.locator("section").first();
      await expect(hero).toHaveScreenshot("homepage-hero.png", {
        animations: "disabled",
      });
    });

    test("courses catalog page", async ({ page }) => {
      await page.goto("/courses");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("courses-catalog.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("login page", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("login-page.png", {
        animations: "disabled",
      });
    });
  });

  test.describe("Navigation Components", () => {
    test("desktop navigation", async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const nav = page.locator("nav").first();
      await expect(nav).toHaveScreenshot("nav-desktop.png", {
        animations: "disabled",
      });
    });

    test("mobile navigation closed", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const nav = page.locator("nav").first();
      await expect(nav).toHaveScreenshot("nav-mobile-closed.png", {
        animations: "disabled",
      });
    });

    test("footer", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const footer = page.locator("footer").first();
      await expect(footer).toHaveScreenshot("footer.png", {
        animations: "disabled",
      });
    });
  });

  test.describe("Responsive Design", () => {
    const viewports = [
      { name: "mobile", width: 375, height: 667 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "desktop", width: 1920, height: 1080 },
    ];

    for (const viewport of viewports) {
      test(`homepage at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto("/");
        await page.waitForLoadState("networkidle");

        await expect(page).toHaveScreenshot(`homepage-${viewport.name}.png`, {
          fullPage: true,
          animations: "disabled",
        });
      });

      test(`courses catalog at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto("/courses");
        await page.waitForLoadState("networkidle");

        await expect(page).toHaveScreenshot(`courses-${viewport.name}.png`, {
          fullPage: true,
          animations: "disabled",
        });
      });
    }
  });

  test.describe("Component States", () => {
    test("button hover states", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Find primary CTA button
      const ctaButton = page.locator('a[href*="courses"], button').first();

      // Normal state
      await expect(ctaButton).toHaveScreenshot("button-normal.png", {
        animations: "disabled",
      });

      // Hover state
      await ctaButton.hover();
      await page.waitForTimeout(100); // Wait for hover transition
      await expect(ctaButton).toHaveScreenshot("button-hover.png", {
        animations: "disabled",
      });
    });

    test("form input states", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      const emailInput = page.locator('input[type="email"]').first();

      // Empty state
      await expect(emailInput).toHaveScreenshot("input-empty.png", {
        animations: "disabled",
      });

      // Focused state
      await emailInput.focus();
      await page.waitForTimeout(100);
      await expect(emailInput).toHaveScreenshot("input-focused.png", {
        animations: "disabled",
      });

      // Filled state
      await emailInput.fill("test@example.com");
      await expect(emailInput).toHaveScreenshot("input-filled.png", {
        animations: "disabled",
      });
    });
  });

  test.describe("Dark Mode", () => {
    test("homepage in dark mode", async ({ page }) => {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("homepage-dark.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("courses catalog in dark mode", async ({ page }) => {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto("/courses");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("courses-dark.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("navigation in dark mode", async ({ page }) => {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const nav = page.locator("nav").first();
      await expect(nav).toHaveScreenshot("nav-dark.png", {
        animations: "disabled",
      });
    });
  });

  test.describe("Course Components", () => {
    test("course card", async ({ page }) => {
      await page.goto("/courses");
      await page.waitForLoadState("networkidle");

      // Find first course card
      const courseCard = page.locator('[data-testid="course-card"]').first();
      if (await courseCard.count() > 0) {
        await expect(courseCard).toHaveScreenshot("course-card.png", {
          animations: "disabled",
        });
      }
    });

    test("course card hover", async ({ page }) => {
      await page.goto("/courses");
      await page.waitForLoadState("networkidle");

      const courseCard = page.locator('[data-testid="course-card"]').first();
      if (await courseCard.count() > 0) {
        await courseCard.hover();
        await page.waitForTimeout(200);
        await expect(courseCard).toHaveScreenshot("course-card-hover.png", {
          animations: "disabled",
        });
      }
    });
  });

  test.describe("Loading States", () => {
    test("skeleton loaders", async ({ page }) => {
      // Navigate with slow connection to capture loading state
      await page.route("**/*", route => {
        setTimeout(() => route.continue(), 100);
      });

      const navigationPromise = page.goto("/courses");

      // Try to capture skeleton/loading state
      await page.waitForTimeout(50);

      await navigationPromise;
    });
  });

  test.describe("Error States", () => {
    test("404 page", async ({ page }) => {
      await page.goto("/this-page-does-not-exist");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("404-page.png", {
        animations: "disabled",
      });
    });
  });

  test.describe("Animation Snapshots", () => {
    test("page transitions disabled", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Navigate to another page
      await page.click('a[href="/courses"]');
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("courses-after-navigation.png", {
        animations: "disabled",
      });
    });
  });
});

test.describe("Visual Regression - Authenticated Pages", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.describe("Login Flow", () => {
    test("magic link form", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      const form = page.locator("form").first();
      await expect(form).toHaveScreenshot("magic-link-form.png", {
        animations: "disabled",
      });
    });

    test("magic link form with validation error", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      // Submit empty form to trigger validation
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();
      await page.waitForTimeout(500); // Wait for validation message

      const form = page.locator("form").first();
      await expect(form).toHaveScreenshot("magic-link-form-error.png", {
        animations: "disabled",
      });
    });
  });
});

test.describe("Visual Regression - Cross-Browser", () => {
  test("homepage renders consistently across browsers", async ({ page, browserName }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot(`homepage-${browserName}.png`, {
      fullPage: true,
      animations: "disabled",
      maxDiffPixels: 100, // Allow minor rendering differences
    });
  });
});
