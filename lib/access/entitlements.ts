// lib/access/entitlements.ts
// Entitlement checking and access policy evaluation

import { supabaseServer } from "@/lib/supabase/server";
import { AccessDecision, AccessPolicy } from "./types";

/**
 * Get all active entitlements for a user as a Set for fast lookups
 * Format: "scope_type:scope_key" e.g. "course:fb-ads-101" or "membership_tier:member"
 */
export async function getUserEntitlements(userId: string): Promise<Set<string>> {
  const supabase = supabaseServer();
  
  const { data, error } = await supabase
    .from("entitlements")
    .select("scope_type, scope_key, status")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) {
    console.error("Error fetching entitlements:", error);
    throw error;
  }

  const set = new Set<string>();
  for (const row of data ?? []) {
    if (row.scope_type && row.scope_key) {
      set.add(`${row.scope_type}:${row.scope_key}`);
    }
  }
  return set;
}

/**
 * Evaluate an access policy against user's authentication and entitlements
 */
export function evaluatePolicy(args: {
  policy: AccessPolicy;
  isAuthed: boolean;
  entSet: Set<string>;
  saleswallType: "none" | "membership" | "course" | "hybrid";
  saleswallConfig: { priceIds?: string[]; courseSlugs?: string[] };
}): AccessDecision {
  const { policy, isAuthed, entSet, saleswallType, saleswallConfig } = args;

  // PUBLIC - anyone can access
  if ("level" in policy && policy.level === "PUBLIC") {
    return { allow: true };
  }

  // AUTH - just needs to be logged in
  if ("level" in policy && policy.level === "AUTH") {
    if (!isAuthed) {
      return {
        allow: false,
        reason: "LOGIN_REQUIRED",
        saleswallType: "membership",
        offers: {},
      };
    }
    return { allow: true };
  }

  // Compound policy (anyOf) - needs auth first
  if (!isAuthed) {
    return {
      allow: false,
      reason: "LOGIN_REQUIRED",
      saleswallType: saleswallType === "none" ? "membership" : saleswallType,
      offers: saleswallConfig,
    };
  }

  // Check anyOf rules
  const rules = "anyOf" in policy ? policy.anyOf : [];
  
  for (const rule of rules) {
    if (rule.level === "MEMBERSHIP") {
      // Check if user has any of the required membership tiers
      for (const tier of rule.tiers) {
        if (entSet.has(`membership_tier:${tier}`)) {
          return { allow: true };
        }
      }
    }
    
    if (rule.level === "COURSE") {
      // Check if user owns any of the required courses
      for (const slug of rule.courseSlugs) {
        if (entSet.has(`course:${slug}`)) {
          return { allow: true };
        }
      }
    }
  }

  // Deny - determine the best reason based on policy rules
  const hasMembershipRule = rules.some((r) => r.level === "MEMBERSHIP");
  const hasCourseRule = rules.some((r) => r.level === "COURSE");

  if (hasMembershipRule && !hasCourseRule) {
    return {
      allow: false,
      reason: "MEMBERSHIP_REQUIRED",
      saleswallType: "membership",
      offers: { priceIds: saleswallConfig.priceIds ?? [] },
    };
  }

  if (!hasMembershipRule && hasCourseRule) {
    return {
      allow: false,
      reason: "COURSE_REQUIRED",
      saleswallType: "course",
      offers: { courseSlugs: saleswallConfig.courseSlugs ?? [] },
    };
  }

  // Both membership and course rules exist - hybrid wall
  return {
    allow: false,
    reason: "MEMBERSHIP_REQUIRED",
    saleswallType: "hybrid",
    offers: {
      priceIds: saleswallConfig.priceIds ?? [],
      courseSlugs: saleswallConfig.courseSlugs ?? [],
    },
  };
}

/**
 * Grant an entitlement to a user (upsert)
 */
export async function grantEntitlement(
  userId: string,
  scopeType: string,
  scopeKey: string,
  source: string
) {
  const supabase = supabaseServer();
  
  const { error } = await supabase.from("entitlements").upsert(
    {
      user_id: userId,
      scope_type: scopeType,
      scope_key: scopeKey,
      status: "active",
      source,
      starts_at: new Date().toISOString()
    },
    { onConflict: "user_id,scope_type,scope_key" }
  );

  if (error) {
    console.error("Error granting entitlement:", error);
    throw error;
  }
}

/**
 * Revoke an entitlement
 */
export async function revokeEntitlement(
  userId: string,
  scopeType: string,
  scopeKey: string
) {
  const supabase = supabaseServer();
  
  const { error } = await supabase
    .from("entitlements")
    .update({ 
      status: "revoked",
      ends_at: new Date().toISOString()
    })
    .eq("user_id", userId)
    .eq("scope_type", scopeType)
    .eq("scope_key", scopeKey);

  if (error) {
    console.error("Error revoking entitlement:", error);
    throw error;
  }
}
