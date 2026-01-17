/**
 * Tests for SEO functionality (feat-051)
 * Test IDs: PLT-SEO-001, PLT-SEO-002, PLT-SEO-003
 */

import {
  generateOrganizationSchema,
  generateCourseSchema,
  generateWebSiteSchema,
  generateBreadcrumbSchema,
} from "@/lib/seo/structured-data";

describe("SEO & Performance (feat-051)", () => {
  describe("PLT-SEO-001: Meta tags on all pages", () => {
    it("should generate organization schema", () => {
      const schema = generateOrganizationSchema();

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("Organization");
      expect(schema.name).toBe("Portal28 Academy");
      expect(schema.founder).toEqual({
        "@type": "Person",
        name: "Sarah Ashley",
      });
    });

    it("should include contact information", () => {
      const schema = generateOrganizationSchema();

      expect(schema.contactPoint).toBeDefined();
      expect(schema.contactPoint["@type"]).toBe("ContactPoint");
      expect(schema.contactPoint.email).toBe("hello@portal28.academy");
    });
  });

  describe("PLT-SEO-002: Sitemap generation", () => {
    it("should generate website schema with search action", () => {
      const schema = generateWebSiteSchema();

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("WebSite");
      expect(schema.name).toBe("Portal28 Academy");
      expect(schema.potentialAction).toBeDefined();
      expect(schema.potentialAction["@type"]).toBe("SearchAction");
    });

    it("should include search URL template", () => {
      const schema = generateWebSiteSchema();

      expect(schema.potentialAction.target.urlTemplate).toContain("/search?q=");
      expect(schema.potentialAction["query-input"]).toBe(
        "required name=search_term_string"
      );
    });
  });

  describe("PLT-SEO-003: Course structured data", () => {
    it("should generate course schema with required fields", () => {
      const course = {
        title: "Brand Strategy Fundamentals",
        description: "Learn the fundamentals of brand strategy",
        slug: "brand-strategy",
      };

      const schema = generateCourseSchema(course);

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("Course");
      expect(schema.name).toBe(course.title);
      expect(schema.description).toBe(course.description);
      expect(schema.url).toContain(`/courses/${course.slug}`);
    });

    it("should include provider information", () => {
      const course = {
        title: "Test Course",
        description: "Test Description",
        slug: "test-course",
      };

      const schema = generateCourseSchema(course);

      expect(schema.provider).toBeDefined();
      expect(schema.provider["@type"]).toBe("Organization");
      expect(schema.provider.name).toBe("Portal28 Academy");
    });

    it("should include price when provided", () => {
      const course = {
        title: "Test Course",
        description: "Test Description",
        slug: "test-course",
        price: 99.99,
      };

      const schema = generateCourseSchema(course);

      expect(schema.offers).toBeDefined();
      expect(schema.offers["@type"]).toBe("Offer");
      expect(schema.offers.price).toBe(99.99);
      expect(schema.offers.priceCurrency).toBe("USD");
      expect(schema.offers.availability).toBe("https://schema.org/InStock");
    });

    it("should not include price when not provided", () => {
      const course = {
        title: "Test Course",
        description: "Test Description",
        slug: "test-course",
      };

      const schema = generateCourseSchema(course);

      expect(schema.offers).toBeUndefined();
    });
  });

  describe("Breadcrumb Navigation", () => {
    it("should generate breadcrumb schema", () => {
      const items = [
        { name: "Home", url: "/" },
        { name: "Courses", url: "/courses" },
        { name: "Brand Strategy", url: "/courses/brand-strategy" },
      ];

      const schema = generateBreadcrumbSchema(items);

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("BreadcrumbList");
      expect(schema.itemListElement).toHaveLength(3);
    });

    it("should order breadcrumb items correctly", () => {
      const items = [
        { name: "Home", url: "/" },
        { name: "Courses", url: "/courses" },
      ];

      const schema = generateBreadcrumbSchema(items);

      expect(schema.itemListElement[0].position).toBe(1);
      expect(schema.itemListElement[0].name).toBe("Home");
      expect(schema.itemListElement[1].position).toBe(2);
      expect(schema.itemListElement[1].name).toBe("Courses");
    });
  });

  describe("URL Handling", () => {
    it("should use configured site URL", () => {
      const originalUrl = process.env.NEXT_PUBLIC_SITE_URL;
      process.env.NEXT_PUBLIC_SITE_URL = "https://test.portal28.academy";

      const schema = generateOrganizationSchema();
      expect(schema.url).toBe("https://test.portal28.academy");

      // Restore
      if (originalUrl) {
        process.env.NEXT_PUBLIC_SITE_URL = originalUrl;
      } else {
        delete process.env.NEXT_PUBLIC_SITE_URL;
      }
    });

    it("should fallback to default URL when not configured", () => {
      const originalUrl = process.env.NEXT_PUBLIC_SITE_URL;
      delete process.env.NEXT_PUBLIC_SITE_URL;

      const schema = generateOrganizationSchema();
      expect(schema.url).toBe("https://portal28.academy");

      // Restore
      if (originalUrl) {
        process.env.NEXT_PUBLIC_SITE_URL = originalUrl;
      }
    });
  });
});
