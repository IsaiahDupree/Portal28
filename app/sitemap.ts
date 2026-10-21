import { MetadataRoute } from "next";
import { getPublishedCourses } from "@/lib/db/queries";
import { SITE_URL } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["/", "/about", "/courses", "/faq", "/privacy", "/terms"];
  const staticPages: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${SITE_URL}${route}`,
    changeFrequency: route === "/courses" ? "daily" : "monthly",
    priority: route === "/" ? 1 : route === "/courses" ? 0.9 : 0.6,
  }));

  // Dynamic course pages
  try {
    const courses = await getPublishedCourses();
    const coursePages: MetadataRoute.Sitemap = courses.map((course) => ({
      url: `${SITE_URL}/courses/${course.slug}`,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [...staticPages, ...coursePages];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return staticPages;
  }
}
