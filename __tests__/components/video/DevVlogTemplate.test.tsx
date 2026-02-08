/**
 * Tests for DevVlogTemplate component (VID-DVL-001, VID-DVL-002, VID-DVL-003, VID-DVL-004)
 *
 * Test Coverage:
 * - VID-DVL-001: Dev vlog structure with proper timing
 * - VID-DVL-002: 60-180s total duration validation
 * - VID-DVL-003: 9:16 or 16:9 aspect ratio support
 * - VID-DVL-004: All required sections present
 */

import { render, screen } from "@testing-library/react";
import { DevVlogTemplate, createDevVlog } from "@/components/video/DevVlogTemplate";

describe("DevVlogTemplate Component", () => {
  const validSections = [
    {
      type: "hook" as const,
      duration: 5,
      content: <p>I just built an amazing feature!</p>
    },
    {
      type: "context" as const,
      duration: 12,
      content: <p>The problem was slow API responses</p>
    },
    {
      type: "code-walk" as const,
      duration: 45,
      content: <p>Here's how I optimized the queries</p>
    },
    {
      type: "insight" as const,
      duration: 10,
      content: <p>The key was using database indexing</p>
    },
    {
      type: "result-cta" as const,
      duration: 18,
      content: <p>API response time improved by 80%. Link in bio!</p>
    }
  ];

  describe("VID-DVL-001: Basic Rendering", () => {
    it("renders dev vlog with title", () => {
      render(<DevVlogTemplate title="My Dev Vlog" sections={validSections} />);

      expect(screen.getByText("My Dev Vlog")).toBeInTheDocument();
    });

    it("renders all section types", () => {
      render(<DevVlogTemplate title="Test" sections={validSections} />);

      expect(screen.getByText("Hook")).toBeInTheDocument();
      expect(screen.getByText("Context")).toBeInTheDocument();
      expect(screen.getByText("Code Walk")).toBeInTheDocument();
      expect(screen.getByText("Key Insight")).toBeInTheDocument();
      expect(screen.getByText("Result & CTA")).toBeInTheDocument();
    });

    it("displays section content", () => {
      render(<DevVlogTemplate title="Test" sections={validSections} />);

      expect(screen.getByText("I just built an amazing feature!")).toBeInTheDocument();
      expect(screen.getByText("The problem was slow API responses")).toBeInTheDocument();
    });

    it("shows section count", () => {
      render(<DevVlogTemplate title="Test" sections={validSections} />);

      expect(screen.getByText(/5 sections/)).toBeInTheDocument();
    });
  });

  describe("VID-DVL-002: Duration Validation", () => {
    it("calculates total duration correctly", () => {
      render(<DevVlogTemplate title="Test" sections={validSections} />);

      // Total: 5 + 12 + 45 + 10 + 18 = 90s = 1:30
      expect(screen.getByText("1:30")).toBeInTheDocument();
    });

    it("shows valid duration badge for 60-180s range", () => {
      const { container } = render(
        <DevVlogTemplate title="Test" sections={validSections} />
      );

      // Should not show warning
      expect(screen.queryByText(/Warning:/)).not.toBeInTheDocument();
    });

    it("shows warning for duration below 60s", () => {
      const shortSections = [
        { type: "hook" as const, duration: 5, content: <p>Hook</p> },
        { type: "context" as const, duration: 10, content: <p>Context</p> },
        { type: "code-walk" as const, duration: 20, content: <p>Code</p> },
        { type: "insight" as const, duration: 10, content: <p>Insight</p> },
        { type: "result-cta" as const, duration: 10, content: <p>CTA</p> }
      ];

      render(<DevVlogTemplate title="Test" sections={shortSections} />);

      expect(screen.getByText(/Warning:/)).toBeInTheDocument();
      expect(screen.getByText(/between 60-180 seconds/)).toBeInTheDocument();
    });

    it("shows warning for duration above 180s", () => {
      const longSections = [
        { type: "hook" as const, duration: 5, content: <p>Hook</p> },
        { type: "context" as const, duration: 15, content: <p>Context</p> },
        { type: "code-walk" as const, duration: 150, content: <p>Code</p> },
        { type: "insight" as const, duration: 10, content: <p>Insight</p> },
        { type: "result-cta" as const, duration: 20, content: <p>CTA</p> }
      ];

      render(<DevVlogTemplate title="Test" sections={longSections} />);

      expect(screen.getByText(/Warning:/)).toBeInTheDocument();
    });

    it("displays individual section durations", () => {
      render(<DevVlogTemplate title="Test" sections={validSections} />);

      expect(screen.getByText("5s")).toBeInTheDocument();
      expect(screen.getByText("12s")).toBeInTheDocument();
      expect(screen.getByText("45s")).toBeInTheDocument();
    });
  });

  describe("VID-DVL-003: Aspect Ratio Support", () => {
    it("defaults to 16:9 aspect ratio", () => {
      const { container } = render(
        <DevVlogTemplate title="Test" sections={validSections} />
      );

      expect(screen.getByText("16:9")).toBeInTheDocument();
      const videoContainer = container.querySelector('.aspect-video');
      expect(videoContainer).toBeInTheDocument();
    });

    it("supports 9:16 aspect ratio (vertical)", () => {
      const { container } = render(
        <DevVlogTemplate title="Test" sections={validSections} aspectRatio="9:16" />
      );

      expect(screen.getByText("9:16")).toBeInTheDocument();
      const videoContainer = container.querySelector('.aspect-\\[9\\/16\\]');
      expect(videoContainer).toBeInTheDocument();
    });

    it("supports 16:9 aspect ratio (horizontal)", () => {
      render(
        <DevVlogTemplate title="Test" sections={validSections} aspectRatio="16:9" />
      );

      expect(screen.getByText("16:9")).toBeInTheDocument();
    });
  });

  describe("VID-DVL-004: Section Timing and Timeline", () => {
    it("shows recommended duration for each section type", () => {
      render(<DevVlogTemplate title="Test" sections={validSections} />);

      expect(screen.getByText(/Recommended: 3-5s/)).toBeInTheDocument(); // Hook
      expect(screen.getAllByText(/Recommended: 10-15s/).length).toBeGreaterThan(0); // Context & Insight
      expect(screen.getByText(/Recommended: 30-60s/)).toBeInTheDocument(); // Code Walk
      expect(screen.getByText(/Recommended: 15-20s/)).toBeInTheDocument(); // Result & CTA
    });

    it("calculates correct timestamps for each section", () => {
      render(<DevVlogTemplate title="Test" sections={validSections} />);

      // Hook: 0s - 5s
      expect(screen.getByText(/0s - 5s/)).toBeInTheDocument();
      // Context: 5s - 17s
      expect(screen.getByText(/5s - 17s/)).toBeInTheDocument();
      // Code Walk: 17s - 1:02
      expect(screen.getByText(/17s - 1:02/)).toBeInTheDocument();
    });
  });

  describe("createDevVlog Helper Function", () => {
    it("creates properly structured dev vlog", () => {
      const vlog = createDevVlog({
        title: "Test Vlog",
        hook: { duration: 4, content: <p>Hook content</p> },
        context: { duration: 10, content: <p>Context content</p> },
        codeWalk: { duration: 40, content: <p>Code content</p> },
        insight: { duration: 12, content: <p>Insight content</p> },
        resultCta: { duration: 15, content: <p>CTA content</p> }
      });

      expect(vlog.title).toBe("Test Vlog");
      expect(vlog.sections).toHaveLength(5);
      expect(vlog.sections[0].type).toBe("hook");
      expect(vlog.sections[1].type).toBe("context");
      expect(vlog.sections[2].type).toBe("code-walk");
      expect(vlog.sections[3].type).toBe("insight");
      expect(vlog.sections[4].type).toBe("result-cta");
    });

    it("defaults to 16:9 aspect ratio", () => {
      const vlog = createDevVlog({
        title: "Test",
        hook: { duration: 4, content: <p>Hook</p> },
        context: { duration: 10, content: <p>Context</p> },
        codeWalk: { duration: 40, content: <p>Code</p> },
        insight: { duration: 12, content: <p>Insight</p> },
        resultCta: { duration: 15, content: <p>CTA</p> }
      });

      expect(vlog.aspectRatio).toBe("16:9");
    });

    it("accepts custom aspect ratio", () => {
      const vlog = createDevVlog({
        title: "Test",
        aspectRatio: "9:16",
        hook: { duration: 4, content: <p>Hook</p> },
        context: { duration: 10, content: <p>Context</p> },
        codeWalk: { duration: 40, content: <p>Code</p> },
        insight: { duration: 12, content: <p>Insight</p> },
        resultCta: { duration: 15, content: <p>CTA</p> }
      });

      expect(vlog.aspectRatio).toBe("9:16");
    });
  });

  describe("Custom Styling", () => {
    it("applies custom className", () => {
      const { container } = render(
        <DevVlogTemplate title="Test" sections={validSections} className="custom-vlog" />
      );

      const vlog = container.querySelector('.custom-vlog');
      expect(vlog).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty sections array", () => {
      render(<DevVlogTemplate title="Empty" sections={[]} />);

      expect(screen.getByText("Empty")).toBeInTheDocument();
      expect(screen.getByText(/0 sections/)).toBeInTheDocument();
    });

    it("handles single section", () => {
      const singleSection = [
        { type: "hook" as const, duration: 5, content: <p>Only hook</p> }
      ];

      render(<DevVlogTemplate title="Single" sections={singleSection} />);

      expect(screen.getByText(/1 sections/)).toBeInTheDocument();
    });

    it("handles custom timestamps", () => {
      const sectionsWithTimestamps = [
        { type: "hook" as const, duration: 5, content: <p>Hook</p>, timestamp: 0 },
        { type: "context" as const, duration: 10, content: <p>Context</p>, timestamp: 10 }
      ];

      render(<DevVlogTemplate title="Custom Timestamps" sections={sectionsWithTimestamps} />);

      // Should use custom timestamps instead of calculated ones
      expect(screen.getByText(/0s - 5s/)).toBeInTheDocument();
      expect(screen.getByText(/10s - 20s/)).toBeInTheDocument();
    });
  });
});
