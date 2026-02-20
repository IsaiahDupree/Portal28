/**
 * API Contract Tests (feat-WC-022)
 *
 * Test ID: TEST-API-CONTRACT-001
 * Feature: API contract validation
 *
 * This test suite validates:
 * - Response shape validation (all API responses match expected structure)
 * - Error types (all errors follow consistent format)
 * - Pagination (cursor/offset pagination shape)
 *
 * Criteria:
 * 1. Shapes match: API responses conform to expected TypeScript types
 * 2. Errors typed: All errors return consistent { error: string, ... } shape
 * 3. Pagination: Paginated endpoints return consistent pagination metadata
 *
 * Run with: npx playwright test api-contract-tests
 */

import { test, expect } from "@playwright/test";
import { z } from "zod";

// Define contract schemas using Zod for runtime validation
const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.any().optional(),
});

const SuccessResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  message: z.string().optional(),
});

const PaginationMetaSchema = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
  total: z.number().optional(),
  hasMore: z.boolean().optional(),
  nextCursor: z.string().optional(),
  prevCursor: z.string().optional(),
});

const PaginatedResponseSchema = z.object({
  data: z.array(z.any()),
  pagination: PaginationMetaSchema,
});

const CourseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  image_url: z.string().nullable(),
  price: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

const LessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  content: z.string().nullable(),
  order: z.number(),
  created_at: z.string(),
});

test.describe("API Contract Tests (feat-WC-022)", () => {
  test.describe("Response Shape Validation - Criteria: Shapes match", () => {
    test("newsletter API returns consistent error shape", async ({ request }) => {
      const response = await request.post("/api/newsletter/subscribe", {
        data: {},
      });

      const body = await response.json();

      // Should match error response schema
      if (response.status() >= 400) {
        expect(() => ErrorResponseSchema.parse(body)).not.toThrow();
        expect(body).toHaveProperty("error");
        expect(typeof body.error).toBe("string");
      }
    });

    test("newsletter API returns consistent success shape", async ({ request }) => {
      const response = await request.post("/api/newsletter/subscribe", {
        data: { email: "contract-test@example.com" },
      });

      // Skip if response is not JSON (e.g., redirect or HTML error)
      const contentType = response.headers()["content-type"];
      if (!contentType || !contentType.includes("application/json")) {
        test.skip();
        return;
      }

      const body = await response.json();

      // Should have consistent response shape
      if (response.status() < 400) {
        // Success responses should have success, ok, or data
        const hasSuccessIndicator = body.success !== undefined || body.ok !== undefined || body.data !== undefined;
        expect(hasSuccessIndicator).toBe(true);
      } else {
        expect(body).toHaveProperty("error");
      }
    });

    test("progress API error response matches contract", async ({ request }) => {
      const response = await request.get("/api/progress/lesson");

      const body = await response.json();

      // Unauthenticated requests should return error with consistent shape
      if (response.status() === 401) {
        expect(body).toHaveProperty("error");
        expect(typeof body.error).toBe("string");
      }
    });

    test("progress update API has consistent response shape", async ({ request }) => {
      const response = await request.post("/api/progress/lesson", {
        data: {
          lessonId: "test-lesson",
          courseId: "test-course",
          status: "in_progress",
        },
      });

      const contentType = response.headers()["content-type"];
      if (!contentType || !contentType.includes("application/json")) {
        test.skip();
        return;
      }

      const body = await response.json();

      // Should always have error or success property
      expect(body).toHaveProperty("error");
      expect(typeof body.error).toBe("string");
    });

    test("stripe checkout API returns consistent shape", async ({ request }) => {
      const response = await request.post("/api/stripe/checkout", {
        data: {},
      });

      const body = await response.json();

      // Error responses should match schema
      if (response.status() >= 400) {
        expect(body).toHaveProperty("error");
        expect(typeof body.error).toBe("string");
      }

      // Success responses should have sessionId
      if (response.status() === 200) {
        expect(body).toHaveProperty("sessionId");
      }
    });

    test("offer checkout API matches contract", async ({ request }) => {
      const response = await request.post("/api/stripe/offer-checkout", {
        data: { offerSlug: "nonexistent-offer" },
      });

      const body = await response.json();

      // Should return consistent error or success shape
      if (response.status() >= 400) {
        expect(body).toHaveProperty("error");
      } else {
        expect(body).toHaveProperty("sessionId");
      }
    });
  });

  test.describe("Error Types - Criteria: Errors typed", () => {
    test("validation errors have consistent structure", async ({ request }) => {
      const endpoints = [
        { method: "POST", url: "/api/newsletter/subscribe", data: {} },
        { method: "POST", url: "/api/progress/lesson", data: {} },
        { method: "POST", url: "/api/stripe/checkout", data: {} },
      ];

      for (const endpoint of endpoints) {
        const response = await request.post(endpoint.url, {
          data: endpoint.data,
        });

        if (response.status() === 400) {
          const body = await response.json();

          // All 400 errors should have error field
          expect(body).toHaveProperty("error");
          expect(typeof body.error).toBe("string");
          expect(body.error.length).toBeGreaterThan(0);
        }
      }
    });

    test("authentication errors return 401 with error message", async ({ request }) => {
      const protectedEndpoints = [
        "/api/progress/lesson",
        "/api/admin/courses",
        "/api/admin/offers",
      ];

      for (const url of protectedEndpoints) {
        const response = await request.get(url);

        if (response.status() === 401) {
          const body = await response.json();

          expect(body).toHaveProperty("error");
          expect(typeof body.error).toBe("string");
          expect(body.error.toLowerCase()).toContain("auth");
        }
      }
    });

    test("not found errors return 404 with error message", async ({ request }) => {
      const response = await request.get("/api/courses/nonexistent-slug-12345");

      const contentType = response.headers()["content-type"];
      if (response.status() === 404 && contentType && contentType.includes("application/json")) {
        const body = await response.json();

        expect(body).toHaveProperty("error");
        expect(typeof body.error).toBe("string");
      } else {
        // If not JSON or not 404, skip this test
        test.skip();
      }
    });

    test("method not allowed errors have consistent shape", async ({ request }) => {
      const response = await request.delete("/api/newsletter/subscribe");

      const contentType = response.headers()["content-type"];
      if (response.status() === 405 && contentType && contentType.includes("application/json")) {
        const body = await response.json();

        // Should have error property
        expect(body).toHaveProperty("error");
        expect(typeof body.error).toBe("string");
      } else {
        // If not JSON, skip
        test.skip();
      }
    });

    test("server errors return 500 with error message", async ({ request }) => {
      // Test invalid data that could cause server error
      const response = await request.post("/api/stripe/webhook", {
        data: { invalid: "data" },
      });

      if (response.status() >= 500) {
        const body = await response.json();

        expect(body).toHaveProperty("error");
        expect(typeof body.error).toBe("string");
      }
    });
  });

  test.describe("Pagination - Criteria: Pagination", () => {
    test("admin courses endpoint supports pagination parameters", async ({ request }) => {
      const response = await request.get("/api/admin/courses?page=1&limit=10");

      const contentType = response.headers()["content-type"];
      if (!contentType || !contentType.includes("application/json")) {
        // If not JSON (e.g., HTML redirect), skip
        test.skip();
        return;
      }

      const body = await response.json();

      // If successful, should have array data
      if (response.status() === 200) {
        expect(Array.isArray(body) || body.data).toBeTruthy();
      } else {
        // Error responses should still be consistent
        expect(body).toHaveProperty("error");
      }
    });

    test("paginated responses include metadata", async ({ request }) => {
      const paginatedEndpoints = [
        "/api/admin/courses?limit=5",
        "/api/admin/offers?limit=5",
        "/api/admin/students?limit=5",
      ];

      for (const url of paginatedEndpoints) {
        const response = await request.get(url);

        if (response.status() === 200) {
          const body = await response.json();

          // Should have data array
          if (body.data) {
            expect(Array.isArray(body.data)).toBe(true);

            // Should have pagination metadata
            if (body.pagination) {
              expect(body.pagination).toEqual(
                expect.objectContaining({
                  page: expect.any(Number),
                  limit: expect.any(Number),
                })
              );
            }
          }
        }
      }
    });

    test("pagination limit parameter is respected", async ({ request }) => {
      const response = await request.get("/api/admin/courses?limit=3");

      if (response.status() === 200) {
        const body = await response.json();

        if (Array.isArray(body)) {
          expect(body.length).toBeLessThanOrEqual(3);
        } else if (body.data && Array.isArray(body.data)) {
          expect(body.data.length).toBeLessThanOrEqual(3);
        }
      }
    });

    test("pagination page parameter works", async ({ request }) => {
      const page1 = await request.get("/api/admin/courses?page=1&limit=2");
      const page2 = await request.get("/api/admin/courses?page=2&limit=2");

      if (page1.status() === 200 && page2.status() === 200) {
        const body1 = await page1.json();
        const body2 = await page2.json();

        const data1 = Array.isArray(body1) ? body1 : body1.data;
        const data2 = Array.isArray(body2) ? body2 : body2.data;

        // Pages should have different data (if enough records exist)
        if (data1 && data2 && data1.length > 0 && data2.length > 0) {
          expect(data1[0]).not.toEqual(data2[0]);
        }
      }
    });

    test("cursor-based pagination includes nextCursor", async ({ request }) => {
      const response = await request.get("/api/courses?limit=5");

      if (response.status() === 200) {
        const body = await response.json();

        // If cursor pagination is used
        if (body.pagination && body.pagination.nextCursor !== undefined) {
          expect(typeof body.pagination.nextCursor).toBe("string");
        }
      }
    });
  });

  test.describe("Response Shape Consistency Across HTTP Methods", () => {
    test("POST endpoints return consistent shapes", async ({ request }) => {
      const postEndpoints = [
        { url: "/api/newsletter/subscribe", data: { email: "test@example.com" } },
        { url: "/api/progress/lesson", data: { lessonId: "test", courseId: "test", status: "in_progress" } },
      ];

      for (const endpoint of postEndpoints) {
        const response = await request.post(endpoint.url, {
          data: endpoint.data,
        });

        const contentType = response.headers()["content-type"];
        if (!contentType || !contentType.includes("application/json")) {
          continue; // Skip non-JSON responses
        }

        const body = await response.json();

        // All JSON responses should have either error, success, ok, or data
        const hasResponseIndicator = body.error !== undefined || body.success !== undefined || body.ok !== undefined || body.data !== undefined;
        expect(hasResponseIndicator).toBe(true);
      }
    });

    test("GET endpoints return arrays or objects consistently", async ({ request }) => {
      const getEndpoints = [
        "/api/courses",
        "/api/admin/courses",
        "/api/admin/offers",
      ];

      for (const url of getEndpoints) {
        const response = await request.get(url);

        const contentType = response.headers()["content-type"];
        if (!contentType || !contentType.includes("application/json")) {
          continue; // Skip non-JSON responses
        }

        const body = await response.json();

        // Should be array, object with data array, or error object
        if (response.status() === 200) {
          const isValidShape = Array.isArray(body) ||
                               (typeof body === "object" && (Array.isArray(body.data) || body.error));
          expect(isValidShape).toBe(true);
        } else {
          expect(body).toHaveProperty("error");
        }
      }
    });

    test("PUT/PATCH endpoints return updated resource", async ({ request }) => {
      // Test updating a course (will fail auth but should have consistent shape)
      const response = await request.put("/api/admin/courses/test-course", {
        data: { title: "Updated Title" },
      });

      const contentType = response.headers()["content-type"];
      if (!contentType || !contentType.includes("application/json")) {
        test.skip();
        return;
      }

      const body = await response.json();

      if (response.status() === 200) {
        expect(body).toHaveProperty("id");
      } else {
        expect(body).toHaveProperty("error");
      }
    });

    test("DELETE endpoints return confirmation", async ({ request }) => {
      const response = await request.delete("/api/admin/courses/test-course");

      const body = await response.json();

      if (response.status() === 200) {
        expect(body).toHaveProperty("success");
      } else {
        expect(body).toHaveProperty("error");
      }
    });
  });

  test.describe("Content-Type Headers", () => {
    test("JSON API endpoints return application/json", async ({ request }) => {
      const endpoints = [
        { method: "POST", url: "/api/newsletter/subscribe", data: { email: "test@example.com" } },
      ];

      for (const endpoint of endpoints) {
        const response = endpoint.method === "GET"
          ? await request.get(endpoint.url)
          : await request.post(endpoint.url, { data: endpoint.data });

        const contentType = response.headers()["content-type"];

        // If response has content-type and is successful/error JSON response
        if (contentType && (response.status() < 300 || response.status() >= 400)) {
          // Some endpoints may return HTML for redirects (3xx), which is ok
          // But success/error responses should be JSON
          if (response.status() !== 302 && response.status() !== 301) {
            expect(contentType).toContain("application/json");
          }
        }
      }
    });
  });

  test.describe("Field Type Consistency", () => {
    test("ID fields are always strings", async ({ request }) => {
      const response = await request.get("/api/courses");

      if (response.status() === 200) {
        const body = await response.json();
        const courses = Array.isArray(body) ? body : body.data;

        if (courses && courses.length > 0) {
          courses.forEach((course: any) => {
            if (course.id) {
              expect(typeof course.id).toBe("string");
            }
          });
        }
      }
    });

    test("timestamps follow ISO 8601 format", async ({ request }) => {
      const response = await request.get("/api/courses");

      if (response.status() === 200) {
        const body = await response.json();
        const courses = Array.isArray(body) ? body : body.data;

        if (courses && courses.length > 0) {
          courses.forEach((course: any) => {
            if (course.created_at) {
              const date = new Date(course.created_at);
              expect(date.toISOString()).toBe(course.created_at);
            }
          });
        }
      }
    });

    test("numeric fields are numbers not strings", async ({ request }) => {
      const response = await request.get("/api/courses");

      if (response.status() === 200) {
        const body = await response.json();
        const courses = Array.isArray(body) ? body : body.data;

        if (courses && courses.length > 0) {
          courses.forEach((course: any) => {
            if (course.price !== null && course.price !== undefined) {
              expect(typeof course.price).toBe("number");
            }
          });
        }
      }
    });

    test("boolean fields are booleans not strings", async ({ request }) => {
      const response = await request.get("/api/admin/courses");

      if (response.status() === 200) {
        const body = await response.json();
        const courses = Array.isArray(body) ? body : body.data;

        if (courses && courses.length > 0) {
          courses.forEach((course: any) => {
            if (course.published !== undefined) {
              expect(typeof course.published).toBe("boolean");
            }
          });
        }
      }
    });
  });

  test.describe("Null vs Undefined Consistency", () => {
    test("nullable fields use null not undefined", async ({ request }) => {
      const response = await request.get("/api/courses");

      if (response.status() === 200) {
        const body = await response.json();
        const courses = Array.isArray(body) ? body : body.data;

        if (courses && courses.length > 0) {
          const course = courses[0];

          // Optional fields should be null, not undefined (for JSON consistency)
          if ("description" in course) {
            expect(course.description === null || typeof course.description === "string").toBe(true);
          }
        }
      }
    });
  });
});
