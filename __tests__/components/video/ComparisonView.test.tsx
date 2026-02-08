/**
 * Tests for ComparisonView component (VID-CMP-001)
 *
 * Test Coverage:
 * - VID-CMP-001: Split screen layout renders correctly
 */

import { render, screen } from "@testing-library/react";
import { ComparisonView } from "@/components/video/ComparisonView";

describe("ComparisonView Component", () => {
  const mockLeft = {
    title: "Option A",
    content: <p>Content for Option A</p>
  };

  const mockRight = {
    title: "Option B",
    content: <p>Content for Option B</p>
  };

  describe("VID-CMP-001: Split Screen Layout", () => {
    it("renders both sides of comparison", () => {
      render(<ComparisonView left={mockLeft} right={mockRight} />);

      expect(screen.getByText("Option A")).toBeInTheDocument();
      expect(screen.getByText("Option B")).toBeInTheDocument();
      expect(screen.getByText("Content for Option A")).toBeInTheDocument();
      expect(screen.getByText("Content for Option B")).toBeInTheDocument();
    });

    it("renders in horizontal orientation by default", () => {
      const { container } = render(<ComparisonView left={mockLeft} right={mockRight} />);

      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass('grid-cols-1');
    });

    it("supports vertical orientation", () => {
      const { container } = render(
        <ComparisonView left={mockLeft} right={mockRight} orientation="vertical" />
      );

      const flex = container.querySelector('.flex-col');
      expect(flex).toBeInTheDocument();
    });
  });

  describe("Color Styling", () => {
    it("applies default blue color to left side", () => {
      const { container } = render(<ComparisonView left={mockLeft} right={mockRight} />);

      const blueHeader = container.querySelector('.bg-blue-500');
      expect(blueHeader).toBeInTheDocument();
    });

    it("applies default green color to right side", () => {
      const { container } = render(<ComparisonView left={mockLeft} right={mockRight} />);

      const greenHeader = container.querySelector('.bg-green-500');
      expect(greenHeader).toBeInTheDocument();
    });

    it("applies custom colors when provided", () => {
      const { container } = render(
        <ComparisonView
          left={{ ...mockLeft, color: "red" }}
          right={{ ...mockRight, color: "purple" }}
        />
      );

      const redHeader = container.querySelector('.bg-red-500');
      const purpleHeader = container.querySelector('.bg-purple-500');

      expect(redHeader).toBeInTheDocument();
      expect(purpleHeader).toBeInTheDocument();
    });
  });

  describe("Custom Styling", () => {
    it("applies custom className", () => {
      const { container } = render(
        <ComparisonView left={mockLeft} right={mockRight} className="custom-comparison" />
      );

      const comparison = container.querySelector('.custom-comparison');
      expect(comparison).toBeInTheDocument();
    });
  });

  describe("Content Rendering", () => {
    it("renders complex React content", () => {
      const complexLeft = {
        title: "Complex A",
        content: (
          <div>
            <h4>Heading</h4>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </div>
        )
      };

      render(<ComparisonView left={complexLeft} right={mockRight} />);

      expect(screen.getByText("Heading")).toBeInTheDocument();
      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("Item 2")).toBeInTheDocument();
    });
  });
});
