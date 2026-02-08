/**
 * Tests for TrendingFormatAnalyzer utility
 *
 * Test Coverage:
 * - Format retrieval and categorization
 * - Format suggestions based on criteria
 * - Timing calculations
 * - Format validation
 */

import { TrendingFormatAnalyzer, TRENDING_FORMATS } from "@/lib/video/trendingFormatAnalyzer";

describe("TrendingFormatAnalyzer", () => {
  describe("Format Retrieval", () => {
    it("retrieves a format by key", () => {
      const format = TrendingFormatAnalyzer.getFormat("day-in-life");

      expect(format).toBeDefined();
      expect(format?.name).toBe("Day in the Life");
    });

    it("returns null for invalid key", () => {
      const format = TrendingFormatAnalyzer.getFormat("non-existent");

      expect(format).toBeNull();
    });

    it("gets all format keys", () => {
      const keys = TrendingFormatAnalyzer.getAllFormatKeys();

      expect(keys).toContain("day-in-life");
      expect(keys).toContain("before-after");
      expect(keys).toContain("tutorial-quick");
      expect(keys.length).toBeGreaterThan(0);
    });
  });

  describe("Category Filtering", () => {
    it("filters formats by educational category", () => {
      const formats = TrendingFormatAnalyzer.getFormatsByCategory("educational");

      expect(formats.length).toBeGreaterThan(0);
      formats.forEach(format => {
        expect(format.category).toBe("educational");
      });
    });

    it("filters formats by product category", () => {
      const formats = TrendingFormatAnalyzer.getFormatsByCategory("product");

      expect(formats.length).toBeGreaterThan(0);
      formats.forEach(format => {
        expect(format.category).toBe("product");
      });
    });

    it("filters formats by storytelling category", () => {
      const formats = TrendingFormatAnalyzer.getFormatsByCategory("storytelling");

      expect(formats.length).toBeGreaterThan(0);
      formats.forEach(format => {
        expect(format.category).toBe("storytelling");
      });
    });

    it("filters formats by entertainment category", () => {
      const formats = TrendingFormatAnalyzer.getFormatsByCategory("entertainment");

      expect(formats.length).toBeGreaterThan(0);
      formats.forEach(format => {
        expect(format.category).toBe("entertainment");
      });
    });
  });

  describe("Platform Filtering", () => {
    it("filters formats by TikTok platform", () => {
      const formats = TrendingFormatAnalyzer.getFormatsByPlatform("TikTok");

      expect(formats.length).toBeGreaterThan(0);
      formats.forEach(format => {
        expect(format.platforms).toContain("TikTok");
      });
    });

    it("filters formats by Instagram Reels platform", () => {
      const formats = TrendingFormatAnalyzer.getFormatsByPlatform("Instagram Reels");

      expect(formats.length).toBeGreaterThan(0);
      formats.forEach(format => {
        expect(format.platforms).toContain("Instagram Reels");
      });
    });

    it("filters formats by YouTube Shorts platform", () => {
      const formats = TrendingFormatAnalyzer.getFormatsByPlatform("YouTube Shorts");

      expect(formats.length).toBeGreaterThan(0);
      formats.forEach(format => {
        expect(format.platforms).toContain("YouTube Shorts");
      });
    });
  });

  describe("Format Suggestions", () => {
    it("suggests formats based on category", () => {
      const formats = TrendingFormatAnalyzer.suggestFormat({
        category: "product"
      });

      expect(formats.length).toBeGreaterThan(0);
      formats.forEach(format => {
        expect(format.category).toBe("product");
      });
    });

    it("suggests formats based on platform", () => {
      const formats = TrendingFormatAnalyzer.suggestFormat({
        platform: "TikTok"
      });

      expect(formats.length).toBeGreaterThan(0);
      formats.forEach(format => {
        expect(format.platforms).toContain("TikTok");
      });
    });

    it("sorts suggestions by duration proximity", () => {
      const formats = TrendingFormatAnalyzer.suggestFormat({
        duration: 40
      });

      expect(formats.length).toBeGreaterThan(0);

      // First result should be closest to 40 seconds
      const firstFormatDiff = Math.abs(formats[0].avgDuration - 40);
      const lastFormatDiff = Math.abs(formats[formats.length - 1].avgDuration - 40);

      expect(firstFormatDiff).toBeLessThanOrEqual(lastFormatDiff);
    });

    it("combines multiple criteria", () => {
      const formats = TrendingFormatAnalyzer.suggestFormat({
        category: "educational",
        platform: "TikTok",
        duration: 45
      });

      expect(formats.length).toBeGreaterThan(0);
      formats.forEach(format => {
        expect(format.category).toBe("educational");
        expect(format.platforms).toContain("TikTok");
      });
    });

    it("returns all formats when no criteria specified", () => {
      const formats = TrendingFormatAnalyzer.suggestFormat({});

      expect(formats.length).toBe(Object.keys(TRENDING_FORMATS).length);
    });
  });

  describe("Timing Calculations", () => {
    it("calculates timing breakdown for a format", () => {
      const format = TrendingFormatAnalyzer.getFormat("tutorial-quick")!;
      const timing = TrendingFormatAnalyzer.calculateTiming(format, 60);

      expect(timing.hook).toBeGreaterThan(0);
      expect(timing.body).toBeGreaterThan(0);
      expect(timing.cta).toBeGreaterThan(0);

      // Total should approximately equal target duration
      const total = timing.hook + timing.body + timing.cta;
      expect(Math.abs(total - 60)).toBeLessThan(3); // Allow small rounding differences
    });

    it("scales timing proportionally", () => {
      const format = TrendingFormatAnalyzer.getFormat("before-after")!;
      const timing30 = TrendingFormatAnalyzer.calculateTiming(format, 30);
      const timing60 = TrendingFormatAnalyzer.calculateTiming(format, 60);

      // 60s timing should be approximately 2x the 30s timing
      expect(timing60.hook).toBeGreaterThan(timing30.hook);
      expect(timing60.body).toBeGreaterThan(timing30.body);
      expect(timing60.cta).toBeGreaterThan(timing30.cta);
    });
  });

  describe("Format Validation", () => {
    it("validates content that matches format requirements", () => {
      const format = TrendingFormatAnalyzer.getFormat("tutorial-quick")!;

      const result = TrendingFormatAnalyzer.validateFormat(format, {
        duration: 45,
        hasHook: true,
        hasCTA: true
      });

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("identifies missing hook", () => {
      const format = TrendingFormatAnalyzer.getFormat("tutorial-quick")!;

      const result = TrendingFormatAnalyzer.validateFormat(format, {
        duration: 45,
        hasHook: false,
        hasCTA: true
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContain("Missing engaging hook");
    });

    it("identifies missing CTA", () => {
      const format = TrendingFormatAnalyzer.getFormat("tutorial-quick")!;

      const result = TrendingFormatAnalyzer.validateFormat(format, {
        duration: 45,
        hasHook: true,
        hasCTA: false
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContain("Missing call to action");
    });

    it("identifies duration issues", () => {
      const format = TrendingFormatAnalyzer.getFormat("tutorial-quick")!;

      const result = TrendingFormatAnalyzer.validateFormat(format, {
        duration: 90, // Way too long for this format (avg: 45s)
        hasHook: true,
        hasCTA: true
      });

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain("Duration");
    });

    it("allows small duration variations", () => {
      const format = TrendingFormatAnalyzer.getFormat("tutorial-quick")!;

      const result = TrendingFormatAnalyzer.validateFormat(format, {
        duration: 50, // Close to avg: 45s
        hasHook: true,
        hasCTA: true
      });

      expect(result.valid).toBe(true);
    });
  });

  describe("Brand Style Recommendations", () => {
    it("recommends formats for casual brand style", () => {
      const formats = TrendingFormatAnalyzer.getRecommendationsForBrand("casual");

      expect(formats.length).toBeGreaterThan(0);
      formats.forEach(format => {
        expect(["storytelling", "educational"]).toContain(format.category);
      });
    });

    it("recommends formats for professional brand style", () => {
      const formats = TrendingFormatAnalyzer.getRecommendationsForBrand("professional");

      expect(formats.length).toBeGreaterThan(0);
      formats.forEach(format => {
        expect(["educational", "product"]).toContain(format.category);
      });
    });

    it("recommends formats for playful brand style", () => {
      const formats = TrendingFormatAnalyzer.getRecommendationsForBrand("playful");

      expect(formats.length).toBeGreaterThan(0);
      formats.forEach(format => {
        expect(["entertainment", "storytelling"]).toContain(format.category);
      });
    });
  });

  describe("Format Data Integrity", () => {
    it("all formats have required properties", () => {
      Object.values(TRENDING_FORMATS).forEach(format => {
        expect(format.name).toBeDefined();
        expect(format.category).toBeDefined();
        expect(format.avgDuration).toBeGreaterThan(0);
        expect(format.keyElements).toBeInstanceOf(Array);
        expect(format.platforms).toBeInstanceOf(Array);
        expect(format.structure).toBeDefined();
        expect(format.structure.hook).toBeGreaterThan(0);
        expect(format.structure.body).toBeGreaterThan(0);
        expect(format.structure.cta).toBeGreaterThan(0);
      });
    });

    it("format structures sum to avgDuration", () => {
      Object.values(TRENDING_FORMATS).forEach(format => {
        const structureTotal = format.structure.hook + format.structure.body + format.structure.cta;
        expect(structureTotal).toBe(format.avgDuration);
      });
    });
  });
});
