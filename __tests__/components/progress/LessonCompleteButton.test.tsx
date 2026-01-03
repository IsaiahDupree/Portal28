import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LessonCompleteButton from "@/components/progress/LessonCompleteButton";

// Mock fetch
global.fetch = jest.fn();

describe("LessonCompleteButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
  });

  it("renders Mark Complete button when not completed", () => {
    render(
      <LessonCompleteButton
        lessonId="lesson-123"
        courseId="course-456"
        isCompleted={false}
      />
    );

    expect(screen.getByText("Mark Complete")).toBeInTheDocument();
  });

  it("renders Completed state when already completed", () => {
    render(
      <LessonCompleteButton
        lessonId="lesson-123"
        courseId="course-456"
        isCompleted={true}
      />
    );

    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("calls API and updates state on click", async () => {
    render(
      <LessonCompleteButton
        lessonId="lesson-123"
        courseId="course-456"
        isCompleted={false}
      />
    );

    const button = screen.getByText("Mark Complete");
    fireEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/progress/lesson",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });
  });

  it("shows loading state while saving", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <LessonCompleteButton
        lessonId="lesson-123"
        courseId="course-456"
        isCompleted={false}
      />
    );

    const button = screen.getByText("Mark Complete");
    fireEvent.click(button);

    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });
});
