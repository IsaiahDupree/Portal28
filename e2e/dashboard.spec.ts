import { test, expect } from "@playwright/test";

test.describe("Student Dashboard", () => {
  test("should redirect unauthenticated users from /app to login", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect from /app/courses to login", async ({ page }) => {
    await page.goto("/app/courses");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect from lesson pages to login", async ({ page }) => {
    await page.goto("/app/lesson/test-lesson-id");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Community Features", () => {
  test("should redirect from /app/community to login", async ({ page }) => {
    await page.goto("/app/community");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect from /app/community/forums to login", async ({ page }) => {
    await page.goto("/app/community/forums");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect from /app/community/announcements to login", async ({ page }) => {
    await page.goto("/app/community/announcements");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect from /app/community/resources to login", async ({ page }) => {
    await page.goto("/app/community/resources");
    await expect(page).toHaveURL(/\/login/);
  });
});
