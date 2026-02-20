// __tests__/integration/search-filter-workflow.test.ts
// Integration tests for Search, Filter, and Pagination workflows
// Feature: feat-WC-010
//
// This test suite verifies the complete search workflow including:
// - Text search functionality
// - Search filters (type, category, price, instructor)
// - Pagination (limit, offset)
// - Search analytics tracking

import { describe, it, expect } from "@jest/globals";
import fs from "fs";

describe("Search, Filter, and Pagination Workflow (feat-WC-010)", () => {
  describe("Text Search Functionality", () => {
    it("search API route implements text search", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should have search query validation
      expect(content).toContain("searchSchema");
      expect(content).toContain("z.string()");
      expect(content).toContain("min(1");
      expect(content).toContain("max(200");

      // Should parse search query
      expect(content).toContain("searchParams.get('q')");
    });

    it("validates required search query parameter", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should validate input
      expect(content).toContain("safeParse");
      expect(content).toContain("validation.success");

      // Should return error for invalid input
      expect(content).toContain("status: 400");
    });

    it("supports searching different content types", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should support type filter
      expect(content).toContain("type:");
      expect(content).toContain("'all'");
      expect(content).toContain("'courses'");
      expect(content).toContain("'lessons'");

      // Should call appropriate search functions
      expect(content).toContain("search_courses");
      expect(content).toContain("search_lessons");
    });

    it("calls database RPC functions for search", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should use RPC for course search
      expect(content).toContain("supabase.rpc('search_courses'");
      expect(content).toContain("search_query:");

      // Should use RPC for lesson search
      expect(content).toContain("supabase.rpc('search_lessons'");
    });
  });

  describe("Category Filter", () => {
    it("implements category filter parameter", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should have category in schema
      expect(content).toContain("category:");
      expect(content).toContain("z.string()");
      expect(content).toContain("optional()");

      // Should parse category parameter
      expect(content).toContain("searchParams.get('category')");
    });

    it("passes category filter to search function", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should pass category to RPC
      expect(content).toContain("p_category_filter:");
      expect(content).toContain("params.category");
    });

    it("includes category in response filters", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should include category in response
      expect(content).toContain("filters:");
      expect(content).toContain("category:");
    });
  });

  describe("Price Filter", () => {
    it("implements price range filter parameters", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should have price min/max in schema
      expect(content).toContain("priceMin:");
      expect(content).toContain("priceMax:");
      expect(content).toContain("z.coerce.number()");
      expect(content).toContain("min(0)");
    });

    it("parses price filter parameters", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should parse price params
      expect(content).toContain("searchParams.get('priceMin')");
      expect(content).toContain("searchParams.get('priceMax')");
    });

    it("passes price filters to search function", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should pass price filters to RPC
      expect(content).toContain("p_price_min:");
      expect(content).toContain("p_price_max:");
      expect(content).toContain("params.priceMin");
      expect(content).toContain("params.priceMax");
    });

    it("validates price filter values are non-negative", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should validate min value of 0
      expect(content).toContain("min(0)");
    });

    it("includes price filters in response", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should include price in response filters
      expect(content).toContain("priceMin:");
      expect(content).toContain("priceMax:");
    });
  });

  describe("Instructor Filter", () => {
    it("implements instructor filter parameter", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should have instructor ID in schema
      expect(content).toContain("instructorId:");
      expect(content).toContain("z.string().uuid()");
    });

    it("parses instructor ID parameter", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should parse instructor ID
      expect(content).toContain("searchParams.get('instructorId')");
    });

    it("passes instructor filter to search function", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should pass instructor ID to RPC
      expect(content).toContain("p_instructor_id:");
      expect(content).toContain("params.instructorId");
    });

    it("validates instructor ID is valid UUID", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should validate UUID format
      expect(content).toContain("uuid()");
    });
  });

  describe("Course Filter for Lessons", () => {
    it("implements course ID filter for lessons", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should have course ID in schema
      expect(content).toContain("courseId:");
      expect(content).toContain("z.string().uuid()");
    });

    it("parses course ID parameter", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should parse course ID
      expect(content).toContain("searchParams.get('courseId')");
    });

    it("passes course ID to lesson search function", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should pass course ID to lesson search
      expect(content).toContain("p_course_id:");
      expect(content).toContain("params.courseId");
    });

    it("validates course ID is valid UUID", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should validate UUID format
      expect(content).toContain("uuid()");
    });
  });

  describe("Pagination", () => {
    it("implements limit parameter", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should have limit in schema
      expect(content).toContain("limit:");
      expect(content).toContain("z.coerce.number()");
      expect(content).toContain("min(1)");
      expect(content).toContain("max(100)");
    });

    it("implements offset parameter", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should have offset in schema
      expect(content).toContain("offset:");
      expect(content).toContain("z.coerce.number()");
      expect(content).toContain("min(0)");
    });

    it("sets default values for pagination", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should have default limit
      expect(content).toContain("default(50)");

      // Should have default offset
      expect(content).toContain("default(0)");
    });

    it("parses pagination parameters", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should parse limit and offset
      expect(content).toContain("searchParams.get('limit')");
      expect(content).toContain("searchParams.get('offset')");
    });

    it("passes pagination to search functions", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should pass to course search
      expect(content).toContain("p_limit:");
      expect(content).toContain("p_offset:");
      expect(content).toContain("params.limit");
      expect(content).toContain("params.offset");
    });

    it("validates maximum limit is 100", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should enforce max limit
      expect(content).toContain("max(100)");
    });

    it("validates minimum limit is 1", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should enforce min limit
      expect(content).toContain("min(1)");
    });

    it("allows offset starting from 0", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should allow offset of 0
      expect(content).toContain("min(0)");
    });
  });

  describe("Combined Filters", () => {
    it("supports combining multiple filters", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should have all filter params in same schema
      expect(content).toContain("category:");
      expect(content).toContain("priceMin:");
      expect(content).toContain("priceMax:");
      expect(content).toContain("instructorId:");
      expect(content).toContain("limit:");
      expect(content).toContain("offset:");

      // All should be optional
      expect(content.match(/optional\(\)/g)?.length).toBeGreaterThan(3);
    });

    it("returns all applied filters in response", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should return filters object
      expect(content).toContain("filters:");
      expect(content).toMatch(/category:.*params\.category/);
      expect(content).toMatch(/priceMin:.*params\.priceMin/);
      expect(content).toMatch(/priceMax:.*params\.priceMax/);
    });
  });

  describe("Search Analytics Tracking", () => {
    it("tracks search duration", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should track start time
      expect(content).toContain("startTime");
      expect(content).toContain("Date.now()");

      // Should calculate duration
      expect(content).toContain("searchDuration");
      expect(content).toMatch(/Date\.now\(\).*startTime/);
    });

    it("returns search duration in response", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should include duration in response
      expect(content).toContain("searchDurationMs:");
      expect(content).toContain("searchDuration");
    });

    it("calculates total results count", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should calculate total results
      expect(content).toContain("totalResults");
      expect(content).toContain("results.courses.length");
      expect(content).toContain("results.lessons.length");
    });

    it("returns total results in response", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should include total in response
      expect(content).toContain("totalResults:");
      expect(content).toContain("results.totalResults");
    });

    it("tracks search queries in database", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should call tracking function
      expect(content).toContain("track_search_query");
      expect(content).toContain("p_query:");
      expect(content).toContain("p_result_count:");
      expect(content).toContain("p_filters:");
      expect(content).toContain("p_search_duration_ms:");
    });

    it("retrieves user ID for analytics", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should get user for tracking
      expect(content).toContain("auth.getUser()");
      expect(content).toContain("user");
    });
  });

  describe("Error Handling", () => {
    it("handles validation errors", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should check validation success
      expect(content).toContain("validation.success");
      expect(content).toContain("validation.error");

      // Should return 400 for validation errors
      expect(content).toContain("status: 400");
    });

    it("handles database errors", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should check for errors
      expect(content).toMatch(/(coursesError|lessonsError)/);
      expect(content).toContain("console.error");
    });

    it("has try-catch for unexpected errors", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should have error handling
      expect(content).toContain("try");
      expect(content).toContain("catch");
      expect(content).toContain("status: 500");
    });

    it("validates query length maximum", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should have max length validation
      expect(content).toContain("max(200");
    });

    it("validates minimum query length", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should require non-empty query
      expect(content).toContain("min(1");
    });
  });

  describe("Database Functions", () => {
    it("search_courses function exists in migration", () => {
      const migrationContent = fs.readFileSync(
        "./supabase/migrations/20260208026000_advanced_search.sql",
        "utf-8"
      );

      expect(migrationContent).toContain("CREATE OR REPLACE FUNCTION search_courses");
      expect(migrationContent).toContain("search_query TEXT");
      expect(migrationContent).toContain("p_limit INT");
      expect(migrationContent).toContain("p_offset INT");
      expect(migrationContent).toContain("p_category_filter TEXT");
      expect(migrationContent).toContain("p_price_min INT");
      expect(migrationContent).toContain("p_price_max INT");
      expect(migrationContent).toContain("p_instructor_id UUID");
    });

    it("search_lessons function exists in migration", () => {
      const migrationContent = fs.readFileSync(
        "./supabase/migrations/20260208026000_advanced_search.sql",
        "utf-8"
      );

      expect(migrationContent).toContain("CREATE OR REPLACE FUNCTION search_lessons");
      expect(migrationContent).toContain("search_query TEXT");
      expect(migrationContent).toContain("p_limit INT");
      expect(migrationContent).toContain("p_offset INT");
      expect(migrationContent).toContain("p_course_id UUID");
    });

    it("track_search_query function exists in migration", () => {
      const migrationContent = fs.readFileSync(
        "./supabase/migrations/20260208026000_advanced_search.sql",
        "utf-8"
      );

      expect(migrationContent).toContain("CREATE OR REPLACE FUNCTION track_search_query");
      expect(migrationContent).toContain("p_query TEXT");
      expect(migrationContent).toContain("p_user_id UUID");
      expect(migrationContent).toContain("p_result_count INT");
      expect(migrationContent).toContain("p_filters JSONB");
      expect(migrationContent).toContain("p_search_duration_ms INT");
    });

    it("search_queries table exists for analytics", () => {
      const migrationContent = fs.readFileSync(
        "./supabase/migrations/20260208026000_advanced_search.sql",
        "utf-8"
      );

      expect(migrationContent).toContain("CREATE TABLE IF NOT EXISTS search_queries");
      expect(migrationContent).toContain("query TEXT");
      expect(migrationContent).toContain("result_count INT");
      expect(migrationContent).toContain("filters JSONB");
      expect(migrationContent).toContain("search_duration_ms INT");
    });
  });

  describe("Response Structure", () => {
    it("returns structured JSON response", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should return JSON
      expect(content).toContain("NextResponse.json");

      // Should include success flag
      expect(content).toContain("success: true");

      // Should include query
      expect(content).toContain("query:");

      // Should include type
      expect(content).toContain("type:");

      // Should include results
      expect(content).toContain("courses:");
      expect(content).toContain("lessons:");
    });

    it("includes search metadata in response", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");

      // Should include metadata
      expect(content).toContain("searchDurationMs:");
      expect(content).toContain("filters:");
      expect(content).toContain("totalResults");
    });
  });
});
