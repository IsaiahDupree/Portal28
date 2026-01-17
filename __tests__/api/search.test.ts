// __tests__/api/search.test.ts
// Test suite for Search API
// Test IDs: PLT-SRC-001 through PLT-SRC-004
//
// This test suite verifies the search API endpoints including:
// - GET /api/search - Full-text search across content

import { describe, it, expect } from "@jest/globals";
import fs from "fs";

describe("Search API - feat-045", () => {
  describe("Search API Route Exists", () => {
    it("GET /api/search route exists", () => {
      const routePath = "./app/api/search/route.ts";
      expect(fs.existsSync(routePath)).toBe(true);

      const content = fs.readFileSync(routePath, "utf-8");
      expect(content).toContain("export async function GET");
    });

    it("Search API imports required dependencies", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");
      expect(content).toContain("import { z } from");
      expect(content).toContain("NextRequest");
      expect(content).toContain("NextResponse");
      expect(content).toContain("createClient");
    });
  });

  describe("Search API Implementation", () => {
    it("validates search query with Zod", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");
      expect(content).toContain("searchSchema");
      expect(content).toContain("z.string()");
      expect(content).toContain("min(1");
      expect(content).toContain("max(200");
    });

    it("handles query parameter parsing", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");
      expect(content).toContain("searchParams.get");
      expect(content).toContain("'q'");
    });

    it("supports limit parameter", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");
      expect(content).toContain("limit");
    });

    it("calls search_content RPC function", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");
      expect(content).toContain("supabase.rpc");
      expect(content).toContain("search_content");
      expect(content).toContain("search_query");
      expect(content).toContain("result_limit");
    });

    it("returns proper error for validation failures", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");
      expect(content).toContain("safeParse");
      expect(content).toContain("validation.success");
      expect(content).toContain("status: 400");
    });

    it("handles database errors", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");
      expect(content).toContain("if (error)");
      expect(content).toContain("status: 500");
    });

    it("transforms results with type labels", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");
      expect(content).toContain("typeLabel");
      expect(content).toContain("getTypeLabel");
    });

    it("defines type label mappings", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");
      expect(content).toContain("course");
      expect(content).toContain("lesson");
      expect(content).toContain("forum_thread");
      expect(content).toContain("forum_post");
      expect(content).toContain("announcement");
      expect(content).toContain("resource");
    });

    it("returns structured JSON response", () => {
      const content = fs.readFileSync("./app/api/search/route.ts", "utf-8");
      expect(content).toContain("NextResponse.json");
      expect(content).toContain("query");
      expect(content).toContain("count");
      expect(content).toContain("results");
    });
  });

  describe("Database Migration", () => {
    it("search indexes migration exists", () => {
      const migrationPath = "./supabase/migrations/20260115060000_search_indexes.sql";
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    it("creates search vectors for courses", () => {
      const content = fs.readFileSync(
        "./supabase/migrations/20260115060000_search_indexes.sql",
        "utf-8"
      );
      expect(content).toContain("courses ADD COLUMN");
      expect(content).toContain("search_vector tsvector");
      expect(content).toContain("to_tsvector");
    });

    it("creates search vectors for lessons", () => {
      const content = fs.readFileSync(
        "./supabase/migrations/20260115060000_search_indexes.sql",
        "utf-8"
      );
      expect(content).toContain("lessons ADD COLUMN");
      expect(content).toContain("search_vector");
    });

    it("creates search vectors for forum content", () => {
      const content = fs.readFileSync(
        "./supabase/migrations/20260115060000_search_indexes.sql",
        "utf-8"
      );
      expect(content).toContain("forum_threads ADD COLUMN");
      expect(content).toContain("forum_posts ADD COLUMN");
    });

    it("creates search vectors for announcements", () => {
      const content = fs.readFileSync(
        "./supabase/migrations/20260115060000_search_indexes.sql",
        "utf-8"
      );
      expect(content).toContain("announcements ADD COLUMN");
    });

    it("creates search vectors for resources", () => {
      const content = fs.readFileSync(
        "./supabase/migrations/20260115060000_search_indexes.sql",
        "utf-8"
      );
      expect(content).toContain("resource_items ADD COLUMN");
    });

    it("creates GIN indexes for performance", () => {
      const content = fs.readFileSync(
        "./supabase/migrations/20260115060000_search_indexes.sql",
        "utf-8"
      );
      expect(content).toContain("CREATE INDEX");
      expect(content).toContain("USING gin");
      expect(content).toContain("idx_courses_search");
      expect(content).toContain("idx_lessons_search");
    });

    it("creates search_content function", () => {
      const content = fs.readFileSync(
        "./supabase/migrations/20260115060000_search_indexes.sql",
        "utf-8"
      );
      expect(content).toContain("CREATE OR REPLACE FUNCTION search_content");
      expect(content).toContain("search_query text");
      expect(content).toContain("result_limit int");
      expect(content).toContain("RETURNS TABLE");
    });

    it("search function returns proper structure", () => {
      const content = fs.readFileSync(
        "./supabase/migrations/20260115060000_search_indexes.sql",
        "utf-8"
      );
      expect(content).toContain("id uuid");
      expect(content).toContain("type text");
      expect(content).toContain("title text");
      expect(content).toContain("excerpt text");
      expect(content).toContain("url text");
      expect(content).toContain("rank real");
    });

    it("search function uses tsquery", () => {
      const content = fs.readFileSync(
        "./supabase/migrations/20260115060000_search_indexes.sql",
        "utf-8"
      );
      expect(content).toContain("tsquery");
      expect(content).toContain("plainto_tsquery");
    });

    it("search function filters by visibility", () => {
      const content = fs.readFileSync(
        "./supabase/migrations/20260115060000_search_indexes.sql",
        "utf-8"
      );
      expect(content).toContain("status = 'published'");
      expect(content).toContain("is_hidden = false");
      expect(content).toContain("is_published = true");
      expect(content).toContain("is_active = true");
    });

    it("grants execute permissions on search function", () => {
      const content = fs.readFileSync(
        "./supabase/migrations/20260115060000_search_indexes.sql",
        "utf-8"
      );
      expect(content).toContain("GRANT EXECUTE");
      expect(content).toContain("search_content");
      expect(content).toContain("authenticated");
      expect(content).toContain("anon");
    });
  });

  describe("Search UI Component", () => {
    it("SearchDialog component exists", () => {
      const componentPath = "./components/search/SearchDialog.tsx";
      expect(fs.existsSync(componentPath)).toBe(true);
    });

    it("SearchDialog uses Dialog component", () => {
      const content = fs.readFileSync("./components/search/SearchDialog.tsx", "utf-8");
      expect(content).toContain("Dialog");
      expect(content).toContain("DialogContent");
      expect(content).toContain("DialogTitle");
    });

    it("SearchDialog has search input", () => {
      const content = fs.readFileSync("./components/search/SearchDialog.tsx", "utf-8");
      expect(content).toContain("Input");
      expect(content).toContain('type="text"');
      expect(content).toContain("placeholder");
    });

    it("SearchDialog handles keyboard shortcuts", () => {
      const content = fs.readFileSync("./components/search/SearchDialog.tsx", "utf-8");
      expect(content).toContain("useEffect");
      expect(content).toContain("keydown");
      // Checks for keyboard shortcut handling (metaKey or ctrlKey)
      expect(content.includes("metaKey") || content.includes("Meta")).toBe(true);
    });

    it("SearchDialog fetches search results", () => {
      const content = fs.readFileSync("./components/search/SearchDialog.tsx", "utf-8");
      expect(content).toContain("fetch");
      expect(content).toContain("/api/search");
    });

    it("SearchDialog shows loading state", () => {
      const content = fs.readFileSync("./components/search/SearchDialog.tsx", "utf-8");
      expect(content).toContain("isLoading");
      expect(content).toContain("Loader");
    });

    it("SearchDialog displays results", () => {
      const content = fs.readFileSync("./components/search/SearchDialog.tsx", "utf-8");
      expect(content).toContain("results.map");
      expect(content).toContain("result.title");
      expect(content).toContain("result.url");
    });

    it("SearchDialog handles empty results", () => {
      const content = fs.readFileSync("./components/search/SearchDialog.tsx", "utf-8");
      expect(content).toContain("No results");
    });
  });

  describe("Header Integration", () => {
    it("Header imports SearchDialog", () => {
      const content = fs.readFileSync("./components/layout/header.tsx", "utf-8");
      expect(content).toContain("SearchDialog");
    });

    it("Header renders SearchDialog", () => {
      const content = fs.readFileSync("./components/layout/header.tsx", "utf-8");
      expect(content).toContain("<SearchDialog");
      expect(content).toContain("searchOpen");
      expect(content).toContain("setSearchOpen");
    });

    it("Header search input opens dialog", () => {
      const content = fs.readFileSync("./components/layout/header.tsx", "utf-8");
      expect(content).toContain("onClick");
      expect(content).toContain("setSearchOpen(true)");
    });
  });
});
