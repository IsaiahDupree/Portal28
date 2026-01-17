/**
 * Structured Data (JSON-LD) utilities for SEO
 * Helps search engines understand the content better
 */

import { Course } from "@/types/supabase";

/**
 * Generate Organization structured data
 */
export function generateOrganizationSchema() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://portal28.academy";

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Portal28 Academy",
    alternateName: "Portal 28",
    url: baseUrl,
    description:
      "Portal 28 is a private clubhouse for founders, creators, and CEOs. Master brand strategy, storytelling, and AI-powered content creation.",
    founder: {
      "@type": "Person",
      name: "Sarah Ashley",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      email: "hello@portal28.academy",
    },
  };
}

/**
 * Generate Course structured data
 */
export function generateCourseSchema(course: {
  title: string;
  description: string;
  slug: string;
  price?: number;
}) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://portal28.academy";

  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description,
    url: `${baseUrl}/courses/${course.slug}`,
    provider: {
      "@type": "Organization",
      name: "Portal28 Academy",
      url: baseUrl,
    },
    ...(course.price
      ? {
          offers: {
            "@type": "Offer",
            price: course.price,
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
  };
}

/**
 * Generate WebSite structured data with search action
 */
export function generateWebSiteSchema() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://portal28.academy";

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Portal28 Academy",
    url: baseUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Generate BreadcrumbList structured data
 */
export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://portal28.academy";

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`,
    })),
  };
}

/**
 * Helper to serialize JSON-LD data for script tag
 */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data);
}
