"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

export interface PreviewToken {
  id: string;
  course_id: string;
  token: string;
  created_by: string;
  expires_at: string;
  created_at: string;
}

/**
 * Generate a preview token for a course
 * Returns the full preview URL
 */
export async function generatePreviewToken(
  courseId: string,
  expiresInDays: number = 7
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = supabaseServer();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }

  // Generate secure random token
  const token = randomBytes(32).toString("hex");

  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  // Insert token into database
  const { data, error } = await supabase
    .from("course_preview_tokens")
    .insert({
      course_id: courseId,
      token,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating preview token:", error);
    return { success: false, error: "Failed to create preview token" };
  }

  // Build preview URL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:2828";
  const previewUrl = `${baseUrl}/preview/course/${courseId}?token=${token}`;

  return { success: true, url: previewUrl };
}

/**
 * Get all preview tokens for a course
 */
export async function getCoursePreviewTokens(
  courseId: string
): Promise<PreviewToken[]> {
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("course_preview_tokens")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching preview tokens:", error);
    return [];
  }

  return data || [];
}

/**
 * Delete a preview token
 */
export async function deletePreviewToken(
  tokenId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("course_preview_tokens")
    .delete()
    .eq("id", tokenId);

  if (error) {
    console.error("Error deleting preview token:", error);
    return { success: false, error: "Failed to delete token" };
  }

  return { success: true };
}
