import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  maybeSingle: jest.fn(),
};

jest.mock("@/lib/supabase/server", () => ({
  supabaseServer: () => mockSupabase,
}));

describe("hasAccess", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("userHasCourseAccess", () => {
    it("should return true when user has active entitlement", async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: { id: "ent-1", status: "active" },
        error: null,
      });

      const { userHasCourseAccess } = await import("@/lib/entitlements/hasAccess");
      const result = await userHasCourseAccess("user-123", "course-456");

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("entitlements");
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");
      expect(mockSupabase.eq).toHaveBeenCalledWith("course_id", "course-456");
      expect(mockSupabase.eq).toHaveBeenCalledWith("status", "active");
    });

    it("should return false when no entitlement exists", async () => {
      mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

      const { userHasCourseAccess } = await import("@/lib/entitlements/hasAccess");
      const result = await userHasCourseAccess("user-123", "course-456");

      expect(result).toBe(false);
    });

    it("should return false on error", async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const { userHasCourseAccess } = await import("@/lib/entitlements/hasAccess");
      const result = await userHasCourseAccess("user-123", "course-456");

      expect(result).toBe(false);
    });
  });
});
