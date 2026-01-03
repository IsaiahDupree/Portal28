import { test, expect } from "@playwright/test";

test.describe("Admin Pages", () => {
  test("should redirect unauthenticated users from /admin to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect from /admin/courses to login", async ({ page }) => {
    await page.goto("/admin/courses");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect from /admin/offers to login", async ({ page }) => {
    await page.goto("/admin/offers");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect from /admin/analytics to login", async ({ page }) => {
    await page.goto("/admin/analytics");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect from /admin/email-programs to login", async ({ page }) => {
    await page.goto("/admin/email-programs");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect from /admin/community to login", async ({ page }) => {
    await page.goto("/admin/community");
    await expect(page).toHaveURL(/\/login/);
  });
});
