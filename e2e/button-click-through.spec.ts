import { test, expect, Page } from "@playwright/test";

const BASE_URL = "https://www.portal28.academy";
const ADMIN_EMAIL = "isaiahdupree33@gmail.com";
const ADMIN_PASSWORD = "Frogger12";

async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(app|admin)/, { timeout: 15000 });
}

async function clickAllButtons(page: Page, pageName: string) {
  const buttons = await page.locator('button:visible, a[role="button"]:visible').all();
  const results: { text: string; clicked: boolean; error?: string }[] = [];
  
  for (let i = 0; i < buttons.length; i++) {
    try {
      const button = page.locator('button:visible, a[role="button"]:visible').nth(i);
      const text = await button.textContent() || `Button ${i}`;
      const isDisabled = await button.isDisabled().catch(() => false);
      
      if (!isDisabled) {
        // Don't click logout, delete, or destructive buttons
        const lowerText = text.toLowerCase();
        if (lowerText.includes('logout') || lowerText.includes('delete') || 
            lowerText.includes('remove') || lowerText.includes('sign out')) {
          results.push({ text: text.trim(), clicked: false, error: 'Skipped destructive action' });
          continue;
        }
        
        await button.click({ timeout: 3000 }).catch(() => {});
        results.push({ text: text.trim(), clicked: true });
      } else {
        results.push({ text: text.trim(), clicked: false, error: 'Disabled' });
      }
    } catch (e) {
      results.push({ text: `Button ${i}`, clicked: false, error: String(e) });
    }
  }
  
  console.log(`[${pageName}] Clicked ${results.filter(r => r.clicked).length}/${results.length} buttons`);
  return results;
}

async function clickAllLinks(page: Page, pageName: string) {
  const links = await page.locator('a[href]:visible').all();
  const hrefs: string[] = [];
  
  for (const link of links) {
    try {
      const href = await link.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        hrefs.push(href);
      }
    } catch (e) {}
  }
  
  console.log(`[${pageName}] Found ${hrefs.length} links`);
  return hrefs;
}

test.describe("Public Pages - Button Click Through", () => {
  test("Home page buttons and links", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveURL(BASE_URL + "/");
    
    const buttons = await clickAllButtons(page, "Home");
    const links = await clickAllLinks(page, "Home");
    
    expect(buttons.length + links.length).toBeGreaterThan(0);
  });

  test("Courses page buttons and links", async ({ page }) => {
    await page.goto(`${BASE_URL}/courses`);
    await page.waitForLoadState('networkidle');
    
    const buttons = await clickAllButtons(page, "Courses");
    const links = await clickAllLinks(page, "Courses");
    
    // Take screenshot for visual review
    await page.screenshot({ path: 'test-results/courses-page.png', fullPage: true });
  });

  test("About page", async ({ page }) => {
    await page.goto(`${BASE_URL}/about`);
    await page.waitForLoadState('networkidle');
    
    await clickAllButtons(page, "About");
    await page.screenshot({ path: 'test-results/about-page.png', fullPage: true });
  });

  test("Login page buttons", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Test form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    await page.screenshot({ path: 'test-results/login-page.png', fullPage: true });
  });

  test("Signup page buttons", async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    
    await expect(page.locator('input[id="name"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    await page.screenshot({ path: 'test-results/signup-page.png', fullPage: true });
  });

  test("FAQ page", async ({ page }) => {
    await page.goto(`${BASE_URL}/faq`);
    await page.waitForLoadState('networkidle');
    
    // Click accordion items if present
    const accordions = await page.locator('[data-state="closed"], .accordion-trigger, button:has-text("?")').all();
    for (const accordion of accordions.slice(0, 5)) {
      await accordion.click().catch(() => {});
      await page.waitForTimeout(300);
    }
    
    await page.screenshot({ path: 'test-results/faq-page.png', fullPage: true });
  });
});

test.describe("Admin Pages - Button Click Through", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Admin dashboard buttons", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
    
    await clickAllButtons(page, "Admin Dashboard");
    await clickAllLinks(page, "Admin Dashboard");
    
    await page.screenshot({ path: 'test-results/admin-dashboard.png', fullPage: true });
  });

  test("Admin courses page", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/courses`);
    await page.waitForLoadState('networkidle');
    
    await clickAllButtons(page, "Admin Courses");
    await page.screenshot({ path: 'test-results/admin-courses.png', fullPage: true });
  });

  test("Admin analytics page", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/analytics`);
    await page.waitForLoadState('networkidle');
    
    await clickAllButtons(page, "Admin Analytics");
    await page.screenshot({ path: 'test-results/admin-analytics.png', fullPage: true });
  });

  test("Admin community page", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/community`);
    await page.waitForLoadState('networkidle');
    
    await clickAllButtons(page, "Admin Community");
    await page.screenshot({ path: 'test-results/admin-community.png', fullPage: true });
  });

  test("Admin announcements page", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/announcements`);
    await page.waitForLoadState('networkidle');
    
    await clickAllButtons(page, "Admin Announcements");
    await page.screenshot({ path: 'test-results/admin-announcements.png', fullPage: true });
  });

  test("Admin moderation page", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/moderation`);
    await page.waitForLoadState('networkidle');
    
    await clickAllButtons(page, "Admin Moderation");
    await page.screenshot({ path: 'test-results/admin-moderation.png', fullPage: true });
  });

  test("Admin offers page", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/offers`);
    await page.waitForLoadState('networkidle');
    
    await clickAllButtons(page, "Admin Offers");
    await page.screenshot({ path: 'test-results/admin-offers.png', fullPage: true });
  });

  test("Admin subscribers page", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/subscribers`);
    await page.waitForLoadState('networkidle');
    
    await clickAllButtons(page, "Admin Subscribers");
    await page.screenshot({ path: 'test-results/admin-subscribers.png', fullPage: true });
  });

  test("Admin studio page", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/studio`);
    await page.waitForLoadState('networkidle');
    
    await clickAllButtons(page, "Admin Studio");
    await page.screenshot({ path: 'test-results/admin-studio.png', fullPage: true });
  });
});

test.describe("App Pages - Authenticated User", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("App dashboard", async ({ page }) => {
    await page.goto(`${BASE_URL}/app`);
    await page.waitForLoadState('networkidle');
    
    await clickAllButtons(page, "App Dashboard");
    await clickAllLinks(page, "App Dashboard");
    
    await page.screenshot({ path: 'test-results/app-dashboard.png', fullPage: true });
  });

  test("App courses", async ({ page }) => {
    await page.goto(`${BASE_URL}/app/courses`);
    await page.waitForLoadState('networkidle');
    
    await clickAllButtons(page, "App Courses");
    await page.screenshot({ path: 'test-results/app-courses.png', fullPage: true });
  });

  test("App community", async ({ page }) => {
    await page.goto(`${BASE_URL}/app/community`);
    await page.waitForLoadState('networkidle');
    
    await clickAllButtons(page, "App Community");
    await page.screenshot({ path: 'test-results/app-community.png', fullPage: true });
  });

  test("App profile", async ({ page }) => {
    await page.goto(`${BASE_URL}/app/profile`);
    await page.waitForLoadState('networkidle');
    
    await clickAllButtons(page, "App Profile");
    await page.screenshot({ path: 'test-results/app-profile.png', fullPage: true });
  });
});
