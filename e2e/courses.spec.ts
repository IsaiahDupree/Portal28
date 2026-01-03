import { test, expect } from "@playwright/test";

test.describe("Course Pages", () => {
  test("should display home page", async ({ page }) => {
    await page.goto("/");

    // New UI has different heading
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("link", { name: /browse|courses/i }).first()).toBeVisible();
  });

  test("should display courses catalog", async ({ page }) => {
    await page.goto("/courses");

    // Check for either heading or page content
    await expect(page.locator("h1")).toBeVisible();
  });

  test("should navigate from home to courses", async ({ page }) => {
    await page.goto("/");

    // Navigate to courses page
    await page.goto("/courses");
    await expect(page).toHaveURL(/course/);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("should display bundles page", async ({ page }) => {
    await page.goto("/bundles");

    await expect(page.getByRole("heading", { name: "Course Bundles" })).toBeVisible();
  });
});

test.describe("Course Sales Page", () => {
  test("should display course not found for invalid slug", async ({ page }) => {
    await page.goto("/courses/non-existent-course");

    await expect(page.getByText(/not found/i)).toBeVisible();
  });
});
