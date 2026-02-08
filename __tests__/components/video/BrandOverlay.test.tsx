/**
 * Tests for BrandOverlay component
 *
 * Test Coverage:
 * - Brand logo and watermark rendering
 * - Position and opacity settings
 * - Color scheme styling
 */

import { render, screen } from "@testing-library/react";
import { BrandOverlay } from "@/components/video/BrandOverlay";

describe("BrandOverlay Component", () => {
  describe("Basic Rendering", () => {
    it("renders watermark text", () => {
      render(<BrandOverlay watermark="@mybrand" />);

      expect(screen.getByText("@mybrand")).toBeInTheDocument();
    });

    it("renders logo image", () => {
      render(<BrandOverlay logo="/logo.png" />);

      const logo = screen.getByAltText("Brand logo");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("src", "/logo.png");
    });

    it("renders custom React logo element", () => {
      const customLogo = <div data-testid="custom-logo">Custom Logo</div>;
      render(<BrandOverlay logo={customLogo} />);

      expect(screen.getByTestId("custom-logo")).toBeInTheDocument();
    });

    it("renders both logo and watermark", () => {
      render(<BrandOverlay logo="/logo.png" watermark="@mybrand" />);

      expect(screen.getByAltText("Brand logo")).toBeInTheDocument();
      expect(screen.getByText("@mybrand")).toBeInTheDocument();
    });
  });

  describe("Position", () => {
    it("applies bottom-right position by default", () => {
      const { container } = render(<BrandOverlay watermark="test" />);

      const overlay = container.querySelector('.bottom-4.right-4');
      expect(overlay).toBeInTheDocument();
    });

    it("applies top-left position", () => {
      const { container } = render(<BrandOverlay watermark="test" position="top-left" />);

      const overlay = container.querySelector('.top-4.left-4');
      expect(overlay).toBeInTheDocument();
    });

    it("applies top-right position", () => {
      const { container } = render(<BrandOverlay watermark="test" position="top-right" />);

      const overlay = container.querySelector('.top-4.right-4');
      expect(overlay).toBeInTheDocument();
    });

    it("applies bottom-left position", () => {
      const { container } = render(<BrandOverlay watermark="test" position="bottom-left" />);

      const overlay = container.querySelector('.bottom-4.left-4');
      expect(overlay).toBeInTheDocument();
    });

    it("applies center position", () => {
      const { container } = render(<BrandOverlay watermark="test" position="center" />);

      const overlay = container.querySelector('.top-1\\/2.left-1\\/2');
      expect(overlay).toBeInTheDocument();
    });
  });

  describe("Size", () => {
    it("applies small size by default", () => {
      const { container } = render(<BrandOverlay watermark="test" />);

      const watermark = container.querySelector('.text-xs');
      expect(watermark).toBeInTheDocument();
    });

    it("applies medium size", () => {
      const { container } = render(<BrandOverlay watermark="test" size="md" />);

      const watermark = container.querySelector('.text-sm');
      expect(watermark).toBeInTheDocument();
    });

    it("applies large size", () => {
      const { container } = render(<BrandOverlay watermark="test" size="lg" />);

      const watermark = container.querySelector('.text-base');
      expect(watermark).toBeInTheDocument();
    });
  });

  describe("Opacity", () => {
    it("applies default opacity of 0.7", () => {
      const { container } = render(<BrandOverlay watermark="test" />);

      const overlay = container.querySelector('[style*="opacity"]');
      expect(overlay).toHaveStyle({ opacity: 0.7 });
    });

    it("applies custom opacity", () => {
      const { container } = render(<BrandOverlay watermark="test" opacity={0.5} />);

      const overlay = container.querySelector('[style*="opacity"]');
      expect(overlay).toHaveStyle({ opacity: 0.5 });
    });

    it("applies full opacity", () => {
      const { container } = render(<BrandOverlay watermark="test" opacity={1} />);

      const overlay = container.querySelector('[style*="opacity"]');
      expect(overlay).toHaveStyle({ opacity: 1 });
    });
  });

  describe("Color Scheme", () => {
    it("applies light color scheme by default", () => {
      const { container } = render(<BrandOverlay watermark="test" />);

      const watermark = container.querySelector('.text-white');
      expect(watermark).toBeInTheDocument();
    });

    it("applies dark color scheme", () => {
      const { container } = render(<BrandOverlay watermark="test" colorScheme="dark" />);

      const watermark = container.querySelector('.text-slate-900');
      expect(watermark).toBeInTheDocument();
    });

    it("applies auto color scheme", () => {
      const { container } = render(<BrandOverlay watermark="test" colorScheme="auto" />);

      // Auto defaults to light
      const watermark = container.querySelector('.text-white');
      expect(watermark).toBeInTheDocument();
    });
  });

  describe("Custom Styling", () => {
    it("applies custom className", () => {
      const { container } = render(
        <BrandOverlay watermark="test" className="custom-overlay" />
      );

      const overlay = container.querySelector('.custom-overlay');
      expect(overlay).toBeInTheDocument();
    });

    it("is non-interactive (pointer-events-none)", () => {
      const { container } = render(<BrandOverlay watermark="test" />);

      const overlay = container.querySelector('.pointer-events-none');
      expect(overlay).toBeInTheDocument();
    });

    it("has absolute positioning", () => {
      const { container } = render(<BrandOverlay watermark="test" />);

      const overlay = container.querySelector('.absolute');
      expect(overlay).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("renders without logo or watermark", () => {
      const { container } = render(<BrandOverlay />);

      const overlay = container.querySelector('.absolute');
      expect(overlay).toBeInTheDocument();
    });

    it("handles very long watermark text", () => {
      const longText = "@mybrandwithaveryverylongname";
      render(<BrandOverlay watermark={longText} />);

      expect(screen.getByText(longText)).toBeInTheDocument();
    });
  });
});
