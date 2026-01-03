import { render, screen } from "@testing-library/react";
import CourseProgressBar from "@/components/progress/CourseProgressBar";

describe("CourseProgressBar", () => {
  it("renders 0% when no lessons completed", () => {
    render(<CourseProgressBar lessonsCompleted={0} totalLessons={10} />);

    expect(screen.getByText("0 of 10 lessons")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("renders correct percentage", () => {
    render(<CourseProgressBar lessonsCompleted={5} totalLessons={10} />);

    expect(screen.getByText("5 of 10 lessons")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("renders 100% when all lessons completed", () => {
    render(<CourseProgressBar lessonsCompleted={10} totalLessons={10} />);

    expect(screen.getByText("10 of 10 lessons")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("handles zero total lessons gracefully", () => {
    render(<CourseProgressBar lessonsCompleted={0} totalLessons={0} />);

    expect(screen.getByText("0 of 0 lessons")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <CourseProgressBar
        lessonsCompleted={3}
        totalLessons={10}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });
});
