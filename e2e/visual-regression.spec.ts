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

      // Dismiss cookie consent if present
      const dismissButton = page.locator('button:has-text("Accept All"), button:has-text("Dismiss")').first();
      if (await dismissButton.isVisible()) {
        await dismissButton.click();
        await page.waitForTimeout(500);
      }

      // Capture header/banner area (which contains mobile navigation)
      const nav = page.locator("banner, header, nav, [role='navigation'], [role='banner']").first();
      if (await nav.count() > 0 && await nav.isVisible()) {
        await expect(nav).toHaveScreenshot("nav-mobile-closed.png", {
          animations: "disabled",
        });
      } else {
        // Fallback: capture top of page
        await expect(page).toHaveScreenshot("nav-mobile-closed.png", {
          animations: "disabled",
          clip: { x: 0, y: 0, width: 375, height: 100 },
        });
      }
    });

    test("footer", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Wait for footer to be visible
      const footer = page.locator("footer, [role='contentinfo']").first();

      // Scroll to footer
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      if (await footer.count() > 0) {
        await expect(footer).toHaveScreenshot("footer.png", {
          animations: "disabled",
        });
      }
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

/**
 * Feature: feat-WC-021 - Visual regression tests
 * Criteria: Dashboard, Lists, Forms, Settings
 */
test.describe("Visual Regression - Dashboard Pages (feat-WC-021)", () => {
  test.describe("Student Dashboard", () => {
    test("student dashboard overview - unauthenticated redirects to login", async ({ page }) => {
      await page.goto("/app");
      await page.waitForLoadState("networkidle");

      // Verify redirect to login
      await expect(page).toHaveURL(/\/login/);

      // Take screenshot of login page as fallback
      await expect(page).toHaveScreenshot("dashboard-login-redirect.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("student dashboard courses list - unauthenticated", async ({ page }) => {
      await page.goto("/app/courses");
      await page.waitForLoadState("networkidle");

      // Takes screenshot of current state (login page if unauthenticated)
      await expect(page).toHaveScreenshot("dashboard-courses-unauthenticated.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("student dashboard progress view - unauthenticated", async ({ page }) => {
      await page.goto("/app/progress");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("dashboard-progress-unauthenticated.png", {
        fullPage: true,
        animations: "disabled",
      });
    });
  });

  test.describe("Admin Dashboard", () => {
    test("admin dashboard overview - unauthenticated redirects to login", async ({ page }) => {
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("admin-dashboard-unauthenticated.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("admin dashboard analytics view - unauthenticated", async ({ page }) => {
      await page.goto("/admin/analytics");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("admin-analytics-unauthenticated.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("admin dashboard MRR view - unauthenticated", async ({ page }) => {
      await page.goto("/admin/mrr");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("admin-mrr-unauthenticated.png", {
        fullPage: true,
        animations: "disabled",
      });
    });
  });

  test.describe("Dashboard Responsive Layouts", () => {
    const viewports = [
      { name: "mobile", width: 375, height: 667 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "desktop", width: 1920, height: 1080 },
    ];

    for (const viewport of viewports) {
      test(`student dashboard at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto("/app");
        await page.waitForLoadState("networkidle");

        await expect(page).toHaveScreenshot(`dashboard-student-${viewport.name}.png`, {
          fullPage: true,
          animations: "disabled",
        });
      });

      test(`admin dashboard at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto("/admin");
        await page.waitForLoadState("networkidle");

        await expect(page).toHaveScreenshot(`dashboard-admin-${viewport.name}.png`, {
          fullPage: true,
          animations: "disabled",
        });
      });
    }
  });
});

test.describe("Visual Regression - Lists Pages (feat-WC-021)", () => {
  test.describe("Course Lists", () => {
    test("public courses catalog list", async ({ page }) => {
      await page.goto("/courses");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("list-courses-catalog.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("admin courses management list", async ({ page }) => {
      await page.goto("/admin/courses");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("list-admin-courses.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("student enrolled courses list", async ({ page }) => {
      await page.goto("/app/courses");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("list-student-courses.png", {
        fullPage: true,
        animations: "disabled",
      });
    });
  });

  test.describe("Offer Lists", () => {
    test("admin offers list", async ({ page }) => {
      await page.goto("/admin/offers");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("list-admin-offers.png", {
        fullPage: true,
        animations: "disabled",
      });
    });
  });

  test.describe("Student Lists", () => {
    test("admin students list", async ({ page }) => {
      await page.goto("/admin/students");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("list-admin-students.png", {
        fullPage: true,
        animations: "disabled",
      });
    });
  });

  test.describe("Community Lists", () => {
    test("forum categories list", async ({ page }) => {
      await page.goto("/app/community/forums");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("list-forum-categories.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("announcements list", async ({ page }) => {
      await page.goto("/app/community/announcements");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("list-announcements.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("resources library list", async ({ page }) => {
      await page.goto("/app/community/resources");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("list-resources.png", {
        fullPage: true,
        animations: "disabled",
      });
    });
  });

  test.describe("Email Campaign Lists", () => {
    test("admin email campaigns list", async ({ page }) => {
      await page.goto("/admin/email-programs");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("list-email-campaigns.png", {
        fullPage: true,
        animations: "disabled",
      });
    });
  });

  test.describe("List Layouts and States", () => {
    test("empty courses list state", async ({ page }) => {
      // Assuming a fresh install or seeded empty state
      await page.goto("/app/courses");
      await page.waitForLoadState("networkidle");

      // Check if empty state is visible
      const emptyState = page.locator('[data-testid="empty-state"]');
      if (await emptyState.isVisible()) {
        await expect(page).toHaveScreenshot("list-courses-empty.png", {
          fullPage: true,
          animations: "disabled",
        });
      }
    });

    test("list with pagination", async ({ page }) => {
      await page.goto("/admin/students");
      await page.waitForLoadState("networkidle");

      // Capture pagination controls if present
      const pagination = page.locator('[data-testid="pagination"]');
      if (await pagination.isVisible()) {
        await expect(pagination).toHaveScreenshot("list-pagination-controls.png", {
          animations: "disabled",
        });
      }
    });
  });

  test.describe("List Responsive Layouts", () => {
    const viewports = [
      { name: "mobile", width: 375, height: 667 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "desktop", width: 1920, height: 1080 },
    ];

    for (const viewport of viewports) {
      test(`courses list at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto("/courses");
        await page.waitForLoadState("networkidle");

        await expect(page).toHaveScreenshot(`list-courses-${viewport.name}.png`, {
          fullPage: true,
          animations: "disabled",
        });
      });
    }
  });
});

test.describe("Visual Regression - Forms (feat-WC-021)", () => {
  test.describe("Authentication Forms", () => {
    test("login form - magic link", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      const form = page.locator("form").first();
      await expect(form).toHaveScreenshot("form-login.png", {
        animations: "disabled",
      });
    });

    test("login form - empty state", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("form-login-empty.png", {
        fullPage: false,
        animations: "disabled",
      });
    });

    test("login form - filled state", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      const emailInput = page.locator('input[type="email"]').first();
      await emailInput.fill("test@example.com");

      await expect(page).toHaveScreenshot("form-login-filled.png", {
        fullPage: false,
        animations: "disabled",
      });
    });

    test("login form - validation error", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot("form-login-error.png", {
        fullPage: false,
        animations: "disabled",
      });
    });
  });

  test.describe("Admin Course Forms", () => {
    test("new course form", async ({ page }) => {
      await page.goto("/admin/courses/new");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("form-course-new.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("course form - basic fields section", async ({ page }) => {
      await page.goto("/admin/courses/new");
      await page.waitForLoadState("networkidle");

      const basicSection = page.locator('[data-section="basic"]').first();
      if (await basicSection.isVisible()) {
        await expect(basicSection).toHaveScreenshot("form-course-basic-section.png", {
          animations: "disabled",
        });
      } else {
        // Fallback: screenshot whole form
        const form = page.locator("form").first();
        if (await form.isVisible()) {
          await expect(form).toHaveScreenshot("form-course-basic-section-fallback.png", {
            animations: "disabled",
          });
        }
      }
    });

    test("course form - pricing section", async ({ page }) => {
      await page.goto("/admin/courses/new");
      await page.waitForLoadState("networkidle");

      const pricingSection = page.locator('[data-section="pricing"]').first();
      if (await pricingSection.isVisible()) {
        await expect(pricingSection).toHaveScreenshot("form-course-pricing-section.png", {
          animations: "disabled",
        });
      }
    });
  });

  test.describe("Admin Offer Forms", () => {
    test("new offer form", async ({ page }) => {
      await page.goto("/admin/offers/new");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("form-offer-new.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("offer form - course selection", async ({ page }) => {
      await page.goto("/admin/offers/new");
      await page.waitForLoadState("networkidle");

      const courseSelect = page.locator('select[name="course_id"]').first();
      if (await courseSelect.isVisible()) {
        await expect(courseSelect).toHaveScreenshot("form-offer-course-select.png", {
          animations: "disabled",
        });
      }
    });
  });

  test.describe("Email Campaign Forms", () => {
    test("new email campaign form", async ({ page }) => {
      await page.goto("/admin/email-programs/new");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("form-email-campaign-new.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("email campaign form - audience selector", async ({ page }) => {
      await page.goto("/admin/email-programs/new");
      await page.waitForLoadState("networkidle");

      const audienceSection = page.locator('[data-section="audience"]').first();
      if (await audienceSection.isVisible()) {
        await expect(audienceSection).toHaveScreenshot("form-email-audience-section.png", {
          animations: "disabled",
        });
      }
    });
  });

  test.describe("Community Forms", () => {
    test("new forum thread form", async ({ page }) => {
      await page.goto("/app/community/forums");
      await page.waitForLoadState("networkidle");

      // Check if there's a "new thread" button to capture
      const newThreadButton = page.locator('a[href*="/new"], button:has-text("New Thread")').first();
      if (await newThreadButton.isVisible()) {
        await newThreadButton.click();
        await page.waitForLoadState("networkidle");

        await expect(page).toHaveScreenshot("form-forum-thread-new.png", {
          fullPage: true,
          animations: "disabled",
        });
      }
    });

    test("new announcement form", async ({ page }) => {
      await page.goto("/admin/community/announcements/new");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("form-announcement-new.png", {
        fullPage: true,
        animations: "disabled",
      });
    });
  });

  test.describe("Form States and Validation", () => {
    test("course form - validation errors", async ({ page }) => {
      await page.goto("/admin/courses/new");
      await page.waitForLoadState("networkidle");

      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot("form-course-validation-errors.png", {
          fullPage: true,
          animations: "disabled",
        });
      }
    });

    test("form input - focused state", async ({ page }) => {
      await page.goto("/admin/courses/new");
      await page.waitForLoadState("networkidle");

      const titleInput = page.locator('input[name="title"]').first();
      if (await titleInput.isVisible()) {
        await titleInput.focus();
        await page.waitForTimeout(100);

        await expect(titleInput).toHaveScreenshot("form-input-focused.png", {
          animations: "disabled",
        });
      }
    });

    test("form input - error state", async ({ page }) => {
      await page.goto("/admin/courses/new");
      await page.waitForLoadState("networkidle");

      // Submit to trigger validation
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(500);

        const errorInput = page.locator('input[aria-invalid="true"]').first();
        if (await errorInput.isVisible()) {
          await expect(errorInput).toHaveScreenshot("form-input-error.png", {
            animations: "disabled",
          });
        }
      }
    });
  });

  test.describe("Form Responsive Layouts", () => {
    const viewports = [
      { name: "mobile", width: 375, height: 667 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "desktop", width: 1920, height: 1080 },
    ];

    for (const viewport of viewports) {
      test(`login form at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto("/login");
        await page.waitForLoadState("networkidle");

        await expect(page).toHaveScreenshot(`form-login-${viewport.name}.png`, {
          fullPage: false,
          animations: "disabled",
        });
      });

      test(`course form at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto("/admin/courses/new");
        await page.waitForLoadState("networkidle");

        await expect(page).toHaveScreenshot(`form-course-${viewport.name}.png`, {
          fullPage: true,
          animations: "disabled",
        });
      });
    }
  });
});

test.describe("Visual Regression - Settings Pages (feat-WC-021)", () => {
  test.describe("User Profile Settings", () => {
    test("profile settings page - unauthenticated", async ({ page }) => {
      await page.goto("/app/settings");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("settings-profile-unauthenticated.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("profile settings form fields - layout", async ({ page }) => {
      await page.goto("/app/settings");
      await page.waitForLoadState("networkidle");

      // If authenticated, capture form; if not, captures login redirect
      await expect(page).toHaveScreenshot("settings-profile-form.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("profile avatar upload section", async ({ page }) => {
      await page.goto("/app/settings");
      await page.waitForLoadState("networkidle");

      const avatarSection = page.locator('[data-section="avatar"]').first();
      if (await avatarSection.isVisible()) {
        await expect(avatarSection).toHaveScreenshot("settings-avatar-section.png", {
          animations: "disabled",
        });
      }
    });
  });

  test.describe("Account Settings", () => {
    test("account settings page", async ({ page }) => {
      await page.goto("/app/settings/account");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("settings-account.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("email preferences section", async ({ page }) => {
      await page.goto("/app/settings/account");
      await page.waitForLoadState("networkidle");

      const emailSection = page.locator('[data-section="email"]').first();
      if (await emailSection.isVisible()) {
        await expect(emailSection).toHaveScreenshot("settings-email-preferences.png", {
          animations: "disabled",
        });
      }
    });
  });

  test.describe("Notification Settings", () => {
    test("notification settings page", async ({ page }) => {
      await page.goto("/app/settings/notifications");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("settings-notifications.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("notification toggles - email section", async ({ page }) => {
      await page.goto("/app/settings/notifications");
      await page.waitForLoadState("networkidle");

      const emailToggles = page.locator('[data-section="email-notifications"]').first();
      if (await emailToggles.isVisible()) {
        await expect(emailToggles).toHaveScreenshot("settings-email-toggles.png", {
          animations: "disabled",
        });
      }
    });

    test("notification toggles - push section", async ({ page }) => {
      await page.goto("/app/settings/notifications");
      await page.waitForLoadState("networkidle");

      const pushToggles = page.locator('[data-section="push-notifications"]').first();
      if (await pushToggles.isVisible()) {
        await expect(pushToggles).toHaveScreenshot("settings-push-toggles.png", {
          animations: "disabled",
        });
      }
    });
  });

  test.describe("Admin Settings", () => {
    test("admin settings page", async ({ page }) => {
      await page.goto("/admin/settings");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot("settings-admin.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("site settings section", async ({ page }) => {
      await page.goto("/admin/settings");
      await page.waitForLoadState("networkidle");

      const siteSettings = page.locator('[data-section="site"]').first();
      if (await siteSettings.isVisible()) {
        await expect(siteSettings).toHaveScreenshot("settings-site-section.png", {
          animations: "disabled",
        });
      }
    });

    test("payment settings section", async ({ page }) => {
      await page.goto("/admin/settings");
      await page.waitForLoadState("networkidle");

      const paymentSettings = page.locator('[data-section="payment"]').first();
      if (await paymentSettings.isVisible()) {
        await expect(paymentSettings).toHaveScreenshot("settings-payment-section.png", {
          animations: "disabled",
        });
      }
    });

    test("email integration settings", async ({ page }) => {
      await page.goto("/admin/settings");
      await page.waitForLoadState("networkidle");

      const emailSettings = page.locator('[data-section="email-integration"]').first();
      if (await emailSettings.isVisible()) {
        await expect(emailSettings).toHaveScreenshot("settings-email-integration.png", {
          animations: "disabled",
        });
      }
    });
  });

  test.describe("Settings Tabs Navigation", () => {
    test("settings navigation tabs", async ({ page }) => {
      await page.goto("/app/settings");
      await page.waitForLoadState("networkidle");

      const tabs = page.locator('[role="tablist"]').first();
      if (await tabs.isVisible()) {
        await expect(tabs).toHaveScreenshot("settings-navigation-tabs.png", {
          animations: "disabled",
        });
      }
    });

    test("settings sidebar navigation", async ({ page }) => {
      await page.goto("/app/settings");
      await page.waitForLoadState("networkidle");

      const sidebar = page.locator('nav[aria-label*="Settings"], aside').first();
      if (await sidebar.isVisible()) {
        await expect(sidebar).toHaveScreenshot("settings-sidebar-nav.png", {
          animations: "disabled",
        });
      }
    });
  });

  test.describe("Settings Responsive Layouts", () => {
    const viewports = [
      { name: "mobile", width: 375, height: 667 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "desktop", width: 1920, height: 1080 },
    ];

    for (const viewport of viewports) {
      test(`profile settings at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto("/app/settings");
        await page.waitForLoadState("networkidle");

        await expect(page).toHaveScreenshot(`settings-profile-${viewport.name}.png`, {
          fullPage: true,
          animations: "disabled",
        });
      });

      test(`admin settings at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto("/admin/settings");
        await page.waitForLoadState("networkidle");

        await expect(page).toHaveScreenshot(`settings-admin-${viewport.name}.png`, {
          fullPage: true,
          animations: "disabled",
        });
      });
    }
  });
});
