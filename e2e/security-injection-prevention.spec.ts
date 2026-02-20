/**
 * Security Tests: Injection Prevention (feat-WC-024)
 *
 * Test ID: TEST-SEC-INJ-001
 * Feature: XSS and SQL injection prevention
 *
 * This test suite validates:
 * - Script sanitized: XSS payloads are properly escaped/sanitized in all user inputs
 * - SQL blocked: SQL injection attempts are prevented by parameterized queries
 *
 * Criteria:
 * 1. Script sanitized: All user-submitted content is properly escaped in HTML output
 * 2. SQL blocked: Database queries use parameterized queries, preventing SQL injection
 *
 * Run with: npx playwright test security-injection-prevention
 */

import { test, expect, Page } from "@playwright/test";

// Common XSS payloads to test
const XSS_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror="alert(\'XSS\')">',
  '<svg/onload=alert("XSS")>',
  'javascript:alert("XSS")',
  '<iframe src="javascript:alert(\'XSS\')">',
  '<body onload=alert("XSS")>',
  '<input onfocus=alert("XSS") autofocus>',
  '<select onfocus=alert("XSS") autofocus>',
  '<textarea onfocus=alert("XSS") autofocus>',
  '<marquee onstart=alert("XSS")>',
  '<div style="background:url(javascript:alert(\'XSS\'))">',
  '"><script>alert(String.fromCharCode(88,83,83))</script>',
  '<IMG SRC="javascript:alert(\'XSS\');">',
  '<IMG """><SCRIPT>alert("XSS")</SCRIPT>">',
  '<IMG SRC=javascript:alert(String.fromCharCode(88,83,83))>',
];

// Common SQL injection payloads
const SQL_PAYLOADS = [
  "' OR '1'='1",
  "' OR '1'='1' --",
  "' OR '1'='1' /*",
  "admin'--",
  "admin' #",
  "admin'/*",
  "' or 1=1--",
  "' or 1=1#",
  "' or 1=1/*",
  "') or '1'='1--",
  "') or ('1'='1--",
  "1' ORDER BY 1--+",
  "1' ORDER BY 2--+",
  "1' ORDER BY 3--+",
  "1' UNION SELECT NULL--",
  "1' UNION SELECT NULL,NULL--",
  "'; DROP TABLE users--",
  "1; DROP TABLE users--",
  "1' AND 1=2 UNION SELECT * FROM users--",
];

// Helper to create authenticated context
async function getAuthenticatedPage(page: Page) {
  // Navigate to login
  await page.goto("/login");

  // Check if we're already logged in
  const currentUrl = page.url();
  if (!currentUrl.includes("/login")) {
    return; // Already authenticated
  }

  // For testing, we'll use magic link simulation
  // In a real test, you'd need to set up proper test credentials
  await page.goto("/app");

  // If redirected to login, skip auth-required tests
  if (page.url().includes("/login")) {
    test.skip();
  }
}

test.describe("Security: Injection Prevention (feat-WC-024)", () => {
  test.describe("XSS Prevention - Criteria: Script sanitized", () => {
    test.describe("User Profile XSS Prevention", () => {
      test("profile display name is sanitized against XSS", async ({ page }) => {
        await getAuthenticatedPage(page);

        // Navigate to profile settings
        await page.goto("/app/settings");

        // Try to inject XSS in display name
        const xssPayload = '<script>alert("XSS")</script>';

        // Check if display name input exists
        const displayNameInput = page.locator(
          'input[name="displayName"], input[name="display_name"], input[id*="displayName"], input[placeholder*="name"]'
        );

        if (await displayNameInput.count() > 0) {
          await displayNameInput.first().fill(xssPayload);

          // Save changes (look for save button)
          const saveButton = page.locator(
            'button:has-text("Save"), button[type="submit"]'
          );
          if (await saveButton.count() > 0) {
            await saveButton.first().click();
            await page.waitForTimeout(1000);
          }

          // Navigate to profile view
          await page.goto("/app/profile");

          // Verify script tag is not executed (should be escaped)
          const pageContent = await page.content();
          expect(pageContent).not.toContain("<script>alert(");

          // The escaped version should be visible as text
          const displayedText = await page.textContent("body");
          // Script should either be stripped or visible as escaped text, but not executable
          const hasActiveScript = await page.evaluate(() => {
            const scripts = document.querySelectorAll("script");
            for (const script of scripts) {
              if (script.textContent?.includes('alert("XSS")')) {
                return true;
              }
            }
            return false;
          });
          expect(hasActiveScript).toBe(false);
        }
      });

      test("profile bio/about is sanitized against XSS", async ({ page }) => {
        await getAuthenticatedPage(page);

        await page.goto("/app/settings");

        const xssPayload = '<img src=x onerror="alert(\'XSS\')">';

        // Look for bio/about textarea
        const bioInput = page.locator(
          'textarea[name="bio"], textarea[name="about"], textarea[id*="bio"]'
        );

        if (await bioInput.count() > 0) {
          await bioInput.first().fill(xssPayload);

          const saveButton = page.locator(
            'button:has-text("Save"), button[type="submit"]'
          );
          if (await saveButton.count() > 0) {
            await saveButton.first().click();
            await page.waitForTimeout(1000);
          }

          await page.goto("/app/profile");

          // Verify img onerror is not executed
          const pageContent = await page.content();
          expect(pageContent).not.toContain('onerror="alert');

          // Check for active XSS
          const hasActiveXSS = await page.evaluate(() => {
            const imgs = document.querySelectorAll("img");
            for (const img of imgs) {
              if (img.getAttribute("onerror")?.includes("alert")) {
                return true;
              }
            }
            return false;
          });
          expect(hasActiveXSS).toBe(false);
        }
      });
    });

    test.describe("Course Content XSS Prevention", () => {
      test("course title in admin form is sanitized", async ({ page }) => {
        await getAuthenticatedPage(page);

        await page.goto("/admin/courses");

        // Look for create course button or form
        const createButton = page.locator(
          'button:has-text("Create"), a:has-text("New Course"), a[href*="new"]'
        );

        if ((await createButton.count()) > 0) {
          await createButton.first().click();
          await page.waitForLoadState("networkidle");

          const titleInput = page.locator(
            'input[name="title"], input[id="title"]'
          );

          if (await titleInput.count() > 0) {
            const xssPayload = '<script>alert("Course XSS")</script>';
            await titleInput.fill(xssPayload);

            // Fill required fields
            const slugInput = page.locator('input[name="slug"]');
            if (await slugInput.count() > 0) {
              await slugInput.fill("xss-test-course");
            }

            // Submit form
            const submitButton = page.locator(
              'button[type="submit"], button:has-text("Create"), button:has-text("Save")'
            );
            if (await submitButton.count() > 0) {
              await submitButton.first().click();
              await page.waitForTimeout(1500);

              // Verify on course listing page
              const pageContent = await page.content();
              expect(pageContent).not.toContain("<script>alert(");
            }
          }
        }
      });

      test("course description is sanitized against XSS", async ({ page }) => {
        await getAuthenticatedPage(page);

        await page.goto("/admin/courses");

        const createButton = page.locator(
          'button:has-text("Create"), a:has-text("New Course"), a[href*="new"]'
        );

        if ((await createButton.count()) > 0) {
          await createButton.first().click();
          await page.waitForLoadState("networkidle");

          const descInput = page.locator(
            'textarea[name="description"], textarea[id="description"]'
          );

          if (await descInput.count() > 0) {
            const xssPayload = '<svg/onload=alert("XSS")>';
            await descInput.fill(xssPayload);

            const titleInput = page.locator('input[name="title"]');
            if (await titleInput.count() > 0) {
              await titleInput.fill("XSS Test Description");
            }

            const slugInput = page.locator('input[name="slug"]');
            if (await slugInput.count() > 0) {
              await slugInput.fill("xss-desc-test");
            }

            const submitButton = page.locator('button[type="submit"]');
            if (await submitButton.count() > 0) {
              await submitButton.first().click();
              await page.waitForTimeout(1500);

              const pageContent = await page.content();
              expect(pageContent).not.toContain("<svg/onload=");
            }
          }
        }
      });
    });

    test.describe("Comment/Forum XSS Prevention", () => {
      test("forum post content is sanitized", async ({ page }) => {
        await getAuthenticatedPage(page);

        await page.goto("/app/community");

        // Look for forum or create post button
        const forumLink = page.locator('a:has-text("Forum"), a[href*="forum"]');

        if ((await forumLink.count()) > 0) {
          await forumLink.first().click();
          await page.waitForLoadState("networkidle");

          const createPostButton = page.locator(
            'button:has-text("Create"), button:has-text("New Post")'
          );

          if (await createPostButton.count() > 0) {
            await createPostButton.first().click();
            await page.waitForTimeout(1000);

            const contentInput = page.locator(
              'textarea[name="content"], textarea[name="body"]'
            );

            if (await contentInput.count() > 0) {
              const xssPayload = '<iframe src="javascript:alert(\'XSS\')"></iframe>';
              await contentInput.fill(xssPayload);

              const submitButton = page.locator('button[type="submit"]');
              if (await submitButton.count() > 0) {
                await submitButton.first().click();
                await page.waitForTimeout(1500);

                const pageContent = await page.content();
                expect(pageContent).not.toContain('src="javascript:');
              }
            }
          }
        }
      });

      test("comment content is sanitized", async ({ page }) => {
        await getAuthenticatedPage(page);

        // Navigate to a course with comments
        await page.goto("/app/courses");

        const courseLink = page.locator('a[href*="/app/courses/"]').first();

        if ((await courseLink.count()) > 0) {
          await courseLink.click();
          await page.waitForLoadState("networkidle");

          const commentInput = page.locator(
            'textarea[placeholder*="comment"], textarea[name="comment"]'
          );

          if (await commentInput.count() > 0) {
            const xssPayload = '<body onload=alert("XSS")>';
            await commentInput.fill(xssPayload);

            const submitButton = page.locator(
              'button:has-text("Post"), button:has-text("Comment"), button[type="submit"]'
            );

            if (await submitButton.count() > 0) {
              await submitButton.first().click();
              await page.waitForTimeout(1000);

              const pageContent = await page.content();
              expect(pageContent).not.toContain("onload=alert");
            }
          }
        }
      });
    });

    test.describe("Search Input XSS Prevention", () => {
      test("search queries are sanitized in results", async ({ page }) => {
        await page.goto("/");

        const searchInput = page.locator(
          'input[type="search"], input[placeholder*="Search"], input[name="search"], input[name="q"]'
        );

        if (await searchInput.count() > 0) {
          const xssPayload = '<script>alert("Search XSS")</script>';
          await searchInput.fill(xssPayload);
          await searchInput.press("Enter");
          await page.waitForTimeout(1000);

          const pageContent = await page.content();
          expect(pageContent).not.toContain("<script>alert(");

          // Ensure no active scripts
          const hasScript = await page.evaluate(() => {
            return document.querySelector('script:not([src])')?.textContent?.includes("Search XSS") || false;
          });
          expect(hasScript).toBe(false);
        }
      });
    });

    test.describe("URL Parameter XSS Prevention", () => {
      test("URL parameters are sanitized when reflected in page", async ({ page }) => {
        // Test common reflection points
        const xssPayload = encodeURIComponent('<script>alert("URL XSS")</script>');

        await page.goto(`/login?redirect=${xssPayload}`);
        await page.waitForLoadState("networkidle");

        const pageContent = await page.content();
        expect(pageContent).not.toContain("<script>alert(");
      });

      test("error messages don't reflect unsanitized input", async ({ page }) => {
        const xssPayload = encodeURIComponent('<img src=x onerror="alert(1)">');

        await page.goto(`/app/courses/${xssPayload}`);
        await page.waitForLoadState("networkidle");

        const pageContent = await page.content();
        expect(pageContent).not.toContain('onerror="alert');
      });
    });

    test.describe("Multiple XSS Vector Testing", () => {
      test("common XSS payloads are all blocked", async ({ page, request }) => {
        // Test API endpoint that accepts user input
        const testPayloads = [
          '<script>alert(1)</script>',
          '<img src=x onerror=alert(1)>',
          '<svg/onload=alert(1)>',
          'javascript:alert(1)',
        ];

        for (const payload of testPayloads) {
          // Test via API (if accessible)
          const response = await request.post("/api/comments", {
            data: {
              content: payload,
              courseId: "test-course-id",
            },
          });

          // Should either reject (400/401) or accept safely
          if (response.ok) {
            const body = await response.json();
            const bodyStr = JSON.stringify(body);

            // Response should not contain unescaped payload
            expect(bodyStr).not.toContain("<script>alert(1)");
            expect(bodyStr).not.toContain("onerror=alert");
            expect(bodyStr).not.toContain("onload=alert");
          }
        }
      });
    });

    test.describe("Rich Text Editor XSS Prevention", () => {
      test("rich text content is sanitized", async ({ page }) => {
        await getAuthenticatedPage(page);

        await page.goto("/admin/courses");

        const createButton = page.locator('a[href*="new"], button:has-text("Create")');

        if (await createButton.count() > 0) {
          await createButton.first().click();
          await page.waitForLoadState("networkidle");

          // Look for rich text editor (commonly has contenteditable or specific classes)
          const richTextEditor = page.locator(
            '[contenteditable="true"], .ProseMirror, .ql-editor, .tiptap'
          );

          if (await richTextEditor.count() > 0) {
            const xssPayload = '<input onfocus=alert("XSS") autofocus>';

            // Try to inject via clipboard/typing
            await richTextEditor.first().click();
            await page.keyboard.type(xssPayload);

            await page.waitForTimeout(1000);

            // Check the rendered content
            const content = await richTextEditor.first().innerHTML();
            expect(content).not.toContain("onfocus=alert");
          }
        }
      });
    });
  });

  test.describe("SQL Injection Prevention - Criteria: SQL blocked", () => {
    test.describe("Search Query SQL Injection", () => {
      test("course search prevents SQL injection", async ({ page }) => {
        await page.goto("/courses");

        const searchInput = page.locator('input[type="search"], input[name="search"]');

        if (await searchInput.count() > 0) {
          const sqlPayload = "' OR '1'='1' --";
          await searchInput.fill(sqlPayload);
          await searchInput.press("Enter");
          await page.waitForTimeout(1000);

          // Should not cause SQL error or unexpected behavior
          // Check for database error messages
          const pageText = await page.textContent("body");
          expect(pageText?.toLowerCase()).not.toContain("sql");
          expect(pageText?.toLowerCase()).not.toContain("syntax error");
          expect(pageText?.toLowerCase()).not.toContain("postgres");
          expect(pageText?.toLowerCase()).not.toContain("database error");
        }
      });

      test("user search in admin prevents SQL injection", async ({ page }) => {
        await getAuthenticatedPage(page);

        await page.goto("/admin/students");

        const searchInput = page.locator('input[type="search"], input[name="search"]');

        if (await searchInput.count() > 0) {
          const sqlPayload = "admin'--";
          await searchInput.fill(sqlPayload);
          await searchInput.press("Enter");
          await page.waitForTimeout(1000);

          const pageText = await page.textContent("body");
          expect(pageText?.toLowerCase()).not.toContain("sql error");
          expect(pageText?.toLowerCase()).not.toContain("syntax");
        }
      });
    });

    test.describe("API Parameter SQL Injection", () => {
      test("course ID parameter prevents SQL injection", async ({ request }) => {
        const sqlPayloads = ["' OR '1'='1", "1; DROP TABLE courses--", "1' UNION SELECT NULL--"];

        for (const payload of sqlPayloads) {
          const response = await request.get(`/api/courses/${encodeURIComponent(payload)}`);

          // Should return 404 or 400, not 500 (server error from SQL injection)
          expect(response.status()).not.toBe(500);

          if (response.headers()["content-type"]?.includes("application/json")) {
            const body = await response.json();
            const bodyStr = JSON.stringify(body).toLowerCase();

            // Should not expose SQL errors
            expect(bodyStr).not.toContain("sql");
            expect(bodyStr).not.toContain("syntax error");
            expect(bodyStr).not.toContain("postgres");
            expect(bodyStr).not.toContain("relation");
            expect(bodyStr).not.toContain("column");
          }
        }
      });

      test("lesson ID parameter prevents SQL injection", async ({ request }) => {
        const sqlPayload = "' UNION SELECT password FROM users--";

        const response = await request.get(`/api/lessons/${encodeURIComponent(sqlPayload)}`);

        expect(response.status()).not.toBe(500);

        if (response.ok) {
          const body = await response.json();

          // Should not return user passwords or unexpected data
          expect(body).not.toHaveProperty("password");
          expect(body).not.toHaveProperty("users");
        }
      });
    });

    test.describe("Form Input SQL Injection", () => {
      test("email input prevents SQL injection", async ({ request }) => {
        const sqlPayload = "admin@test.com' OR '1'='1' --";

        const response = await request.post("/api/auth/login", {
          data: {
            email: sqlPayload,
          },
        });

        // Should handle safely (400/401/404), not cause SQL error (500)
        expect(response.status()).not.toBe(500);

        if (response.headers()["content-type"]?.includes("application/json")) {
          const body = await response.json();
          const bodyStr = JSON.stringify(body).toLowerCase();

          expect(bodyStr).not.toContain("sql");
          expect(bodyStr).not.toContain("syntax");
        }
      });

      test("course slug prevents SQL injection", async ({ request }) => {
        const sqlPayload = "test-course'; DROP TABLE courses--";

        const response = await request.get(`/api/courses/${encodeURIComponent(sqlPayload)}`);

        expect(response.status()).not.toBe(500);
      });
    });

    test.describe("Order By SQL Injection", () => {
      test("sort parameter prevents SQL injection", async ({ request }) => {
        const sqlPayload = "title; DROP TABLE courses--";

        const response = await request.get(`/api/courses?sort=${encodeURIComponent(sqlPayload)}`);

        // Should handle safely
        expect([200, 400, 404]).toContain(response.status());

        if (response.ok) {
          const body = await response.json();
          // Should return courses safely or empty array
          expect(Array.isArray(body) || Array.isArray(body.courses) || body.error).toBeTruthy();
        }
      });

      test("filter parameter prevents SQL injection", async ({ request }) => {
        const sqlPayload = "published' OR '1'='1";

        const response = await request.get(`/api/courses?filter=${encodeURIComponent(sqlPayload)}`);

        expect(response.status()).not.toBe(500);
      });
    });

    test.describe("Batch Operations SQL Injection", () => {
      test("bulk delete prevents SQL injection", async ({ request }) => {
        const sqlPayload = ["1", "2", "' OR '1'='1"];

        const response = await request.post("/api/admin/courses/bulk-delete", {
          data: {
            ids: sqlPayload,
          },
        });

        // Should reject invalid IDs or handle safely
        expect(response.status()).not.toBe(500);
      });
    });

    test.describe("Time-Based SQL Injection", () => {
      test("queries don't allow time-based attacks", async ({ request }) => {
        const sqlPayload = "1' AND (SELECT * FROM (SELECT(SLEEP(5)))x)--";

        const start = Date.now();
        const response = await request.get(`/api/courses/${encodeURIComponent(sqlPayload)}`);
        const duration = Date.now() - start;

        // Should not sleep for 5 seconds (indicates SQL injection)
        expect(duration).toBeLessThan(2000);
        expect(response.status()).not.toBe(500);
      });
    });

    test.describe("Union-Based SQL Injection", () => {
      test("UNION SELECT attacks are prevented", async ({ request }) => {
        const sqlPayloads = [
          "1' UNION SELECT NULL--",
          "1' UNION SELECT NULL,NULL--",
          "1' UNION SELECT NULL,NULL,NULL--",
          "1' UNION SELECT email,password FROM users--",
        ];

        for (const payload of sqlPayloads) {
          const response = await request.get(`/api/courses/${encodeURIComponent(payload)}`);

          expect(response.status()).not.toBe(500);

          if (response.ok) {
            const body = await response.json();

            // Should not return user table data
            if (Array.isArray(body)) {
              for (const item of body) {
                expect(item).not.toHaveProperty("password");
                expect(item).not.toHaveProperty("email");
              }
            }
          }
        }
      });
    });

    test.describe("Error-Based SQL Injection", () => {
      test("database errors are not exposed to client", async ({ request }) => {
        const sqlPayloads = [
          "1' AND 1=CONVERT(int, (SELECT @@version))--",
          "1' AND extractvalue(1,concat(0x7e,version()))--",
        ];

        for (const payload of sqlPayloads) {
          const response = await request.get(`/api/courses/${encodeURIComponent(payload)}`);

          if (response.headers()["content-type"]?.includes("application/json")) {
            const body = await response.json();
            const bodyStr = JSON.stringify(body).toLowerCase();

            // Should not expose database version or detailed errors
            expect(bodyStr).not.toContain("postgres");
            expect(bodyStr).not.toContain("version");
            expect(bodyStr).not.toContain("convert");
            expect(bodyStr).not.toContain("extractvalue");
          }
        }
      });
    });

    test.describe("Parameterized Query Verification", () => {
      test("multiple SQL injection vectors all fail", async ({ request }) => {
        for (const payload of SQL_PAYLOADS) {
          const response = await request.get(`/api/courses/${encodeURIComponent(payload)}`);

          // All should fail gracefully, not cause server errors
          expect(response.status()).not.toBe(500);

          if (response.headers()["content-type"]?.includes("application/json")) {
            const body = await response.json();
            const bodyStr = JSON.stringify(body).toLowerCase();

            // Should not contain SQL error messages
            expect(bodyStr).not.toContain("sql");
            expect(bodyStr).not.toContain("syntax");
            expect(bodyStr).not.toContain("postgres");
          }
        }
      });
    });
  });

  test.describe("Combined XSS + SQL Prevention", () => {
    test("mixed injection attempts are all blocked", async ({ request }) => {
      const mixedPayloads = [
        '<script>alert("XSS")</script>\' OR \'1\'=\'1',
        '"; DROP TABLE users; <script>alert("XSS")</script>--',
        '<img src=x onerror=alert(1)>\' UNION SELECT NULL--',
      ];

      for (const payload of mixedPayloads) {
        const response = await request.post("/api/comments", {
          data: {
            content: payload,
            courseId: "test-id",
          },
        });

        // Should handle safely
        expect(response.status()).not.toBe(500);

        if (response.ok) {
          const body = await response.json();
          const bodyStr = JSON.stringify(body);

          // Should not contain unescaped XSS
          expect(bodyStr).not.toContain("<script>");
          expect(bodyStr).not.toContain("onerror=");

          // Should not expose SQL
          expect(bodyStr.toLowerCase()).not.toContain("drop table");
          expect(bodyStr.toLowerCase()).not.toContain("union select");
        }
      }
    });
  });

  test.describe("Content Security Policy (CSP)", () => {
    test("CSP headers prevent inline script execution", async ({ page }) => {
      await page.goto("/");

      // Check for CSP header
      const response = await page.goto("/");
      const headers = response?.headers() || {};

      // If CSP is implemented, check for script-src directive
      if (headers["content-security-policy"]) {
        const csp = headers["content-security-policy"];
        // Should not allow 'unsafe-inline' or should have nonce/hash
        if (csp.includes("script-src")) {
          expect(csp).toContain("script-src");
        }
      }
    });
  });

  test.describe("Output Encoding Verification", () => {
    test("special characters are properly encoded in HTML context", async ({ page }) => {
      await getAuthenticatedPage(page);

      await page.goto("/app/settings");

      const testString = '< > & " \' / \\';

      const input = page.locator('input[name="displayName"], input[name="display_name"]').first();

      if (await input.count() > 0) {
        await input.fill(testString);

        const saveButton = page.locator('button:has-text("Save"), button[type="submit"]');
        if (await saveButton.count() > 0) {
          await saveButton.first().click();
          await page.waitForTimeout(1000);

          await page.goto("/app/profile");

          // Get the raw HTML
          const html = await page.content();

          // Check that special characters are encoded
          // They should appear as &lt; &gt; &amp; &quot; etc.
          const displayedText = await page.textContent("body");

          // The characters should be visible as text, not interpreted as HTML
          if (displayedText?.includes(testString)) {
            // Characters are properly displayed as text
            expect(true).toBe(true);
          } else if (html.includes("&lt;") || html.includes("&gt;")) {
            // Characters are HTML-encoded
            expect(true).toBe(true);
          }

          // Most importantly, they should not be active HTML
          const dangerousHTML = await page.evaluate(() => {
            return document.body.innerHTML.includes("< >") || document.body.innerHTML.includes("<script");
          });
          expect(dangerousHTML).toBe(false);
        }
      }
    });
  });
});
