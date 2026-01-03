"use server";

import crypto from "crypto";
import { supabaseServer } from "@/lib/supabase/server";

export async function createCoursePreviewLink(courseId: string) {
  const sb = supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) throw new Error("Unauthorized");

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 days

  const { data, error } = await sb
    .from("course_preview_tokens")
    .insert({
      course_id: courseId,
      token,
      created_by: auth.user.id,
      expires_at: expiresAt,
    })
    .select("token")
    .single();

  if (error) throw new Error(error.message);
  
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${appUrl}/preview/course/${courseId}?token=${data.token}`;
}

export async function validatePreviewToken(courseId: string, token: string) {
  const sb = supabaseServer();
  
  const { data, error } = await sb
    .from("course_preview_tokens")
    .select("id, expires_at")
    .eq("course_id", courseId)
    .eq("token", token)
    .single();

  if (error || !data) return false;
  
  return new Date(data.expires_at) > new Date();
}
