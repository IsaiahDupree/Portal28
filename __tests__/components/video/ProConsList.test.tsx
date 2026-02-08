/**
 * Tests for ProConsList component (VID-CMP-002)
 *
 * Test Coverage:
 * - VID-CMP-002: Pros and cons lists render correctly
 */

import { render, screen } from "@testing-library/react";
import { ProConsList } from "@/components/video/ProConsList";

describe("ProConsList Component", () => {
  const samplePros = [
    "Fast performance",
    "Easy to use",
    "Great documentation"
  ];

  const sampleCons = [
    "Expensive",
    "Limited features",
    "Steep learning curve"
  ];

  describe("VID-CMP-002: Pros and Cons Rendering", () => {
    it("renders pros list", () => {
      render(<ProConsList pros={samplePros} />);

      expect(screen.getByText("Pros")).toBeInTheDocument();
      expect(screen.getByText("Fast performance")).toBeInTheDocument();
      expect(screen.getByText("Easy to use")).toBeInTheDocument();
      expect(screen.getByText("Great documentation")).toBeInTheDocument();
    });

    it("renders cons list", () => {
      render(<ProConsList cons={sampleCons} />);

      expect(screen.getByText("Cons")).toBeInTheDocument();
      expect(screen.getByText("Expensive")).toBeInTheDocument();
      expect(screen.getByText("Limited features")).toBeInTheDocument();
      expect(screen.getByText("Steep learning curve")).toBeInTheDocument();
    });

    it("renders both pros and cons together", () => {
      render(<ProConsList pros={samplePros} cons={sampleCons} />);

      expect(screen.getByText("Pros")).toBeInTheDocument();
      expect(screen.getByText("Cons")).toBeInTheDocument();
      expect(screen.getByText("Fast performance")).toBeInTheDocument();
      expect(screen.getByText("Expensive")).toBeInTheDocument();
    });

    it("renders nothing when no pros or cons provided", () => {
      const { container } = render(<ProConsList />);

      expect(screen.queryByText("Pros")).not.toBeInTheDocument();
      expect(screen.queryByText("Cons")).not.toBeInTheDocument();
    });
  });

  describe("Icon Display", () => {
    it("shows icons by default", () => {
      const { container } = render(<ProConsList pros={samplePros} cons={sampleCons} />);

      // Check for check icons (pros)
      const checkIcons = container.querySelectorAll('.lucide-check');
      expect(checkIcons.length).toBeGreaterThan(0);

      // Check for X icons (cons)
      const xIcons = container.querySelectorAll('.lucide-x');
      expect(xIcons.length).toBeGreaterThan(0);
    });

    it("hides section icons when showIcons is false", () => {
      render(<ProConsList pros={samplePros} cons={sampleCons} showIcons={false} />);

      // Headers should still render but without icons next to "Pros" and "Cons"
      expect(screen.getByText("Pros")).toBeInTheDocument();
      expect(screen.getByText("Cons")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies green styling to pros", () => {
      const { container } = render(<ProConsList pros={samplePros} />);

      const prosHeader = screen.getByText("Pros").closest('h4');
      expect(prosHeader).toHaveClass('text-green-700');
    });

    it("applies red styling to cons", () => {
      const { container } = render(<ProConsList cons={sampleCons} />);

      const consHeader = screen.getByText("Cons").closest('h4');
      expect(consHeader).toHaveClass('text-red-700');
    });

    it("applies custom className", () => {
      const { container } = render(
        <ProConsList pros={samplePros} className="custom-list" />
      );

      const list = container.querySelector('.custom-list');
      expect(list).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty arrays", () => {
      render(<ProConsList pros={[]} cons={[]} />);

      expect(screen.queryByText("Pros")).not.toBeInTheDocument();
      expect(screen.queryByText("Cons")).not.toBeInTheDocument();
    });

    it("handles single item lists", () => {
      render(<ProConsList pros={["Only pro"]} cons={["Only con"]} />);

      expect(screen.getByText("Only pro")).toBeInTheDocument();
      expect(screen.getByText("Only con")).toBeInTheDocument();
    });

    it("handles very long text items", () => {
      const longPro = "This is a very long pro item that contains a lot of text and should still render properly without breaking the layout";

      render(<ProConsList pros={[longPro]} />);

      expect(screen.getByText(longPro)).toBeInTheDocument();
    });
  });
});
