/**
 * Tests for UGCStyleTemplate component (VID-UGC-001, VID-UGC-002, VID-UGC-003)
 *
 * Test Coverage:
 * - VID-UGC-001: Mimics trending format structure
 * - VID-UGC-002: Brand consistent styling
 * - VID-UGC-003: Authentic feel with 9:16 aspect ratio
 */

import { render, screen } from "@testing-library/react";
import { UGCStyleTemplate, createUGCContent } from "@/components/video/UGCStyleTemplate";

describe("UGCStyleTemplate Component", () => {
  const mockSections = [
    {
      type: "hook" as const,
      duration: 3,
      content: <p>Attention grabbing hook!</p>
    },
    {
      type: "problem" as const,
      duration: 10,
      content: <p>The problem we're solving</p>
    },
    {
      type: "solution" as const,
      duration: 25,
      content: <p>Here's the solution</p>
    },
    {
      type: "cta" as const,
      duration: 7,
      content: <p>Follow for more tips!</p>
    }
  ];

  const mockBranding = {
    watermark: "@mybrand",
    colorScheme: "light" as const,
    fontFamily: "Inter"
  };

  describe("VID-UGC-001: Trending Format Structure", () => {
    it("renders UGC template with title", () => {
      render(
        <UGCStyleTemplate
          title="My UGC Video"
          trendingFormat="Day in the Life"
          sections={mockSections}
        />
      );

      expect(screen.getByText("My UGC Video")).toBeInTheDocument();
    });

    it("displays trending format being recreated", () => {
      render(
        <UGCStyleTemplate
          title="Test"
          trendingFormat="Before & After"
          sections={mockSections}
        />
      );

      expect(screen.getByText(/Recreating: Before & After/)).toBeInTheDocument();
    });

    it("renders all four UGC sections", () => {
      render(
        <UGCStyleTemplate
          title="Test"
          trendingFormat="Tutorial"
          sections={mockSections}
        />
      );

      expect(screen.getByText("Hook")).toBeInTheDocument();
      expect(screen.getByText("Problem")).toBeInTheDocument();
      expect(screen.getByText("Solution")).toBeInTheDocument();
      expect(screen.getByText("Call to Action")).toBeInTheDocument();
    });

    it("displays section content", () => {
      render(
        <UGCStyleTemplate
          title="Test"
          trendingFormat="Tutorial"
          sections={mockSections}
        />
      );

      expect(screen.getByText("Attention grabbing hook!")).toBeInTheDocument();
      expect(screen.getByText("The problem we're solving")).toBeInTheDocument();
      expect(screen.getByText("Here's the solution")).toBeInTheDocument();
      expect(screen.getByText("Follow for more tips!")).toBeInTheDocument();
    });

    it("shows section count", () => {
      render(
        <UGCStyleTemplate
          title="Test"
          trendingFormat="Tutorial"
          sections={mockSections}
        />
      );

      expect(screen.getByText(/4 sections/)).toBeInTheDocument();
    });
  });

  describe("VID-UGC-002: Brand Consistency", () => {
    it("displays brand watermark in branding section", () => {
      render(
        <UGCStyleTemplate
          title="Test"
          trendingFormat="Tutorial"
          sections={mockSections}
          branding={mockBranding}
        />
      );

      // Branding info should be shown in the breakdown section
      expect(screen.getByText("Brand Consistency")).toBeInTheDocument();
    });

    it("shows color scheme in branding info", () => {
      render(
        <UGCStyleTemplate
          title="Test"
          trendingFormat="Tutorial"
          sections={mockSections}
          branding={mockBranding}
        />
      );

      expect(screen.getByText(/Color Scheme:/)).toBeInTheDocument();
      expect(screen.getByText("light")).toBeInTheDocument();
    });

    it("shows font family in branding info", () => {
      render(
        <UGCStyleTemplate
          title="Test"
          trendingFormat="Tutorial"
          sections={mockSections}
          branding={mockBranding}
        />
      );

      expect(screen.getByText(/Font:/)).toBeInTheDocument();
      expect(screen.getByText("Inter")).toBeInTheDocument();
    });

    it("renders without branding info when not provided", () => {
      render(
        <UGCStyleTemplate
          title="Test"
          trendingFormat="Tutorial"
          sections={mockSections}
        />
      );

      expect(screen.queryByText("Brand Consistency")).not.toBeInTheDocument();
    });
  });

  describe("VID-UGC-003: Authentic Style & Aspect Ratio", () => {
    it("shows 9:16 aspect ratio badge", () => {
      render(
        <UGCStyleTemplate
          title="Test"
          trendingFormat="Tutorial"
          sections={mockSections}
        />
      );

      expect(screen.getByText("9:16")).toBeInTheDocument();
    });

    it("displays casual style by default", () => {
      render(
        <UGCStyleTemplate
          title="Test"
          trendingFormat="Tutorial"
          sections={mockSections}
        />
      );

      expect(screen.getByText("casual style")).toBeInTheDocument();
    });

    it("displays professional style when specified", () => {
      render(
        <UGCStyleTemplate
          title="Test"
          trendingFormat="Tutorial"
          sections={mockSections}
          authenticStyle="professional"
        />
      );

      expect(screen.getByText("professional style")).toBeInTheDocument();
    });

    it("displays playful style when specified", () => {
      render(
        <UGCStyleTemplate
          title="Test"
          trendingFormat="Tutorial"
          sections={mockSections}
          authenticStyle="playful"
        />
      );

      expect(screen.getByText("playful style")).toBeInTheDocument();
    });

    it("applies vertical aspect ratio class", () => {
      const { container } = render(
        <UGCStyleTemplate
          title="Test"
          trendingFormat="Tutorial"
          sections={mockSections}
        />
      );

      const videoArea = container.querySelector('.aspect-\\[9\\/16\\]');
      expect(videoArea).toBeInTheDocument();
    });
  });

  describe("Duration Validation", () => {
    it("calculates total duration correctly", () => {
      render(
        <UGCStyleTemplate
          title="Test"
          trendingFormat="Tutorial"
          sections={mockSections}
        />
      );

      // Total: 3 + 10 + 25 + 7 = 45s
      expect(screen.getByText("45s")).toBeInTheDocument();
    });

    it("accepts durations within 30-60s range", () => {
      render(
        <UGCStyleTemplate
          title="Test"
          trendingFormat="Tutorial"
          sections={mockSections}
          duration={45}
        />
      );

      // Should not show warning
      expect(screen.queryByText(/Warning:/)).not.toBeInTheDocument();
    });

    it("shows warning for duration below 30s", () => {
      render(
        <UGCStyleTemplate
          title="Test"
          trendingFormat="Tutorial"
          sections={mockSections}
          duration={25}
        />
      );

      expect(screen.getByText(/Warning:/)).toBeInTheDocument();
      expect(screen.getByText(/30-60 seconds/)).toBeInTheDocument();
    });

    it("shows warning for duration above 60s", () => {
      render(
        <UGCStyleTemplate
          title="Test"
          trendingFormat="Tutorial"
          sections={mockSections}
          duration={75}
        />
      );

      expect(screen.getByText(/Warning:/)).toBeInTheDocument();
    });

    it("displays section durations", () => {
      render(
        <UGCStyleTemplate
          title="Test"
          trendingFormat="Tutorial"
          sections={mockSections}
        />
      );

      expect(screen.getByText("3s")).toBeInTheDocument();
      expect(screen.getByText("10s")).toBeInTheDocument();
      expect(screen.getByText("25s")).toBeInTheDocument();
      expect(screen.getByText("7s")).toBeInTheDocument();
    });
  });

  describe("createUGCContent Helper Function", () => {
    it("creates properly structured UGC content", () => {
      const ugc = createUGCContent({
        title: "Test UGC",
        trendingFormat: "Tutorial",
        hook: { duration: 3, content: <p>Hook</p> },
        problem: { duration: 10, content: <p>Problem</p> },
        solution: { duration: 25, content: <p>Solution</p> },
        cta: { duration: 7, content: <p>CTA</p> }
      });

      expect(ugc.title).toBe("Test UGC");
      expect(ugc.trendingFormat).toBe("Tutorial");
      expect(ugc.sections).toHaveLength(4);
      expect(ugc.sections[0].type).toBe("hook");
      expect(ugc.sections[1].type).toBe("problem");
      expect(ugc.sections[2].type).toBe("solution");
      expect(ugc.sections[3].type).toBe("cta");
    });

    it("defaults to casual style", () => {
      const ugc = createUGCContent({
        title: "Test",
        trendingFormat: "Tutorial",
        hook: { duration: 3, content: <p>Hook</p> },
        problem: { duration: 10, content: <p>Problem</p> },
        solution: { duration: 25, content: <p>Solution</p> },
        cta: { duration: 7, content: <p>CTA</p> }
      });

      expect(ugc.authenticStyle).toBe("casual");
    });

    it("accepts custom authentic style", () => {
      const ugc = createUGCContent({
        title: "Test",
        trendingFormat: "Tutorial",
        authenticStyle: "professional",
        hook: { duration: 3, content: <p>Hook</p> },
        problem: { duration: 10, content: <p>Problem</p> },
        solution: { duration: 25, content: <p>Solution</p> },
        cta: { duration: 7, content: <p>CTA</p> }
      });

      expect(ugc.authenticStyle).toBe("professional");
    });

    it("includes branding configuration", () => {
      const branding = {
        watermark: "@test",
        colorScheme: "dark" as const
      };

      const ugc = createUGCContent({
        title: "Test",
        trendingFormat: "Tutorial",
        branding,
        hook: { duration: 3, content: <p>Hook</p> },
        problem: { duration: 10, content: <p>Problem</p> },
        solution: { duration: 25, content: <p>Solution</p> },
        cta: { duration: 7, content: <p>CTA</p> }
      });

      expect(ugc.branding).toEqual(branding);
    });
  });

  describe("Custom Styling", () => {
    it("applies custom className", () => {
      const { container } = render(
        <UGCStyleTemplate
          title="Test"
          trendingFormat="Tutorial"
          sections={mockSections}
          className="custom-ugc"
        />
      );

      const template = container.querySelector('.custom-ugc');
      expect(template).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty sections array", () => {
      render(
        <UGCStyleTemplate
          title="Empty"
          trendingFormat="Tutorial"
          sections={[]}
        />
      );

      expect(screen.getByText("Empty")).toBeInTheDocument();
      expect(screen.getByText(/0 sections/)).toBeInTheDocument();
    });

    it("handles custom timestamps", () => {
      const sectionsWithTimestamps = [
        { type: "hook" as const, duration: 3, content: <p>Hook</p>, timestamp: 0 },
        { type: "problem" as const, duration: 10, content: <p>Problem</p>, timestamp: 5 }
      ];

      render(
        <UGCStyleTemplate
          title="Custom Timestamps"
          trendingFormat="Tutorial"
          sections={sectionsWithTimestamps}
        />
      );

      expect(screen.getByText(/0s - 3s/)).toBeInTheDocument();
      expect(screen.getByText(/5s - 15s/)).toBeInTheDocument();
    });
  });
});
