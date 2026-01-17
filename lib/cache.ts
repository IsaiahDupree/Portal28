/**
 * Cache utilities for Portal28 Academy
 *
 * Provides functions to invalidate caches when data changes
 */

import { revalidateTag, revalidatePath } from "next/cache";

/**
 * Invalidate course-related caches
 * Call this after creating, updating, or deleting courses
 */
export function invalidateCoursesCache() {
  revalidateTag("courses");
  revalidatePath("/courses");
  revalidatePath("/app/courses");
}

/**
 * Invalidate module and lesson caches
 * Call this after updating course structure
 */
export function invalidateModulesCache() {
  revalidateTag("modules");
  revalidateTag("lessons");
}

/**
 * Invalidate a specific course page
 */
export function invalidateCoursePage(slug: string) {
  revalidatePath(`/courses/${slug}`);
  revalidatePath(`/app/courses/${slug}`);
}

/**
 * Invalidate all public pages
 * Use sparingly - triggers full revalidation
 */
export function invalidateAllPublicPages() {
  revalidatePath("/");
  revalidatePath("/courses");
  revalidatePath("/app");
}

/**
 * Cache configuration constants
 */
export const CACHE_DURATIONS = {
  COURSES: 3600, // 1 hour
  COURSE_DETAIL: 1800, // 30 minutes
  LESSONS: 1800, // 30 minutes
  USER_DATA: 300, // 5 minutes
  STATIC_CONTENT: 86400, // 24 hours
} as const;
