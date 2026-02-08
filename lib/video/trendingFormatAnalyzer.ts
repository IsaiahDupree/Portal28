/**
 * Utility for analyzing and categorizing trending video formats
 */

export interface TrendingFormat {
  name: string;
  category: "educational" | "entertainment" | "product" | "storytelling";
  avgDuration: number;
  keyElements: string[];
  platforms: string[];
  structure: {
    hook: number;
    body: number;
    cta: number;
  };
}

export const TRENDING_FORMATS: Record<string, TrendingFormat> = {
  "day-in-life": {
    name: "Day in the Life",
    category: "storytelling",
    avgDuration: 45,
    keyElements: ["Morning routine", "Work scenes", "Personal moments", "Authentic feel"],
    platforms: ["TikTok", "Instagram Reels", "YouTube Shorts"],
    structure: { hook: 3, body: 38, cta: 4 }
  },
  "before-after": {
    name: "Before & After",
    category: "product",
    avgDuration: 30,
    keyElements: ["Problem showcase", "Transformation", "Results", "Clear contrast"],
    platforms: ["TikTok", "Instagram Reels"],
    structure: { hook: 2, body: 24, cta: 4 }
  },
  "tutorial-quick": {
    name: "Quick Tutorial",
    category: "educational",
    avgDuration: 45,
    keyElements: ["Problem intro", "Step-by-step", "Final result", "Call to action"],
    platforms: ["TikTok", "Instagram Reels", "YouTube Shorts"],
    structure: { hook: 3, body: 37, cta: 5 }
  },
  "react-video": {
    name: "Reaction Video",
    category: "entertainment",
    avgDuration: 40,
    keyElements: ["Original content", "Genuine reaction", "Commentary", "Personality"],
    platforms: ["TikTok", "YouTube Shorts"],
    structure: { hook: 2, body: 35, cta: 3 }
  },
  "storytelling-hook": {
    name: "Storytelling with Hook",
    category: "storytelling",
    avgDuration: 50,
    keyElements: ["Compelling hook", "Story arc", "Emotional peak", "Resolution"],
    platforms: ["TikTok", "Instagram Reels"],
    structure: { hook: 4, body: 42, cta: 4 }
  },
  "product-demo": {
    name: "Product Demo",
    category: "product",
    avgDuration: 35,
    keyElements: ["Problem highlight", "Solution demo", "Benefits", "CTA"],
    platforms: ["TikTok", "Instagram Reels"],
    structure: { hook: 3, body: 28, cta: 4 }
  }
};

export class TrendingFormatAnalyzer {
  /**
   * Get a trending format by key
   */
  static getFormat(key: string): TrendingFormat | null {
    return TRENDING_FORMATS[key] || null;
  }

  /**
   * Get all formats by category
   */
  static getFormatsByCategory(category: TrendingFormat["category"]): TrendingFormat[] {
    return Object.values(TRENDING_FORMATS).filter(format => format.category === category);
  }

  /**
   * Get all formats by platform
   */
  static getFormatsByPlatform(platform: string): TrendingFormat[] {
    return Object.values(TRENDING_FORMATS).filter(format =>
      format.platforms.includes(platform)
    );
  }

  /**
   * Suggest a format based on video characteristics
   */
  static suggestFormat(params: {
    duration?: number;
    category?: TrendingFormat["category"];
    platform?: string;
  }): TrendingFormat[] {
    let formats = Object.values(TRENDING_FORMATS);

    if (params.category) {
      formats = formats.filter(f => f.category === params.category);
    }

    if (params.platform) {
      formats = formats.filter(f => f.platforms.includes(params.platform));
    }

    if (params.duration) {
      // Sort by closeness to desired duration
      formats = formats.sort((a, b) => {
        const diffA = Math.abs(a.avgDuration - params.duration!);
        const diffB = Math.abs(b.avgDuration - params.duration!);
        return diffA - diffB;
      });
    }

    return formats;
  }

  /**
   * Calculate timing breakdown for a format
   */
  static calculateTiming(format: TrendingFormat, totalDuration: number): {
    hook: number;
    body: number;
    cta: number;
  } {
    const totalStructure = format.structure.hook + format.structure.body + format.structure.cta;
    const scale = totalDuration / totalStructure;

    return {
      hook: Math.round(format.structure.hook * scale),
      body: Math.round(format.structure.body * scale),
      cta: Math.round(format.structure.cta * scale)
    };
  }

  /**
   * Validate if content matches trending format requirements
   */
  static validateFormat(format: TrendingFormat, content: {
    duration: number;
    hasHook: boolean;
    hasCTA: boolean;
  }): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check duration
    const durationDiff = Math.abs(content.duration - format.avgDuration);
    if (durationDiff > 15) {
      issues.push(`Duration should be around ${format.avgDuration}s (current: ${content.duration}s)`);
    }

    // Check required elements
    if (!content.hasHook) {
      issues.push("Missing engaging hook");
    }

    if (!content.hasCTA) {
      issues.push("Missing call to action");
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Get all available format keys
   */
  static getAllFormatKeys(): string[] {
    return Object.keys(TRENDING_FORMATS);
  }

  /**
   * Get format recommendations based on brand style
   */
  static getRecommendationsForBrand(brandStyle: "casual" | "professional" | "playful"): TrendingFormat[] {
    const styleMapping: Record<typeof brandStyle, TrendingFormat["category"][]> = {
      casual: ["storytelling", "educational"],
      professional: ["educational", "product"],
      playful: ["entertainment", "storytelling"]
    };

    const categories = styleMapping[brandStyle];
    return Object.values(TRENDING_FORMATS).filter(format =>
      categories.includes(format.category)
    );
  }
}
