import { MetadataRoute } from "next";
import { getPublishedCourses } from "@/lib/db/queries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://portal28.academy";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/courses`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Dynamic course pages
  try {
    const courses = await getPublishedCourses();
    const coursePages: MetadataRoute.Sitemap = courses.map((course) => ({
      url: `${baseUrl}/courses/${course.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [...staticPages, ...coursePages];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return staticPages;
  }
}
