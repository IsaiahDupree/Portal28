import { test, expect } from "@playwright/test";

test.describe("Community Pages", () => {
  // These tests require authentication, so they'll redirect to login
  test("should redirect unauthenticated users from community to login", async ({ page }) => {
    await page.goto("/app/community");

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect from community forums to login", async ({ page }) => {
    await page.goto("/app/community/forums");

    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect from community announcements to login", async ({ page }) => {
    await page.goto("/app/community/announcements");

    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect from community resources to login", async ({ page }) => {
    await page.goto("/app/community/resources");

    await expect(page).toHaveURL(/\/login/);
  });
});
