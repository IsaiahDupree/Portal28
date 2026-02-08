/**
 * Tests for ComparisonTemplate component (VID-CMP-001, VID-CMP-002, VID-CMP-003)
 *
 * Test Coverage:
 * - VID-CMP-001: Split screen layout
 * - VID-CMP-002: Pros and cons display
 * - VID-CMP-003: Winner indication and duration validation
 */

import { render, screen } from "@testing-library/react";
import { ComparisonTemplate, createComparison } from "@/components/video/ComparisonTemplate";

describe("ComparisonTemplate Component", () => {
  const mockOptionA = {
    title: "React",
    description: "A JavaScript library for building user interfaces",
    pros: ["Virtual DOM", "Large ecosystem", "Great performance"],
    cons: ["Steep learning curve", "JSX syntax"]
  };

  const mockOptionB = {
    title: "Vue",
    description: "The Progressive JavaScript Framework",
    pros: ["Easy to learn", "Great documentation", "Flexible"],
    cons: ["Smaller ecosystem", "Less job opportunities"]
  };

  describe("VID-CMP-001: Basic Rendering", () => {
    it("renders comparison template with title", () => {
      render(
        <ComparisonTemplate
          title="React vs Vue"
          optionA={mockOptionA}
          optionB={mockOptionB}
        />
      );

      expect(screen.getAllByText(/React vs Vue/).length).toBeGreaterThan(0);
    });

    it("renders both options in comparison view", () => {
      render(
        <ComparisonTemplate
          title="Test Comparison"
          optionA={mockOptionA}
          optionB={mockOptionB}
        />
      );

      expect(screen.getByText("React")).toBeInTheDocument();
      expect(screen.getByText("Vue")).toBeInTheDocument();
    });

    it("displays option descriptions", () => {
      render(
        <ComparisonTemplate
          title="Test"
          optionA={mockOptionA}
          optionB={mockOptionB}
        />
      );

      expect(screen.getByText("A JavaScript library for building user interfaces")).toBeInTheDocument();
      expect(screen.getByText("The Progressive JavaScript Framework")).toBeInTheDocument();
    });

    it("shows 16:9 aspect ratio badge", () => {
      render(
        <ComparisonTemplate
          title="Test"
          optionA={mockOptionA}
          optionB={mockOptionB}
        />
      );

      expect(screen.getByText("16:9")).toBeInTheDocument();
    });
  });

  describe("VID-CMP-002: Pros and Cons Display", () => {
    it("displays pros for option A", () => {
      render(
        <ComparisonTemplate
          title="Test"
          optionA={mockOptionA}
          optionB={mockOptionB}
        />
      );

      expect(screen.getByText("Virtual DOM")).toBeInTheDocument();
      expect(screen.getByText("Large ecosystem")).toBeInTheDocument();
      expect(screen.getByText("Great performance")).toBeInTheDocument();
    });

    it("displays cons for option A", () => {
      render(
        <ComparisonTemplate
          title="Test"
          optionA={mockOptionA}
          optionB={mockOptionB}
        />
      );

      expect(screen.getByText("Steep learning curve")).toBeInTheDocument();
      expect(screen.getByText("JSX syntax")).toBeInTheDocument();
    });

    it("displays pros and cons for option B", () => {
      render(
        <ComparisonTemplate
          title="Test"
          optionA={mockOptionA}
          optionB={mockOptionB}
        />
      );

      expect(screen.getByText("Easy to learn")).toBeInTheDocument();
      expect(screen.getByText("Smaller ecosystem")).toBeInTheDocument();
    });
  });

  describe("VID-CMP-003: Winner Indication", () => {
    it("displays winner when option A wins", () => {
      render(
        <ComparisonTemplate
          title="Test"
          optionA={mockOptionA}
          optionB={mockOptionB}
          winner="A"
        />
      );

      expect(screen.getByText(/Winner: React/)).toBeInTheDocument();
    });

    it("displays winner when option B wins", () => {
      render(
        <ComparisonTemplate
          title="Test"
          optionA={mockOptionA}
          optionB={mockOptionB}
          winner="B"
        />
      );

      expect(screen.getByText(/Winner: Vue/)).toBeInTheDocument();
    });

    it("displays tie message", () => {
      render(
        <ComparisonTemplate
          title="Test"
          optionA={mockOptionA}
          optionB={mockOptionB}
          winner="tie"
        />
      );

      expect(screen.getByText("It's a Tie!")).toBeInTheDocument();
    });

    it("displays recommendation when provided", () => {
      render(
        <ComparisonTemplate
          title="Test"
          optionA={mockOptionA}
          optionB={mockOptionB}
          winner="A"
          recommendation={<p>Use React for large-scale applications</p>}
        />
      );

      expect(screen.getByText("Use React for large-scale applications")).toBeInTheDocument();
    });

    it("shows trophy icon for winner", () => {
      const { container } = render(
        <ComparisonTemplate
          title="Test"
          optionA={mockOptionA}
          optionB={mockOptionB}
          winner="A"
        />
      );

      const trophyIcon = container.querySelector('.lucide-trophy');
      expect(trophyIcon).toBeInTheDocument();
    });

    it("does not show winner section when no winner specified", () => {
      render(
        <ComparisonTemplate
          title="Test"
          optionA={mockOptionA}
          optionB={mockOptionB}
        />
      );

      expect(screen.queryByText(/Winner:/)).not.toBeInTheDocument();
      expect(screen.queryByText("It's a Tie!")).not.toBeInTheDocument();
    });
  });

  describe("Duration Validation", () => {
    it("accepts default duration of 90s", () => {
      render(
        <ComparisonTemplate
          title="Test"
          optionA={mockOptionA}
          optionB={mockOptionB}
        />
      );

      expect(screen.getByText("1:30")).toBeInTheDocument();
    });

    it("validates duration within 60-120s range", () => {
      render(
        <ComparisonTemplate
          title="Test"
          optionA={mockOptionA}
          optionB={mockOptionB}
          duration={90}
        />
      );

      // Should not show warning
      expect(screen.queryByText(/Warning:/)).not.toBeInTheDocument();
    });

    it("shows warning for duration below 60s", () => {
      render(
        <ComparisonTemplate
          title="Test"
          optionA={mockOptionA}
          optionB={mockOptionB}
          duration={45}
        />
      );

      expect(screen.getByText(/Warning:/)).toBeInTheDocument();
      expect(screen.getByText(/between 60-120 seconds/)).toBeInTheDocument();
    });

    it("shows warning for duration above 120s", () => {
      render(
        <ComparisonTemplate
          title="Test"
          optionA={mockOptionA}
          optionB={mockOptionB}
          duration={150}
        />
      );

      expect(screen.getByText(/Warning:/)).toBeInTheDocument();
    });

    it("displays duration in correct format", () => {
      render(
        <ComparisonTemplate
          title="Test"
          optionA={mockOptionA}
          optionB={mockOptionB}
          duration={75}
        />
      );

      expect(screen.getByText("1:15")).toBeInTheDocument();
    });
  });

  describe("createComparison Helper Function", () => {
    it("creates properly structured comparison", () => {
      const comparison = createComparison({
        title: "Test Comparison",
        optionA: mockOptionA,
        optionB: mockOptionB,
        winner: "A"
      });

      expect(comparison.title).toBe("Test Comparison");
      expect(comparison.optionA).toEqual(mockOptionA);
      expect(comparison.optionB).toEqual(mockOptionB);
      expect(comparison.winner).toBe("A");
      expect(comparison.duration).toBe(90); // default
    });

    it("accepts custom duration", () => {
      const comparison = createComparison({
        title: "Test",
        optionA: mockOptionA,
        optionB: mockOptionB,
        duration: 100
      });

      expect(comparison.duration).toBe(100);
    });

    it("includes recommendation when provided", () => {
      const recommendation = <p>Test recommendation</p>;
      const comparison = createComparison({
        title: "Test",
        optionA: mockOptionA,
        optionB: mockOptionB,
        recommendation
      });

      expect(comparison.recommendation).toBe(recommendation);
    });
  });

  describe("Custom Styling", () => {
    it("applies custom className", () => {
      const { container } = render(
        <ComparisonTemplate
          title="Test"
          optionA={mockOptionA}
          optionB={mockOptionB}
          className="custom-comparison"
        />
      );

      const comparison = container.querySelector('.custom-comparison');
      expect(comparison).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles options with empty pros", () => {
      const optionWithNoPros = { ...mockOptionA, pros: [] };

      render(
        <ComparisonTemplate
          title="Test"
          optionA={optionWithNoPros}
          optionB={mockOptionB}
        />
      );

      expect(screen.getByText("React")).toBeInTheDocument();
    });

    it("handles options with empty cons", () => {
      const optionWithNoCons = { ...mockOptionA, cons: [] };

      render(
        <ComparisonTemplate
          title="Test"
          optionA={optionWithNoCons}
          optionB={mockOptionB}
        />
      );

      expect(screen.getByText("React")).toBeInTheDocument();
    });

    it("handles options without descriptions", () => {
      const optionNoDesc = { ...mockOptionA, description: undefined };

      render(
        <ComparisonTemplate
          title="Test"
          optionA={optionNoDesc}
          optionB={mockOptionB}
        />
      );

      expect(screen.getByText("React")).toBeInTheDocument();
    });
  });
});
