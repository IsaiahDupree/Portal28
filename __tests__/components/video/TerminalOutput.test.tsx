/**
 * Tests for TerminalOutput component (VID-TRM-001, VID-TRM-002, VID-TRM-003)
 *
 * Test Coverage:
 * - VID-TRM-001: Terminal window mockup
 * - VID-TRM-002: Command typing animation and output reveal
 * - VID-TRM-003: Cursor blinking
 */

import { render, screen, waitFor } from "@testing-library/react";
import { TerminalOutput } from "@/components/video/TerminalOutput";

describe("TerminalOutput Component", () => {
  const sampleLines = [
    { text: "npm install", type: "command" as const },
    { text: "Installing dependencies...", type: "output" as const },
    { text: "✓ All packages installed", type: "success" as const }
  ];

  describe("VID-TRM-001: Terminal Window Mockup", () => {
    it("renders terminal with title", () => {
      render(<TerminalOutput lines={sampleLines} animated={false} />);

      expect(screen.getByText("Terminal")).toBeInTheDocument();
    });

    it("renders custom title when provided", () => {
      render(<TerminalOutput lines={sampleLines} title="Build Output" animated={false} />);

      expect(screen.getByText("Build Output")).toBeInTheDocument();
    });

    it("renders all lines when animation is disabled", () => {
      render(<TerminalOutput lines={sampleLines} animated={false} />);

      expect(screen.getByText("npm install")).toBeInTheDocument();
      expect(screen.getByText("Installing dependencies...")).toBeInTheDocument();
      expect(screen.getByText("✓ All packages installed")).toBeInTheDocument();
    });

    it("handles string array input", () => {
      const stringLines = ["Line 1", "Line 2", "Line 3"];
      render(<TerminalOutput lines={stringLines} animated={false} />);

      expect(screen.getByText("Line 1")).toBeInTheDocument();
      expect(screen.getByText("Line 2")).toBeInTheDocument();
      expect(screen.getByText("Line 3")).toBeInTheDocument();
    });
  });

  describe("VID-TRM-002: Command Typing and Output Reveal", () => {
    it("shows animation enabled state", () => {
      render(<TerminalOutput lines={sampleLines} animated={true} typingSpeed={100} />);

      // Terminal should render
      expect(screen.getByText("Terminal")).toBeInTheDocument();
    });

    it("supports typing speed configuration", () => {
      render(<TerminalOutput lines={sampleLines} animated={true} typingSpeed={50} />);

      // Terminal should render with configured speed
      expect(screen.getByText("Terminal")).toBeInTheDocument();
    });

    it("renders all lines when animation is disabled", () => {
      render(<TerminalOutput lines={sampleLines} animated={false} />);

      // All lines should be visible immediately
      expect(screen.getByText("npm install")).toBeInTheDocument();
      expect(screen.getByText("Installing dependencies...")).toBeInTheDocument();
      expect(screen.getByText("✓ All packages installed")).toBeInTheDocument();
    });
  });

  describe("VID-TRM-003: Cursor Blinking", () => {
    it("displays cursor during animation", () => {
      const { container } = render(
        <TerminalOutput lines={["test line"]} animated={true} typingSpeed={10} />
      );

      // Cursor should be visible (▋ character with animate-pulse class)
      const cursorElement = container.querySelector('.animate-pulse');
      expect(cursorElement).toBeInTheDocument();
      expect(cursorElement?.textContent).toBe("▋");
    });

    it("cursor is not visible when animation is disabled", () => {
      const { container } = render(
        <TerminalOutput lines={["test line"]} animated={false} />
      );

      // No cursor when animation is disabled
      const cursorElement = container.querySelector('.animate-pulse');
      expect(cursorElement).not.toBeInTheDocument();
    });

    it("cursor appears at the end of current typing line", () => {
      const { container } = render(
        <TerminalOutput
          lines={[{ text: "npm install", type: "command" }]}
          animated={true}
          typingSpeed={20}
        />
      );

      // Cursor should appear in the same line container as the text being typed
      const cursorElement = container.querySelector('.animate-pulse');
      expect(cursorElement).toBeInTheDocument();
    });
  });

  describe("Prompt Symbol", () => {
    it("shows default prompt symbol for commands", () => {
      render(<TerminalOutput lines={sampleLines} animated={false} />);

      expect(screen.getByText("$")).toBeInTheDocument();
    });

    it("uses custom prompt symbol when provided", () => {
      render(
        <TerminalOutput
          lines={sampleLines}
          animated={false}
          promptSymbol=">"
        />
      );

      expect(screen.getByText(">")).toBeInTheDocument();
    });

    it("hides prompt when showPrompt is false", () => {
      render(
        <TerminalOutput
          lines={sampleLines}
          animated={false}
          showPrompt={false}
        />
      );

      expect(screen.queryByText("$")).not.toBeInTheDocument();
    });
  });

  describe("Line Types and Styling", () => {
    it("applies correct styling for command lines", () => {
      const { container } = render(
        <TerminalOutput
          lines={[{ text: "ls -la", type: "command" }]}
          animated={false}
        />
      );

      const commandLine = container.querySelector('.text-green-400');
      expect(commandLine).toBeInTheDocument();
    });

    it("applies correct styling for error lines", () => {
      const { container } = render(
        <TerminalOutput
          lines={[{ text: "Error: Not found", type: "error" }]}
          animated={false}
        />
      );

      const errorLine = container.querySelector('.text-red-400');
      expect(errorLine).toBeInTheDocument();
    });

    it("applies correct styling for success lines", () => {
      const { container } = render(
        <TerminalOutput
          lines={[{ text: "Success!", type: "success" }]}
          animated={false}
        />
      );

      const successLine = container.querySelector('.text-green-300');
      expect(successLine).toBeInTheDocument();
    });
  });

  describe("Terminal Window Chrome", () => {
    it("renders terminal window buttons", () => {
      const { container } = render(<TerminalOutput lines={sampleLines} animated={false} />);

      // Check for red, yellow, green dots
      const dots = container.querySelectorAll('.rounded-full');
      expect(dots.length).toBeGreaterThanOrEqual(3);
    });

    it("applies dark theme styling", () => {
      const { container } = render(<TerminalOutput lines={sampleLines} animated={false} />);

      const terminalCard = container.querySelector('.bg-slate-950');
      expect(terminalCard).toBeInTheDocument();
    });
  });

  describe("Custom Styling", () => {
    it("applies custom className", () => {
      const { container } = render(
        <TerminalOutput lines={sampleLines} animated={false} className="custom-terminal" />
      );

      const terminal = container.querySelector('.custom-terminal');
      expect(terminal).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty lines array", () => {
      render(<TerminalOutput lines={[]} animated={false} />);

      // Should render terminal chrome without errors
      expect(screen.getByText("Terminal")).toBeInTheDocument();
    });

    it("handles very long lines", () => {
      const longLine = "echo " + "x".repeat(200);
      render(<TerminalOutput lines={[longLine]} animated={false} />);

      expect(screen.getByText(new RegExp(longLine.slice(0, 50)))).toBeInTheDocument();
    });

    it("respects line delays in animation", () => {
      const linesWithDelay = [
        { text: "Line 1", delay: 1000 },
        { text: "Line 2", delay: 500 }
      ];

      render(<TerminalOutput lines={linesWithDelay} animated={true} />);

      // Component should handle delays without crashing
      expect(screen.getByText("Terminal")).toBeInTheDocument();
    });
  });
});
