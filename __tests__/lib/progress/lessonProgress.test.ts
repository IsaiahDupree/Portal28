import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock Supabase server
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  upsert: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  maybeSingle: jest.fn(),
  single: jest.fn(),
};

jest.mock("@/lib/supabase/server", () => ({
  supabaseServer: () => mockSupabase,
}));

describe("Lesson Progress", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getLessonProgress", () => {
    it("should return null when no progress exists", async () => {
      mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

      const { getLessonProgress } = await import("@/lib/progress/lessonProgress");
      const result = await getLessonProgress("user-123", "lesson-456");

      expect(result).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith("lesson_progress");
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");
      expect(mockSupabase.eq).toHaveBeenCalledWith("lesson_id", "lesson-456");
    });

    it("should return progress when it exists", async () => {
      const mockProgress = {
        id: "progress-1",
        user_id: "user-123",
        lesson_id: "lesson-456",
        course_id: "course-789",
        status: "completed",
        progress_percent: 100,
      };
      mockSupabase.maybeSingle.mockResolvedValue({ data: mockProgress, error: null });

      const { getLessonProgress } = await import("@/lib/progress/lessonProgress");
      const result = await getLessonProgress("user-123", "lesson-456");

      expect(result).toEqual(mockProgress);
    });
  });

  describe("updateLessonProgress", () => {
    it("should upsert progress with correct values", async () => {
      const mockProgress = {
        id: "progress-1",
        user_id: "user-123",
        lesson_id: "lesson-456",
        course_id: "course-789",
        status: "in_progress",
        progress_percent: 50,
      };
      mockSupabase.single.mockResolvedValue({ data: mockProgress, error: null });

      const { updateLessonProgress } = await import("@/lib/progress/lessonProgress");
      const result = await updateLessonProgress("user-123", "lesson-456", "course-789", {
        status: "in_progress",
        progress_percent: 50,
      });

      expect(result).toEqual(mockProgress);
      expect(mockSupabase.upsert).toHaveBeenCalled();
    });

    it("should set completed_at when status is completed", async () => {
      mockSupabase.single.mockResolvedValue({
        data: { status: "completed", progress_percent: 100 },
        error: null,
      });

      const { markLessonComplete } = await import("@/lib/progress/lessonProgress");
      await markLessonComplete("user-123", "lesson-456", "course-789");

      expect(mockSupabase.upsert).toHaveBeenCalled();
    });
  });
});
