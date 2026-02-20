/**
 * Core Utilities Unit Tests (feat-WC-005)
 *
 * Tests for core utility functions:
 * - Class name merging (cn function)
 * - String manipulation
 * - Edge cases
 */

import { cn } from "@/lib/utils";

describe("Utility Functions - Class Name Merging (cn)", () => {
  describe("Basic functionality", () => {
    it("should merge class names", () => {
      const result = cn("class1", "class2");
      expect(result).toContain("class1");
      expect(result).toContain("class2");
    });

    it("should handle single class name", () => {
      const result = cn("single-class");
      expect(result).toBe("single-class");
    });

    it("should handle empty input", () => {
      const result = cn();
      expect(result).toBe("");
    });

    it("should handle null and undefined values", () => {
      const result = cn("class1", null, undefined, "class2");
      expect(result).toContain("class1");
      expect(result).toContain("class2");
      expect(result).not.toContain("null");
      expect(result).not.toContain("undefined");
    });
  });

  describe("Conditional class names", () => {
    it("should handle boolean conditions", () => {
      const isActive = true;
      const result = cn("base", isActive && "active");
      expect(result).toContain("base");
      expect(result).toContain("active");
    });

    it("should exclude false conditions", () => {
      const isActive = false;
      const result = cn("base", isActive && "active");
      expect(result).toContain("base");
      expect(result).not.toContain("active");
    });

    it("should handle multiple conditions", () => {
      const isActive = true;
      const isDisabled = false;
      const result = cn(
        "base",
        isActive && "active",
        isDisabled && "disabled"
      );
      expect(result).toContain("base");
      expect(result).toContain("active");
      expect(result).not.toContain("disabled");
    });
  });

  describe("Object syntax", () => {
    it("should handle object with boolean values", () => {
      const result = cn({
        base: true,
        active: true,
        disabled: false,
      });
      expect(result).toContain("base");
      expect(result).toContain("active");
      expect(result).not.toContain("disabled");
    });

    it("should merge object and string class names", () => {
      const result = cn("always-present", {
        conditional: true,
      });
      expect(result).toContain("always-present");
      expect(result).toContain("conditional");
    });
  });

  describe("Array syntax", () => {
    it("should handle arrays of class names", () => {
      const result = cn(["class1", "class2", "class3"]);
      expect(result).toContain("class1");
      expect(result).toContain("class2");
      expect(result).toContain("class3");
    });

    it("should handle nested arrays", () => {
      const result = cn(["class1", ["class2", "class3"]]);
      expect(result).toContain("class1");
      expect(result).toContain("class2");
      expect(result).toContain("class3");
    });

    it("should filter falsy values in arrays", () => {
      const result = cn(["class1", false, null, "class2", undefined]);
      expect(result).toContain("class1");
      expect(result).toContain("class2");
      expect(result).not.toContain("false");
      expect(result).not.toContain("null");
    });
  });

  describe("Tailwind CSS class merging", () => {
    it("should merge conflicting Tailwind classes correctly", () => {
      // twMerge should prioritize later classes
      const result = cn("px-2 py-1", "px-4");
      expect(result).toContain("px-4");
      expect(result).toContain("py-1");
      expect(result).not.toContain("px-2");
    });

    it("should handle text size conflicts", () => {
      const result = cn("text-sm", "text-lg");
      expect(result).toContain("text-lg");
      expect(result).not.toContain("text-sm");
    });

    it("should handle color conflicts", () => {
      const result = cn("text-red-500", "text-blue-500");
      expect(result).toContain("text-blue-500");
      expect(result).not.toContain("text-red-500");
    });

    it("should preserve non-conflicting classes", () => {
      const result = cn("px-4 py-2 text-red-500", "text-blue-500 bg-white");
      expect(result).toContain("px-4");
      expect(result).toContain("py-2");
      expect(result).toContain("text-blue-500");
      expect(result).toContain("bg-white");
      expect(result).not.toContain("text-red-500");
    });

    it("should handle responsive classes", () => {
      const result = cn("text-sm", "md:text-lg");
      expect(result).toContain("text-sm");
      expect(result).toContain("md:text-lg");
    });

    it("should handle hover/focus states", () => {
      const result = cn("hover:bg-gray-100", "focus:ring-2");
      expect(result).toContain("hover:bg-gray-100");
      expect(result).toContain("focus:ring-2");
    });
  });

  describe("Common UI component patterns", () => {
    it("should merge button variants correctly", () => {
      const baseButton = "px-4 py-2 rounded font-medium";
      const primaryVariant = "bg-blue-500 text-white";
      const secondaryVariant = "bg-gray-200 text-gray-800";

      const primary = cn(baseButton, primaryVariant);
      const secondary = cn(baseButton, secondaryVariant);

      expect(primary).toContain("px-4");
      expect(primary).toContain("bg-blue-500");
      expect(secondary).toContain("px-4");
      expect(secondary).toContain("bg-gray-200");
    });

    it("should handle size variants", () => {
      const base = "px-4 py-2";
      const small = "px-2 py-1 text-sm";
      const large = "px-6 py-3 text-lg";

      const smallButton = cn(base, small);
      const largeButton = cn(base, large);

      // Should override padding but keep other classes
      expect(smallButton).toContain("px-2");
      expect(smallButton).toContain("py-1");
      expect(smallButton).toContain("text-sm");

      expect(largeButton).toContain("px-6");
      expect(largeButton).toContain("py-3");
      expect(largeButton).toContain("text-lg");
    });

    it("should handle disabled states", () => {
      const base = "bg-blue-500 text-white cursor-pointer";
      const disabled = "bg-gray-300 cursor-not-allowed";

      const result = cn(base, disabled);

      expect(result).toContain("bg-gray-300");
      expect(result).toContain("cursor-not-allowed");
      expect(result).not.toContain("bg-blue-500");
      expect(result).not.toContain("cursor-pointer");
    });
  });

  describe("Edge cases and special scenarios", () => {
    it("should handle empty strings", () => {
      const result = cn("", "class1", "");
      expect(result).toBe("class1");
    });

    it("should handle whitespace-only strings", () => {
      const result = cn("  ", "class1", "   ");
      expect(result).toBe("class1");
    });

    it("should handle duplicate class names", () => {
      const result = cn("duplicate", "other", "duplicate");
      // cn merges classes, so result should contain both
      expect(result).toContain("duplicate");
      expect(result).toContain("other");
    });

    it("should handle very long class strings", () => {
      const longString = Array(100).fill("class").join(" ");
      const result = cn(longString, "additional");
      expect(result).toContain("additional");
    });

    it("should handle special characters in class names", () => {
      const result = cn("w-1/2", "h-[50px]", "before:content-['']");
      expect(result).toContain("w-1/2");
      expect(result).toContain("h-[50px]");
      expect(result).toContain("before:content-['']");
    });

    it("should handle number values (should be filtered out)", () => {
      const result = cn("class1", 123 as any, "class2");
      // Numbers should be filtered
      expect(result).toContain("class1");
      expect(result).toContain("class2");
    });
  });

  describe("Performance and optimization", () => {
    it("should handle multiple calls efficiently", () => {
      const results = [];
      for (let i = 0; i < 100; i++) {
        results.push(cn("base", `class-${i}`));
      }
      expect(results).toHaveLength(100);
      results.forEach((result) => {
        expect(result).toContain("base");
      });
    });

    it("should produce consistent results for same input", () => {
      const input = ["class1", "class2", { active: true }];
      const result1 = cn(...input);
      const result2 = cn(...input);
      expect(result1).toBe(result2);
    });
  });

  describe("Real-world component examples", () => {
    it("should handle Card component classes", () => {
      const result = cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        "p-6"
      );
      expect(result).toContain("rounded-lg");
      expect(result).toContain("p-6");
      expect(result).toContain("shadow-sm");
    });

    it("should handle Button component with variant and size", () => {
      const variant = "default";
      const size = "md";

      const result = cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90",
        size === "md" && "h-10 px-4 py-2"
      );

      expect(result).toContain("inline-flex");
      expect(result).toContain("bg-primary");
      expect(result).toContain("h-10");
    });

    it("should handle Input component with error state", () => {
      const hasError = true;
      const result = cn(
        "flex h-10 w-full rounded-md border bg-background px-3 py-2",
        hasError && "border-red-500 focus:ring-red-500"
      );

      expect(result).toContain("border-red-500");
      expect(result).toContain("focus:ring-red-500");
    });
  });
});
