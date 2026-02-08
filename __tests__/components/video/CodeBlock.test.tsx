/**
 * Tests for CodeBlock component (VID-COD-001, VID-COD-002, VID-COD-003, VID-COD-004)
 *
 * Test Coverage:
 * - VID-COD-001: Syntax highlighting by language
 * - VID-COD-002: Typing animation effect
 * - VID-COD-003: Line highlighting
 * - VID-COD-004: Copy button visual
 */

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { CodeBlock } from "@/components/video/CodeBlock";

// Mock Prism
jest.mock("prismjs", () => ({
  highlight: jest.fn((code, grammar, language) => {
    // Simple mock that adds some HTML
    return code.replace(/function/g, '<span class="token keyword">function</span>');
  }),
  languages: {
    javascript: {},
    typescript: {},
    python: {},
    bash: {}
  }
}));

// Mock CSS imports
jest.mock("prismjs/themes/prism-tomorrow.css", () => ({}));
jest.mock("prismjs/components/prism-javascript", () => ({}));
jest.mock("prismjs/components/prism-typescript", () => ({}));
jest.mock("prismjs/components/prism-jsx", () => ({}));
jest.mock("prismjs/components/prism-tsx", () => ({}));
jest.mock("prismjs/components/prism-css", () => ({}));
jest.mock("prismjs/components/prism-python", () => ({}));
jest.mock("prismjs/components/prism-bash", () => ({}));
jest.mock("prismjs/components/prism-json", () => ({}));
jest.mock("prismjs/components/prism-markdown", () => ({}));

describe("CodeBlock Component", () => {
  const sampleCode = `function hello() {
  console.log("Hello, World!");
  return true;
}`;

  describe("VID-DVL-001: Basic Rendering", () => {
    it("renders code content correctly", () => {
      const { container } = render(<CodeBlock code={sampleCode} />);

      // Content may be split across HTML elements due to syntax highlighting
      expect(container.textContent).toContain("function hello");
      expect(container.textContent).toContain("console.log");
      expect(container.textContent).toContain("return true");
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

  describe("VID-COD-001: Syntax Highlighting", () => {
    it("applies syntax highlighting to code", () => {
      const { container } = render(
        <CodeBlock code={sampleCode} language="javascript" />
      );

      // Check that Prism's highlight was applied (mocked to wrap "function" in span)
      const tokenElements = container.querySelectorAll('.token');
      expect(tokenElements.length).toBeGreaterThan(0);
    });

    it("supports multiple languages", () => {
      const pythonCode = "def hello():\n    print('Hello')";
      const { container } = render(<CodeBlock code={pythonCode} language="python" />);

      expect(container.textContent).toContain("def hello");
    });

    it("falls back gracefully when language is not supported", () => {
      const { container } = render(<CodeBlock code={sampleCode} language="unknown" />);

      expect(container.textContent).toContain("function hello");
    });

    it("renders code without syntax highlighting when no language is specified", () => {
      const { container } = render(<CodeBlock code={sampleCode} />);

      expect(container.textContent).toContain("function hello");
    });
  });

  describe("VID-COD-002: Typing Animation", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it("displays code immediately when typing animation is disabled", () => {
      const { container } = render(<CodeBlock code={sampleCode} enableTypingAnimation={false} />);

      // Check code is present in the container (may be split across HTML elements due to syntax highlighting)
      expect(container.textContent).toContain("function hello");
      expect(container.textContent).toContain("console.log");
    });

    it("reveals code gradually when typing animation is enabled", () => {
      const { container } = render(
        <CodeBlock code="const x = 1;" enableTypingAnimation={true} typingSpeed={10} />
      );

      // Initially, code should be empty or partial
      const codeElement = container.querySelector("code");
      expect(codeElement?.textContent).not.toContain("const x = 1;");

      // Fast-forward time to see progressive reveal
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // After some time, partial code should be visible
      // Note: exact timing depends on typingSpeed
    });

    it("completes typing animation after sufficient time", () => {
      const { container } = render(
        <CodeBlock code="const x = 1;" enableTypingAnimation={true} typingSpeed={20} />
      );

      // Fast-forward past the entire animation
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Code should now be fully visible
      expect(container.textContent).toContain("const x = 1");
    });

    it("respects custom typing speed", () => {
      const fastSpeed = 100; // 100 chars per second
      const slowSpeed = 10;  // 10 chars per second

      const { rerender } = render(
        <CodeBlock code="test" enableTypingAnimation={true} typingSpeed={fastSpeed} />
      );

      jest.advanceTimersByTime(100); // Should be done faster

      rerender(
        <CodeBlock code="test" enableTypingAnimation={true} typingSpeed={slowSpeed} />
      );

      // Slower animation takes longer
    });
  });

  describe("VID-COD-003: Line Highlighting", () => {
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

  describe("VID-COD-004: Copy Button", () => {
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
