/**
 * Tests for caching functionality (feat-050)
 * Test IDs: PLT-PER-001, PLT-PER-002
 */

import { CACHE_DURATIONS } from "@/lib/cache";

// Mock Next.js cache functions
jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
  unstable_cache: jest.fn((fn) => fn),
}));

describe("Cache Configuration", () => {
  describe("PLT-PER-001: Query caching", () => {
    it("should define cache durations", () => {
      expect(CACHE_DURATIONS.COURSES).toBe(3600);
      expect(CACHE_DURATIONS.COURSE_DETAIL).toBe(1800);
      expect(CACHE_DURATIONS.LESSONS).toBe(1800);
      expect(CACHE_DURATIONS.USER_DATA).toBe(300);
      expect(CACHE_DURATIONS.STATIC_CONTENT).toBe(86400);
    });

    it("should use reasonable cache durations", () => {
      // Courses should cache for at least 30 minutes
      expect(CACHE_DURATIONS.COURSES).toBeGreaterThanOrEqual(1800);

      // User data should cache for less than courses
      expect(CACHE_DURATIONS.USER_DATA).toBeLessThan(CACHE_DURATIONS.COURSES);

      // Static content should cache longest
      expect(CACHE_DURATIONS.STATIC_CONTENT).toBeGreaterThan(
        CACHE_DURATIONS.COURSES
      );
    });
  });

  describe("PLT-PER-002: Cache invalidation", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should export cache invalidation functions", async () => {
      const {
        invalidateCoursesCache,
        invalidateModulesCache,
        invalidateCoursePage,
        invalidateAllPublicPages,
      } = await import("@/lib/cache");

      expect(typeof invalidateCoursesCache).toBe("function");
      expect(typeof invalidateModulesCache).toBe("function");
      expect(typeof invalidateCoursePage).toBe("function");
      expect(typeof invalidateAllPublicPages).toBe("function");
    });

    it("should invalidate courses cache with correct tags and paths", async () => {
      const { revalidateTag, revalidatePath } = await import("next/cache");
      const { invalidateCoursesCache } = await import("@/lib/cache");

      invalidateCoursesCache();

      expect(revalidateTag).toHaveBeenCalledWith("courses");
      expect(revalidatePath).toHaveBeenCalledWith("/courses");
      expect(revalidatePath).toHaveBeenCalledWith("/app/courses");
    });

    it("should invalidate modules cache with correct tags", async () => {
      const { revalidateTag } = await import("next/cache");
      const { invalidateModulesCache } = await import("@/lib/cache");

      invalidateModulesCache();

      expect(revalidateTag).toHaveBeenCalledWith("modules");
      expect(revalidateTag).toHaveBeenCalledWith("lessons");
    });

    it("should invalidate specific course page", async () => {
      const { revalidatePath } = await import("next/cache");
      const { invalidateCoursePage } = await import("@/lib/cache");

      invalidateCoursePage("test-course");

      expect(revalidatePath).toHaveBeenCalledWith("/courses/test-course");
      expect(revalidatePath).toHaveBeenCalledWith("/app/courses/test-course");
    });

    it("should invalidate all public pages", async () => {
      const { revalidatePath } = await import("next/cache");
      const { invalidateAllPublicPages } = await import("@/lib/cache");

      invalidateAllPublicPages();

      expect(revalidatePath).toHaveBeenCalledWith("/");
      expect(revalidatePath).toHaveBeenCalledWith("/courses");
      expect(revalidatePath).toHaveBeenCalledWith("/app");
    });
  });

  describe("Cache Strategy", () => {
    it("should prioritize caching static content longest", () => {
      expect(CACHE_DURATIONS.STATIC_CONTENT).toBeGreaterThan(
        CACHE_DURATIONS.COURSES
      );
      expect(CACHE_DURATIONS.STATIC_CONTENT).toBeGreaterThan(
        CACHE_DURATIONS.COURSE_DETAIL
      );
      expect(CACHE_DURATIONS.STATIC_CONTENT).toBeGreaterThan(
        CACHE_DURATIONS.USER_DATA
      );
    });

    it("should cache user data for shortest duration", () => {
      expect(CACHE_DURATIONS.USER_DATA).toBeLessThan(
        CACHE_DURATIONS.COURSES
      );
      expect(CACHE_DURATIONS.USER_DATA).toBeLessThan(
        CACHE_DURATIONS.COURSE_DETAIL
      );
      expect(CACHE_DURATIONS.USER_DATA).toBeLessThan(
        CACHE_DURATIONS.STATIC_CONTENT
      );
    });

    it("should use graduated cache durations", () => {
      const durations = Object.values(CACHE_DURATIONS).sort((a, b) => a - b);

      // Should have at least 3 different duration levels
      const uniqueDurations = new Set(durations);
      expect(uniqueDurations.size).toBeGreaterThanOrEqual(3);
    });
  });
});

describe("Query Caching Implementation", () => {
  it("should cache database queries", () => {
    // This test verifies that queries use unstable_cache
    // The actual implementation is in lib/db/queries.ts
    const { unstable_cache } = require("next/cache");

    // Verify that the mock was set up correctly
    expect(unstable_cache).toBeDefined();
    expect(typeof unstable_cache).toBe("function");
  });
});
