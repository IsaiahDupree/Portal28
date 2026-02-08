/**
 * Tests for CodeBlock component (VID-DVL-001, VID-DVL-003)
 *
 * Test Coverage:
 * - VID-DVL-001: Code blocks render correctly
 * - VID-DVL-003: Code blocks support syntax highlighting and line numbers
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CodeBlock } from "@/components/video/CodeBlock";

describe("CodeBlock Component", () => {
  const sampleCode = `function hello() {
  console.log("Hello, World!");
  return true;
}`;

  describe("VID-DVL-001: Basic Rendering", () => {
    it("renders code content correctly", () => {
      render(<CodeBlock code={sampleCode} />);

      expect(screen.getByText(/function hello/)).toBeInTheDocument();
      expect(screen.getByText(/console.log/)).toBeInTheDocument();
      expect(screen.getByText(/return true/)).toBeInTheDocument();
    });

    it("displays filename when provided", () => {
      render(<CodeBlock code={sampleCode} filename="hello.js" />);

      expect(screen.getByText("hello.js")).toBeInTheDocument();
    });

    it("displays language badge when provided", () => {
      render(<CodeBlock code={sampleCode} language="javascript" filename="test.js" />);

      expect(screen.getByText("javascript")).toBeInTheDocument();
    });
  });

  describe("VID-DVL-003: Line Numbers", () => {
    it("shows line numbers by default", () => {
      render(<CodeBlock code={sampleCode} />);

      // Check for line numbers 1-4
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
    });

    it("hides line numbers when showLineNumbers is false", () => {
      const { container } = render(
        <CodeBlock code={sampleCode} showLineNumbers={false} />
      );

      // Line numbers shouldn't appear in the inline style
      const lineNumberSpans = container.querySelectorAll('.w-8');
      expect(lineNumberSpans.length).toBe(0);
    });

    it("highlights specified lines", () => {
      const { container } = render(
        <CodeBlock code={sampleCode} highlightLines={[2, 3]} />
      );

      // Check for highlighted line styling
      const highlightedDivs = container.querySelectorAll('.border-blue-500');
      expect(highlightedDivs.length).toBe(2);
    });
  });

  describe("Copy Functionality", () => {
    beforeEach(() => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined)
        }
      });
    });

    it("copies code to clipboard when copy button is clicked", async () => {
      render(<CodeBlock code={sampleCode} filename="test.js" />);

      const copyButton = screen.getByRole("button", { name: /copy/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(sampleCode);
      });
    });

    it("shows 'Copied' feedback after copying", async () => {
      render(<CodeBlock code={sampleCode} filename="test.js" />);

      const copyButton = screen.getByRole("button", { name: /copy/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument();
      });
    });
  });

  describe("Custom Styling", () => {
    it("applies custom className", () => {
      const { container } = render(
        <CodeBlock code={sampleCode} className="custom-class" />
      );

      const card = container.querySelector('.custom-class');
      expect(card).toBeInTheDocument();
    });

    it("maintains dark theme styling", () => {
      const { container } = render(<CodeBlock code={sampleCode} />);

      const card = container.querySelector('.bg-slate-950');
      expect(card).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty code", () => {
      const { container } = render(<CodeBlock code="" />);

      // Should render without crashing
      expect(container.querySelector('pre')).toBeInTheDocument();
    });

    it("handles single line code", () => {
      render(<CodeBlock code="const x = 1;" />);

      expect(screen.getByText("const x = 1;")).toBeInTheDocument();
    });

    it("handles very long lines", () => {
      const longLine = "const x = " + "1234567890".repeat(20) + ";";
      const { container } = render(<CodeBlock code={longLine} />);

      const scrollContainer = container.querySelector('.overflow-x-auto');
      expect(scrollContainer).toBeInTheDocument();
    });
  });
});
