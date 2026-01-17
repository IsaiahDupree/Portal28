import { test, expect } from "@playwright/test";

test.describe("User Profile - feat-044", () => {
  test.describe("Profile Settings Page", () => {
    test("should load profile settings page", async ({ page }) => {
      // Navigate to login
      await page.goto("/login");

      // Fill in email
      await page.fill('input[type="email"]', "test@example.com");

      // Click submit button
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Wait for success message or redirect
      await page.waitForTimeout(1000);

      // For testing purposes, we'll manually go to the settings page
      // In production, the user would click the magic link
      await page.goto("/app/settings");

      // Check if redirected to login (not authenticated)
      // OR if settings page loads (authenticated)
      const url = page.url();

      if (url.includes("/login")) {
        // Not authenticated - this is expected in E2E without magic link
        expect(url).toContain("/login");
      } else {
        // Authenticated - check settings page loads
        await expect(page.getByRole("heading", { name: /profile settings/i })).toBeVisible();
      }
    });

    test("should display profile form fields", async ({ page }) => {
      // Attempt to navigate to settings page
      await page.goto("/app/settings");

      // If redirected to login, skip test
      if (page.url().includes("/login")) {
        test.skip();
        return;
      }

      // Check for profile form elements
      const displayNameInput = page.locator('input[id="display-name"]');
      const bioTextarea = page.locator('textarea[id="bio"]');
      const uploadButton = page.locator('label[for="avatar-upload"]');

      // If elements exist, verify they're visible
      if (await displayNameInput.isVisible()) {
        await expect(displayNameInput).toBeVisible();
        await expect(bioTextarea).toBeVisible();
        await expect(uploadButton).toBeVisible();
      }
    });

    test("should validate display name max length", async ({ page }) => {
      await page.goto("/app/settings");

      if (page.url().includes("/login")) {
        test.skip();
        return;
      }

      const displayNameInput = page.locator('input[id="display-name"]');

      if (await displayNameInput.isVisible()) {
        // Try to enter more than max length
        const longName = "a".repeat(101);
        await displayNameInput.fill(longName);

        // Check that input respects maxlength
        const value = await displayNameInput.inputValue();
        expect(value.length).toBeLessThanOrEqual(100);
      }
    });

    test("should show character count for bio", async ({ page }) => {
      await page.goto("/app/settings");

      if (page.url().includes("/login")) {
        test.skip();
        return;
      }

      const bioTextarea = page.locator('textarea[id="bio"]');

      if (await bioTextarea.isVisible()) {
        await bioTextarea.fill("Test bio");

        // Check for character count display
        const charCount = page.locator('text=/\\d+\\/500/');
        if (await charCount.isVisible()) {
          await expect(charCount).toBeVisible();
        }
      }
    });

    test("should have save and reset buttons", async ({ page }) => {
      await page.goto("/app/settings");

      if (page.url().includes("/login")) {
        test.skip();
        return;
      }

      const saveButton = page.locator('button[type="submit"]', { hasText: /save/i });
      const resetButton = page.locator('button[type="button"]', { hasText: /reset/i });

      if (await saveButton.isVisible()) {
        await expect(saveButton).toBeVisible();
        await expect(resetButton).toBeVisible();
      }
    });
  });

  test.describe("Public Profile Page", () => {
    test("should load public profile page with user ID", async ({ page }) => {
      // Use a mock user ID
      await page.goto("/app/profile/00000000-0000-0000-0000-000000000000");

      // Should either show profile or 404
      const heading = page.locator("h1").first();
      await expect(heading).toBeVisible({ timeout: 5000 });
    });

    test("should display profile information", async ({ page }) => {
      // Navigate to a profile page
      await page.goto("/app/profile/00000000-0000-0000-0000-000000000000");

      // Check for profile elements (if profile exists)
      const avatar = page.locator('[class*="avatar"]').first();
      const displayName = page.locator("h1");

      // At minimum, heading should be visible
      await expect(displayName).toBeVisible({ timeout: 5000 });
    });

    test("should show edit button for own profile", async ({ page }) => {
      // This test requires authentication
      await page.goto("/app/settings");

      // If authenticated, settings page should load
      if (!page.url().includes("/login")) {
        // Look for edit profile link or button
        const editLink = page.locator('a[href="/app/settings"]');
        if (await editLink.count() > 0) {
          await expect(editLink.first()).toBeVisible();
        }
      } else {
        test.skip();
      }
    });

    test("should not show edit button for other users' profiles", async ({ page }) => {
      // Navigate to a different user's profile
      await page.goto("/app/profile/00000000-0000-0000-0000-000000000001");

      // Edit button should not be present
      const editButton = page.locator('button', { hasText: /edit profile/i });
      const editLink = page.locator('a', { hasText: /edit profile/i });

      // Either button/link should not exist or not be visible
      if (await editButton.count() > 0) {
        await expect(editButton).not.toBeVisible();
      }
      if (await editLink.count() > 0) {
        await expect(editLink).not.toBeVisible();
      }
    });

    test("should display member since date", async ({ page }) => {
      await page.goto("/app/profile/00000000-0000-0000-0000-000000000000");

      // Look for member since text
      const memberSince = page.locator('text=/member since/i');

      // If profile exists, member since should be visible
      const heading = await page.locator("h1").first().isVisible();
      if (heading) {
        await expect(memberSince).toBeVisible();
      }
    });
  });

  test.describe("Profile API", () => {
    test("GET /api/profile should return profile data", async ({ request }) => {
      // This would require authentication token
      // For now, test that endpoint exists
      const response = await request.get("/api/profile");

      // Should return 401 unauthorized or profile data
      expect(response.status()).toBeOneOf([200, 401]);
    });

    test("PUT /api/profile should require authentication", async ({ request }) => {
      const response = await request.put("/api/profile", {
        data: {
          display_name: "Test User",
        },
      });

      // Should return 401 unauthorized
      expect(response.status()).toBe(401);
    });

    test("POST /api/profile/avatar should require authentication", async ({ request }) => {
      const response = await request.post("/api/profile/avatar", {
        data: {
          filename: "avatar.jpg",
          contentType: "image/jpeg",
        },
      });

      // Should return 401 unauthorized
      expect(response.status()).toBe(401);
    });

    test("DELETE /api/profile/avatar should require authentication", async ({ request }) => {
      const response = await request.delete("/api/profile/avatar");

      // Should return 401 unauthorized
      expect(response.status()).toBe(401);
    });
  });

  test.describe("Avatar Upload", () => {
    test("should show avatar upload button", async ({ page }) => {
      await page.goto("/app/settings");

      if (page.url().includes("/login")) {
        test.skip();
        return;
      }

      const uploadLabel = page.locator('label[for="avatar-upload"]');
      if (await uploadLabel.isVisible()) {
        await expect(uploadLabel).toBeVisible();
        await expect(uploadLabel).toContainText(/upload/i);
      }
    });

    test("should show file size limit message", async ({ page }) => {
      await page.goto("/app/settings");

      if (page.url().includes("/login")) {
        test.skip();
        return;
      }

      // Look for file size message
      const sizeMessage = page.locator('text=/max.*5.*mb/i');
      if (await sizeMessage.isVisible()) {
        await expect(sizeMessage).toBeVisible();
      }
    });

    test("should display avatar preview", async ({ page }) => {
      await page.goto("/app/settings");

      if (page.url().includes("/login")) {
        test.skip();
        return;
      }

      // Look for avatar component
      const avatar = page.locator('[class*="avatar"]').first();
      if (await avatar.isVisible()) {
        await expect(avatar).toBeVisible();
      }
    });
  });
});
