import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/app/*", // Protected app pages
          "/admin/*", // Admin pages
          "/api/*", // Keep API responses out of search crawls; route handlers must enforce access independently.
          "/preview/*", // Preview routes
          "/login",
          "/signup",
        ],
      },
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: [
          "/app/*",
          "/admin/*",
          "/api/*",
          "/preview/*",
          "/login",
          "/signup",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
