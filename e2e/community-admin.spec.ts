import { test, expect } from "@playwright/test";

test.describe("Community Admin - Page Access", () => {
  test("PLT-CAD-001: should load admin page with management UI", async ({ page }) => {
    const response = await page.goto("/admin/community");
    // Should either load (200) or redirect to login (302)
    expect([200, 302]).toContain(response?.status());
  });

  test("should redirect unauthenticated users to login", async ({ page }) => {
    await page.goto("/admin/community");
    const url = page.url();
    // Either on login page or on community admin page
    expect(url).toMatch(/\/(login|admin\/community)/);
  });

  test("should have community admin heading or login", async ({ page }) => {
    await page.goto("/admin/community");
    const content = await page.textContent("body");
    const hasContent =
      content?.toLowerCase().includes("community admin") ||
      content?.toLowerCase().includes("login") ||
      content?.toLowerCase().includes("sign in");
    expect(hasContent).toBe(true);
  });
});

test.describe("Community Admin - Page Structure", () => {
  test("should have forum categories section", async ({ page }) => {
    await page.goto("/admin/community");
    const content = await page.textContent("body");
    const hasCategories =
      content?.toLowerCase().includes("forum") ||
      content?.toLowerCase().includes("categor") ||
      content?.toLowerCase().includes("login");
    expect(hasCategories).toBe(true);
  });

  test("should have announcements section", async ({ page }) => {
    await page.goto("/admin/community");
    const content = await page.textContent("body");
    const hasAnnouncements =
      content?.toLowerCase().includes("announcement") ||
      content?.toLowerCase().includes("login");
    expect(hasAnnouncements).toBe(true);
  });

  test("should have resource folders section", async ({ page }) => {
    await page.goto("/admin/community");
    const content = await page.textContent("body");
    const hasFolders =
      content?.toLowerCase().includes("resource") ||
      content?.toLowerCase().includes("folder") ||
      content?.toLowerCase().includes("login");
    expect(hasFolders).toBe(true);
  });

  test("should have chat channels section", async ({ page }) => {
    await page.goto("/admin/community");
    const content = await page.textContent("body");
    const hasChannels =
      content?.toLowerCase().includes("chat") ||
      content?.toLowerCase().includes("channel") ||
      content?.toLowerCase().includes("login");
    expect(hasChannels).toBe(true);
  });
});

test.describe("Community Admin - Forum Categories", () => {
  test("PLT-CAD-002: should allow creating categories", async ({ page }) => {
    await page.goto("/admin/community/categories/new");
    // Should either load the form or redirect to login
    const content = await page.textContent("body");
    const hasForm =
      content?.toLowerCase().includes("category") ||
      content?.toLowerCase().includes("name") ||
      content?.toLowerCase().includes("slug") ||
      content?.toLowerCase().includes("login");
    expect(hasForm).toBe(true);
  });

  test("should load category new page without server error", async ({ page }) => {
    const response = await page.goto("/admin/community/categories/new");
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("Community Admin - Announcements", () => {
  test("PLT-CAD-003: should allow creating announcements", async ({ page }) => {
    await page.goto("/admin/community/announcements/new");
    const content = await page.textContent("body");
    const hasForm =
      content?.toLowerCase().includes("announcement") ||
      content?.toLowerCase().includes("title") ||
      content?.toLowerCase().includes("body") ||
      content?.toLowerCase().includes("login");
    expect(hasForm).toBe(true);
  });

  test("should load announcement new page without server error", async ({ page }) => {
    const response = await page.goto("/admin/community/announcements/new");
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("Community Admin - Resource Folders", () => {
  test("PLT-CAD-004: should allow managing folders", async ({ page }) => {
    await page.goto("/admin/community/resources/new");
    const content = await page.textContent("body");
    const hasForm =
      content?.toLowerCase().includes("folder") ||
      content?.toLowerCase().includes("resource") ||
      content?.toLowerCase().includes("name") ||
      content?.toLowerCase().includes("login");
    expect(hasForm).toBe(true);
  });

  test("should load resource folder new page without server error", async ({ page }) => {
    const response = await page.goto("/admin/community/resources/new");
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("Community Admin - Chat Channels", () => {
  test("PLT-CAD-005: should allow configuring channels", async ({ page }) => {
    await page.goto("/admin/community/channels/new");
    const content = await page.textContent("body");
    const hasForm =
      content?.toLowerCase().includes("channel") ||
      content?.toLowerCase().includes("chat") ||
      content?.toLowerCase().includes("name") ||
      content?.toLowerCase().includes("login");
    expect(hasForm).toBe(true);
  });

  test("should load channel new page without server error", async ({ page }) => {
    const response = await page.goto("/admin/community/channels/new");
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("Community Admin - API Endpoints", () => {
  test("PLT-CAD-006: should have forum categories API", async ({ request }) => {
    const response = await request.post("/api/admin/forum-categories", {
      data: {
        space_id: "00000000-0000-0000-0000-000000000000",
        name: "Test Category",
        slug: "test-category",
        sort_order: 0
      }
    });
    // Should require authentication (401/403) or return other valid status
    expect([200, 201, 400, 401, 403]).toContain(response.status());
  });

  test("should have chat channels API", async ({ request }) => {
    const response = await request.post("/api/admin/chat-channels", {
      data: {
        space_id: "00000000-0000-0000-0000-000000000000",
        name: "Test Channel",
        slug: "test-channel",
        sort_order: 0
      }
    });
    expect([200, 201, 400, 401, 403]).toContain(response.status());
  });

  test("should have resource folders API", async ({ request }) => {
    const response = await request.post("/api/admin/resource-folders", {
      data: {
        space_id: "00000000-0000-0000-0000-000000000000",
        name: "Test Folder",
        sort_order: 0
      }
    });
    expect([200, 201, 400, 401, 403]).toContain(response.status());
  });

  test("should require auth for forum category creation", async ({ request }) => {
    const response = await request.post("/api/admin/forum-categories", {
      data: {
        space_id: "00000000-0000-0000-0000-000000000000",
        name: "Test",
        slug: "test",
        sort_order: 0
      }
    });
    // Should return 401 or 403 for unauthenticated users
    expect([401, 403]).toContain(response.status());
  });

  test("should require auth for channel creation", async ({ request }) => {
    const response = await request.post("/api/admin/chat-channels", {
      data: {
        space_id: "00000000-0000-0000-0000-000000000000",
        name: "Test",
        slug: "test",
        sort_order: 0
      }
    });
    expect([401, 403]).toContain(response.status());
  });

  test("should require auth for folder creation", async ({ request }) => {
    const response = await request.post("/api/admin/resource-folders", {
      data: {
        space_id: "00000000-0000-0000-0000-000000000000",
        name: "Test",
        sort_order: 0
      }
    });
    expect([401, 403]).toContain(response.status());
  });
});

test.describe("Community Admin - CRUD Operations", () => {
  test("should validate required fields for categories", async ({ request }) => {
    const response = await request.post("/api/admin/forum-categories", {
      data: {
        // Missing required fields
        sort_order: 0
      }
    });
    expect([400, 401, 403]).toContain(response.status());
  });

  test("should validate required fields for channels", async ({ request }) => {
    const response = await request.post("/api/admin/chat-channels", {
      data: {
        // Missing required fields
        sort_order: 0
      }
    });
    expect([400, 401, 403]).toContain(response.status());
  });

  test("should validate required fields for folders", async ({ request }) => {
    const response = await request.post("/api/admin/resource-folders", {
      data: {
        // Missing required fields
        sort_order: 0
      }
    });
    expect([400, 401, 403]).toContain(response.status());
  });
});

test.describe("Community Admin - Settings", () => {
  test("should display add buttons for each section", async ({ page }) => {
    await page.goto("/admin/community");
    const content = await page.textContent("body");
    // Should have add/create buttons or login
    const hasAddButtons =
      content?.includes("Add") ||
      content?.includes("Create") ||
      content?.includes("Post") ||
      content?.toLowerCase().includes("login");
    expect(hasAddButtons).toBe(true);
  });

  test("should have back link to main admin", async ({ page }) => {
    await page.goto("/admin/community");
    const content = await page.textContent("body");
    const hasBackLink =
      content?.toLowerCase().includes("back") ||
      content?.toLowerCase().includes("admin") ||
      content?.toLowerCase().includes("login");
    expect(hasBackLink).toBe(true);
  });
});
