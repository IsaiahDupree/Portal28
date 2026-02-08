/**
 * Tests for PRMerge component (VID-PRM-001, VID-PRM-002)
 *
 * Test Coverage:
 * - VID-PRM-001: PR title, number, and branch visualization
 * - VID-PRM-002: Merge animation and success indicator
 */

import { render, screen, act } from "@testing-library/react";
import { PRMerge } from "@/components/video/PRMerge";

describe("PRMerge Component", () => {
  const defaultProps = {
    prNumber: 42,
    title: "Add new authentication feature",
    sourceBranch: "feature/auth",
    targetBranch: "main",
    author: "Jane Developer"
  };

  describe("VID-PRM-001: PR Info Display", () => {
    it("renders PR number", () => {
      render(<PRMerge {...defaultProps} animated={false} />);

      expect(screen.getByText("#42")).toBeInTheDocument();
    });

    it("displays PR title", () => {
      render(<PRMerge {...defaultProps} animated={false} />);

      expect(screen.getByText("Add new authentication feature")).toBeInTheDocument();
    });

    it("shows author name", () => {
      render(<PRMerge {...defaultProps} animated={false} />);

      expect(screen.getByText(/by Jane Developer/)).toBeInTheDocument();
    });

    it("displays source branch", () => {
      render(<PRMerge {...defaultProps} animated={false} />);

      expect(screen.getByText("feature/auth")).toBeInTheDocument();
    });

    it("displays target branch", () => {
      render(<PRMerge {...defaultProps} animated={false} />);

      expect(screen.getByText("main")).toBeInTheDocument();
    });

    it("uses default author when not provided", () => {
      render(
        <PRMerge
          prNumber={10}
          title="Fix bug"
          sourceBranch="fix/bug"
          targetBranch="main"
          animated={false}
        />
      );

      // Default author is "Developer"
      expect(screen.getByText(/by Developer/)).toBeInTheDocument();
    });
  });

  describe("VID-PRM-002: Merge Animation and Success", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it("shows merge icon initially when animated", () => {
      const { container } = render(<PRMerge {...defaultProps} animated={true} />);

      // GitMerge icon should be present initially
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it("displays success message after animation completes", () => {
      render(<PRMerge {...defaultProps} animated={true} animationDuration={1000} />);

      // Fast-forward past animation
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(screen.getByText("Successfully merged!")).toBeInTheDocument();
    });

    it("shows success indicator immediately when not animated", () => {
      render(<PRMerge {...defaultProps} animated={false} />);

      expect(screen.getByText("Successfully merged!")).toBeInTheDocument();
    });

    it("displays celebratory sparkles after merge", () => {
      const { container } = render(<PRMerge {...defaultProps} animated={true} />);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Check for sparkles icon (lucide-react)
      const sparkles = container.querySelector('.text-yellow-400');
      expect(sparkles).toBeInTheDocument();
    });

    it("applies success styling after merge completes", () => {
      const { container } = render(<PRMerge {...defaultProps} animated={true} />);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Success text should be green
      const successText = screen.getByText("Successfully merged!");
      expect(successText).toHaveClass("text-green-400");
    });
  });

  describe("Branch Merge Visual", () => {
    it("renders branch merge visual", () => {
      const { container } = render(<PRMerge {...defaultProps} animated={false} />);

      // Check for branch dots
      const dots = container.querySelectorAll('.rounded-full');
      expect(dots.length).toBeGreaterThanOrEqual(2);
    });

    it("displays merge arrow between branches", () => {
      const { container } = render(<PRMerge {...defaultProps} animated={false} />);

      // Check for SVG arrow
      const arrows = container.querySelectorAll('svg path');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it("applies correct branch colors", () => {
      const { container } = render(<PRMerge {...defaultProps} animated={false} />);

      // Source branch should be blue
      const sourceBranch = screen.getByText("feature/auth");
      expect(sourceBranch).toHaveClass("text-blue-300");

      // Target branch should be green
      const targetBranch = screen.getByText("main");
      expect(targetBranch).toHaveClass("text-green-300");
    });
  });

  describe("Appearance and Styling", () => {
    it("applies gradient background", () => {
      const { container } = render(<PRMerge {...defaultProps} animated={false} />);

      const card = container.querySelector('.bg-gradient-to-r');
      expect(card).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(
        <PRMerge {...defaultProps} animated={false} className="custom-pr" />
      );

      const card = container.querySelector('.custom-pr');
      expect(card).toBeInTheDocument();
    });

    it("has celebratory feel with purple/blue theme", () => {
      const { container } = render(<PRMerge {...defaultProps} animated={false} />);

      // Check for purple/blue themed elements
      const purpleElements = container.querySelectorAll('.text-purple-400, .border-purple-500\\/30');
      expect(purpleElements.length).toBeGreaterThan(0);
    });
  });

  describe("Animation Timing", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it("respects custom animation duration", () => {
      render(<PRMerge {...defaultProps} animated={true} animationDuration={500} />);

      // Should complete faster with shorter duration
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByText("Successfully merged!")).toBeInTheDocument();
    });

    it("shows branches during animation", () => {
      render(<PRMerge {...defaultProps} animated={true} />);

      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Branches should be visible during merge
      expect(screen.getByText("feature/auth")).toBeInTheDocument();
      expect(screen.getByText("main")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles long PR titles", () => {
      const longTitle = "This is a very long pull request title that describes in great detail all the changes made";
      render(
        <PRMerge
          {...defaultProps}
          title={longTitle}
          animated={false}
        />
      );

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it("handles long branch names", () => {
      render(
        <PRMerge
          {...defaultProps}
          sourceBranch="feature/very-long-branch-name-with-many-words"
          targetBranch="develop"
          animated={false}
        />
      );

      expect(screen.getByText("feature/very-long-branch-name-with-many-words")).toBeInTheDocument();
    });

    it("handles large PR numbers", () => {
      render(
        <PRMerge
          {...defaultProps}
          prNumber={9999}
          animated={false}
        />
      );

      expect(screen.getByText("#9999")).toBeInTheDocument();
    });
  });
});
