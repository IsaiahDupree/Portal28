import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

test.describe("Advanced Search (feat-229)", () => {
  let testCourses: any[] = [];
  let testUser: any;

  test.beforeAll(async () => {
    // Create test user
    const userEmail = `search-test-${Date.now()}@test.com`;
    const { data: authData } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password: "TestPassword123!",
      email_confirm: true,
    });

    testUser = authData.user!;

    await supabaseAdmin.from("profiles").insert({
      id: testUser.id,
      email: userEmail,
    });

    // Create test courses for searching
    const { data: courses } = await supabaseAdmin
      .from("courses")
      .insert([
        {
          title: "Advanced JavaScript Programming",
          slug: "advanced-javascript-programming",
          description: "Learn advanced JavaScript concepts and patterns",
          long_description: "Deep dive into JavaScript closures, prototypes, and async programming",
          category: "programming",
          price_cents: 9900,
          status: "published",
          instructor_id: testUser.id,
        },
        {
          title: "Web Design Fundamentals",
          slug: "web-design-fundamentals",
          description: "Master the basics of web design",
          long_description: "Learn HTML, CSS, and design principles for modern web",
          category: "design",
          price_cents: 4900,
          status: "published",
          instructor_id: testUser.id,
        },
        {
          title: "Python for Data Science",
          slug: "python-data-science",
          description: "Data science with Python programming",
          long_description: "Use Python for data analysis, visualization, and machine learning",
          category: "programming",
          price_cents: 0,
          status: "published",
          instructor_id: testUser.id,
        },
      ])
      .select();

    testCourses = courses || [];

    // Create test lessons
    if (testCourses.length > 0) {
      await supabaseAdmin.from("lessons").insert([
        {
          course_id: testCourses[0].id,
          title: "JavaScript Closures Explained",
          description: "Understanding closures in JavaScript",
          video_transcript: "Closures are a fundamental concept in JavaScript programming",
          order_index: 1,
        },
        {
          course_id: testCourses[0].id,
          title: "Async/Await Patterns",
          description: "Modern asynchronous JavaScript patterns",
          video_transcript: "Learn how to write clean async code with async/await",
          order_index: 2,
        },
      ]);
    }
  });

  test.afterAll(async () => {
    // Cleanup
    if (testCourses.length > 0) {
      await supabaseAdmin
        .from("courses")
        .delete()
        .in("id", testCourses.map((c) => c.id));
    }
    if (testUser) {
      await supabaseAdmin.auth.admin.deleteUser(testUser.id);
    }
  });

  test("should search for courses successfully", async ({ page }) => {
    await page.goto("/search");

    // Enter search query
    await page.fill('input[placeholder*="Search"]', "JavaScript");
    await page.click('button[type="submit"]');

    // Wait for results
    await page.waitForTimeout(1000);

    // Check that results are displayed
    await expect(page.locator('text="Advanced JavaScript Programming"')).toBeVisible();
  });

  test("should filter search results by type", async ({ page }) => {
    await page.goto("/search?q=JavaScript");
    await page.waitForLoadState("networkidle");

    // Filter by courses only
    await page.click('[role="combobox"]:has-text("All")');
    await page.click('[role="option"]:has-text("Courses")');
    await page.waitForTimeout(500);

    // Should show courses section
    await expect(page.locator('text="Courses"')).toBeVisible();
  });

  test("should filter search results by category", async ({ page }) => {
    await page.goto("/search?q=programming");
    await page.waitForLoadState("networkidle");

    // Filter by programming category
    await page.click('[role="combobox"]:has-text("All categories")');
    await page.click('[role="option"]:has-text("Programming")');
    await page.waitForTimeout(500);

    // Should show programming courses
    const results = await page.locator('[role="heading"]').filter({ hasText: /JavaScript|Python/i });
    const count = await results.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should filter search results by price range", async ({ page }) => {
    await page.goto("/search?q=course");
    await page.waitForLoadState("networkidle");

    // Set price range (free courses only)
    await page.fill('input[placeholder="0"]', "0");
    await page.fill('input[placeholder="Any"]', "0");
    await page.waitForTimeout(500);

    // Should show only free courses
    const freeBadges = await page.locator('text="Free"').count();
    expect(freeBadges).toBeGreaterThan(0);
  });

  test("should show no results message for non-existent query", async ({ page }) => {
    await page.goto("/search");

    await page.fill('input[placeholder*="Search"]', "xyznonexistent12345");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    await expect(page.locator('text="No results found"')).toBeVisible();
  });

  test("should search for lessons", async ({ page }) => {
    await page.goto("/search?q=closures");
    await page.waitForLoadState("networkidle");

    // Should find lesson about closures
    await expect(page.locator('text="Closures"')).toBeVisible();
  });

  test("should track search analytics", async ({ page }) => {
    await page.goto("/search");

    await page.fill('input[placeholder*="Search"]', "analytics test");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // Check that search was tracked in database
    const { data: searchQueries } = await supabaseAdmin
      .from("search_queries")
      .select("*")
      .eq("query", "analytics test")
      .order("created_at", { ascending: false })
      .limit(1);

    expect(searchQueries).toBeTruthy();
    expect(searchQueries!.length).toBeGreaterThan(0);
  });

  test("should track search result clicks", async ({ page }) => {
    await page.goto("/search?q=JavaScript");
    await page.waitForLoadState("networkidle");

    const initialClickCount = await supabaseAdmin
      .from("search_result_clicks")
      .select("*", { count: "exact" });

    // Click on a search result
    const courseLink = page.locator('a:has-text("Advanced JavaScript")').first();
    if (await courseLink.isVisible()) {
      await courseLink.click();
      await page.waitForTimeout(500);

      // Check that click was tracked
      const { count: newClickCount } = await supabaseAdmin
        .from("search_result_clicks")
        .select("*", { count: "exact" });

      expect(newClickCount).toBeGreaterThan(initialClickCount.count || 0);
    }
  });

  test("should display search duration", async ({ page }) => {
    await page.goto("/search?q=test");
    await page.waitForLoadState("networkidle");

    // Should show search duration in milliseconds
    const durationText = await page.locator('text=/\\d+ms/i').first();
    await expect(durationText).toBeVisible();
  });

  test("should show course details in search results", async ({ page }) => {
    await page.goto("/search?q=JavaScript");
    await page.waitForLoadState("networkidle");

    // Should show course title
    await expect(page.locator('text="Advanced JavaScript Programming"')).toBeVisible();

    // Should show price
    const priceElement = page.locator('text=/\\$99/i');
    await expect(priceElement).toBeVisible();

    // Should show category badge
    await expect(page.locator('text="programming"')).toBeVisible();
  });

  test("API should validate search parameters", async ({ request }) => {
    // Test empty query
    const response1 = await request.get("/api/search?q=");
    expect(response1.status()).toBe(400);

    // Test valid query
    const response2 = await request.get("/api/search?q=test");
    expect(response2.status()).toBe(200);
    const data = await response2.json();
    expect(data.success).toBe(true);
    expect(data.query).toBe("test");
  });

  test("API should support pagination", async ({ request }) => {
    const response = await request.get("/api/search?q=programming&limit=2&offset=0");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.courses.length).toBeLessThanOrEqual(2);
  });

  test("API should return search duration metrics", async ({ request }) => {
    const response = await request.get("/api/search?q=test");
    const data = await response.json();

    expect(data.searchDurationMs).toBeDefined();
    expect(typeof data.searchDurationMs).toBe("number");
    expect(data.searchDurationMs).toBeGreaterThan(0);
  });
});
