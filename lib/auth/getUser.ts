// lib/auth/getUser.ts
// Helper to get current user from Supabase Auth session

import { supabaseServer } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email?: string;
}

/**
 * Get the current authenticated user, or null if not logged in
 */
export async function getUserOrNull(): Promise<CurrentUser | null> {
  const supabase = supabaseServer();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return {
    id: user.id,
    email: user.email
  };
}

/**
 * Get the current user or throw an error (for protected routes)
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getUserOrNull();
  
  if (!user) {
    throw new Error("Authentication required");
  }
  
  return user;
}

/**
 * Get user's subscription info
 */
export async function getUserSubscription(userId: string) {
  const supabase = supabaseServer();
  
  const { data } = await supabase
    .from("subscriptions")
    .select("tier, status, stripe_customer_id, current_period_end, cancel_at_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  return data;
}

/**
 * Get user's profile role (for admin checks)
 */
export async function getUserRole(userId: string): Promise<string | null> {
  const supabase = supabaseServer();
  
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  
  return data?.role || null;
}
