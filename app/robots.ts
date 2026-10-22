import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://portal28.academy";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app/", "/admin/", "/preview/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
