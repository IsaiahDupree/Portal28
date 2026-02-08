/**
 * E2E Tests: App Marketplace
 * Tests app browsing, installation, configuration, and ratings
 * Test IDs: EXP-MKT-001, EXP-MKT-002, EXP-MKT-003
 */

import { test, expect } from "@playwright/test";

test.describe("App Marketplace", () => {
  test.beforeEach(async ({ page }) => {
    // For authenticated tests, you would login here
    // For now, testing public marketplace access and API endpoints
  });

  test.describe("EXP-MKT-001: Browse Apps", () => {
    test("should fetch apps from marketplace API", async ({ request }) => {
      const response = await request.get("/api/marketplace/apps");
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data).toHaveProperty("apps");
      expect(Array.isArray(data.apps)).toBeTruthy();
    });

    test("should filter apps by category via API", async ({ request }) => {
      const response = await request.get("/api/marketplace/apps?category=tools");
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data).toHaveProperty("apps");
    });

    test("should search apps via API", async ({ request }) => {
      const response = await request.get("/api/marketplace/apps?search=Stripe");
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data).toHaveProperty("apps");
    });

    test.skip("should display marketplace with apps grid", async ({ page }) => {
      await page.goto("/app/marketplace");

      // Check page title and description
      await expect(page.locator("h1")).toContainText("App Marketplace");
      await expect(page.getByText("Discover apps")).toBeVisible();

      // Check filters sidebar
      await expect(page.getByText("Category")).toBeVisible();
      await expect(page.getByText("Sort By")).toBeVisible();

      // Check apps grid
      const appCards = page.locator('[class*="grid"]').first();
      await expect(appCards).toBeVisible();
    });

    test.skip("should filter apps by category", async ({ page }) => {
      await page.goto("/app/marketplace");

      // Select "Tools" category
      await page.getByLabel("Tools").click();

      // URL should update with category filter
      await expect(page).toHaveURL(/category=tools/);

      // Apps should be filtered
      await page.waitForLoadState("networkidle");
      const toolsApps = page.locator('[class*="border rounded-lg"]');
      await expect(toolsApps.first()).toBeVisible();
    });

    test.skip("should search for apps", async ({ page }) => {
      await page.goto("/app/marketplace");

      // Enter search query
      await page.getByPlaceholder("Search apps...").fill("Stripe");
      await page.getByRole("button", { name: "Go" }).click();

      // URL should update with search query
      await expect(page).toHaveURL(/search=Stripe/);

      // Results should be filtered
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByText("Stripe", { exact: false })
      ).toBeVisible();
    });

    test.skip("should sort apps by different criteria", async ({ page }) => {
      await page.goto("/app/marketplace");

      // Sort by installs
      await page.getByLabel("Most Installed").click();
      await expect(page).toHaveURL(/sort=installs/);

      // Sort by name
      await page.getByLabel("Name").click();
      await expect(page).toHaveURL(/sort=name/);
    });

    test.skip("should clear all filters", async ({ page }) => {
      await page.goto("/app/marketplace?category=tools&sort=installs");

      // Clear filters button should be visible
      await expect(
        page.getByRole("button", { name: "Clear Filters" })
      ).toBeVisible();

      // Click clear filters
      await page.getByRole("button", { name: "Clear Filters" }).click();

      // Should return to default marketplace URL
      await expect(page).toHaveURL("/app/marketplace");
    });

    test.skip("should view app details", async ({ page }) => {
      await page.goto("/app/marketplace");

      // Click on an app card
      await page.getByRole("button", { name: "View Details" }).first().click();

      // Should navigate to app details page
      await expect(page).toHaveURL(/\/app\/marketplace\/[a-z-]+/);

      // Should show app details
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.getByText("About this app")).toBeVisible();
      await expect(page.getByRole("button", { name: "Install" })).toBeVisible();
    });

    test.skip("should show coming soon badge for unreleased apps", async ({
      page,
    }) => {
      await page.goto("/app/marketplace");

      // Find coming soon app
      const comingSoonCard = page
        .locator('[class*="border rounded-lg"]')
        .filter({ hasText: "Coming Soon" });

      if ((await comingSoonCard.count()) > 0) {
        await expect(comingSoonCard.first()).toBeVisible();
        await expect(
          comingSoonCard.first().getByRole("button", { name: "Coming Soon" })
        ).toBeDisabled();
      }
    });
  });

  test.describe("EXP-MKT-002: Install Apps", () => {
    test.skip("should install an app successfully", async ({ page }) => {
      await page.goto("/app/marketplace");

      // Click on first active app
      const firstApp = page
        .locator('[class*="border rounded-lg"]')
        .filter({ hasNot: page.getByText("Coming Soon") })
        .first();
      await firstApp.getByRole("button", { name: "View Details" }).click();

      // Click install button
      await page.getByRole("button", { name: "Install" }).click();

      // Should show success message
      await expect(page.getByText("App installed successfully!")).toBeVisible({
        timeout: 10000,
      });

      // Install button should change to "Installed"
      await expect(
        page.getByRole("button", { name: "✓ Installed" })
      ).toBeVisible();

      // Uninstall button should be visible
      await expect(
        page.getByRole("button", { name: "Uninstall" })
      ).toBeVisible();
    });

    test.skip("should prevent installing already installed app", async ({
      page,
    }) => {
      await page.goto("/app/marketplace");

      // Install an app first
      const firstApp = page
        .locator('[class*="border rounded-lg"]')
        .filter({ hasNot: page.getByText("Coming Soon") })
        .first();
      await firstApp.getByRole("button", { name: "View Details" }).click();

      await page.getByRole("button", { name: "Install" }).click();
      await expect(page.getByText("App installed successfully!")).toBeVisible({
        timeout: 10000,
      });

      // Install button should be disabled
      await expect(
        page.getByRole("button", { name: "✓ Installed" })
      ).toBeDisabled();
    });

    test.skip("should uninstall an app successfully", async ({ page }) => {
      await page.goto("/app/marketplace");

      // Install an app first
      const firstApp = page
        .locator('[class*="border rounded-lg"]')
        .filter({ hasNot: page.getByText("Coming Soon") })
        .first();
      await firstApp.getByRole("button", { name: "View Details" }).click();

      await page.getByRole("button", { name: "Install" }).click();
      await expect(page.getByText("App installed successfully!")).toBeVisible({
        timeout: 10000,
      });

      // Set up dialog handler for confirmation
      page.on("dialog", (dialog) => dialog.accept());

      // Click uninstall
      await page.getByRole("button", { name: "Uninstall" }).click();

      // Should show success message
      await expect(
        page.getByText("App uninstalled successfully!")
      ).toBeVisible({ timeout: 10000 });

      // Install button should be available again
      await expect(page.getByRole("button", { name: "Install" })).toBeVisible();
    });

    test.skip("should require authentication for installation", async ({
      page,
      context,
    }) => {
      // Clear auth cookies
      await context.clearCookies();

      await page.goto("/app/marketplace");

      // Should redirect to login or show auth error
      // This depends on middleware implementation
    });

    test.skip("should track installation events", async ({ page }) => {
      await page.goto("/app/marketplace");

      // Install an app
      const firstApp = page
        .locator('[class*="border rounded-lg"]')
        .filter({ hasNot: page.getByText("Coming Soon") })
        .first();
      const appName = await firstApp.locator("h3").textContent();

      await firstApp.getByRole("button", { name: "View Details" }).click();
      await page.getByRole("button", { name: "Install" }).click();

      await expect(page.getByText("App installed successfully!")).toBeVisible({
        timeout: 10000,
      });

      // Verify installation was tracked (install count should increase)
      await page.goto("/app/marketplace");
      const updatedApp = page
        .locator('[class*="border rounded-lg"]')
        .filter({ hasText: appName || "" })
        .first();

      await expect(updatedApp.getByText(/\d+ installs/)).toBeVisible();
    });
  });

  test.describe("EXP-MKT-003: Configure Apps", () => {
    test.skip("should allow configuring installed app", async ({ page }) => {
      // Note: This test assumes there's a configuration UI
      // If not implemented, this test will need to be updated

      await page.goto("/app/marketplace");

      // Install an app that requires configuration
      const configurableApp = page
        .locator('[class*="border rounded-lg"]')
        .filter({ hasText: "Stripe" })
        .first();

      if ((await configurableApp.count()) > 0) {
        await configurableApp.getByRole("button", { name: "View Details" }).click();
        await page.getByRole("button", { name: "Install" }).click();

        await expect(
          page.getByText("App installed successfully!")
        ).toBeVisible({ timeout: 10000 });

        // Look for configuration button/link
        const configButton = page.getByText("Configure", { exact: false });
        if ((await configButton.count()) > 0) {
          await configButton.click();

          // Should show configuration form
          await expect(page.getByText("Configuration")).toBeVisible();
        }
      }
    });
  });

  test.describe("App Ratings", () => {
    test.skip("should rate an installed app", async ({ page }) => {
      await page.goto("/app/marketplace");

      // Install an app first
      const firstApp = page
        .locator('[class*="border rounded-lg"]')
        .filter({ hasNot: page.getByText("Coming Soon") })
        .first();
      await firstApp.getByRole("button", { name: "View Details" }).click();

      await page.getByRole("button", { name: "Install" }).click();
      await expect(page.getByText("App installed successfully!")).toBeVisible({
        timeout: 10000,
      });

      // Scroll to ratings section
      await page.getByText("Ratings & Reviews").scrollIntoViewIfNeeded();

      // Should show rating form
      await expect(page.getByText("Rate this app")).toBeVisible();

      // Select 5 stars
      const stars = page.locator('button[type="button"]').filter({ hasText: "★" });
      await stars.nth(4).click(); // Click 5th star

      // Add review text
      await page
        .getByPlaceholder("Share your experience")
        .fill("Great app! Very useful.");

      // Submit rating
      await page.getByRole("button", { name: "Submit Rating" }).click();

      // Should show success message
      await expect(
        page.getByText("Rating submitted successfully!")
      ).toBeVisible({ timeout: 10000 });

      // Should show user's rating
      await expect(page.getByText("Your Rating")).toBeVisible();
    });

    test.skip("should require app installation to rate", async ({ page }) => {
      await page.goto("/app/marketplace");

      // View app without installing
      const firstApp = page
        .locator('[class*="border rounded-lg"]')
        .filter({ hasNot: page.getByText("Coming Soon") })
        .first();
      await firstApp.getByRole("button", { name: "View Details" }).click();

      // Rating form should not be visible or should show install requirement
      const ratingForm = page.getByText("Rate this app");
      if ((await ratingForm.count()) > 0) {
        // If form is visible, attempting to submit should fail
        // This depends on the implementation
      }
    });

    test.skip("should display all app ratings", async ({ page }) => {
      await page.goto("/app/marketplace");

      // View any app
      const firstApp = page.locator('[class*="border rounded-lg"]').first();
      await firstApp.getByRole("button", { name: "View Details" }).click();

      // Scroll to ratings
      await page.getByText("Ratings & Reviews").scrollIntoViewIfNeeded();

      // Should show "All Reviews" section
      await expect(page.getByText("All Reviews")).toBeVisible();
    });

    test.skip("should update rating", async ({ page }) => {
      await page.goto("/app/marketplace");

      // Install and rate an app
      const firstApp = page
        .locator('[class*="border rounded-lg"]')
        .filter({ hasNot: page.getByText("Coming Soon") })
        .first();
      await firstApp.getByRole("button", { name: "View Details" }).click();

      await page.getByRole("button", { name: "Install" }).click();
      await expect(page.getByText("App installed successfully!")).toBeVisible({
        timeout: 10000,
      });

      await page.getByText("Ratings & Reviews").scrollIntoViewIfNeeded();

      // Rate with 4 stars
      const stars = page.locator('button[type="button"]').filter({ hasText: "★" });
      await stars.nth(3).click();
      await page.getByRole("button", { name: "Submit Rating" }).click();

      await expect(
        page.getByText("Rating submitted successfully!")
      ).toBeVisible({ timeout: 10000 });

      // Edit rating
      await page.getByRole("button", { name: "Edit" }).click();

      // Should show form again
      await expect(page.getByText("Rate this app")).toBeVisible();

      // Change to 5 stars
      await stars.nth(4).click();
      await page.getByRole("button", { name: "Submit Rating" }).click();

      await expect(
        page.getByText("Rating submitted successfully!")
      ).toBeVisible({ timeout: 10000 });
    });
  });
});

test.describe("App Marketplace - Admin", () => {
  test.beforeEach(async ({ page }) => {
    // Admin tests would require admin authentication
    // Skipping for now - testing API access
  });

  test.skip("should manage widgets from admin panel", async ({ page }) => {
    // Navigate to admin widgets page (if exists)
    await page.goto("/admin/widgets");

    // Should show widgets management interface
    await expect(page.locator("h1")).toContainText("Widget");

    // Should see all widgets including hidden ones
    const widgetRows = page.locator("table tbody tr");
    await expect(widgetRows.first()).toBeVisible();
  });
});
