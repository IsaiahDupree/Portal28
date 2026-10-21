import { MetadataRoute } from "next";
import { getPublicCourseCatalog } from "@/lib/db/queries";
import { SITE_URL } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["/", "/about", "/faq", "/privacy", "/terms"];
  const staticPages: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${SITE_URL}${route}`,
    changeFrequency: "monthly",
    priority: route === "/" ? 1 : 0.6,
  }));

  const catalog = await getPublicCourseCatalog();
  if (!catalog.available || catalog.courses.length === 0) return staticPages;

  const coursePages: MetadataRoute.Sitemap = catalog.courses.map((course) => ({
    url: `${SITE_URL}/courses/${course.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    ...staticPages,
    {
      url: `${SITE_URL}/courses`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...coursePages,
  ];
}
