import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://portal28.academy";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/app/*", // Protected app pages
          "/admin/*", // Admin pages
          "/api/*", // API routes
          "/preview/*", // Preview routes
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
