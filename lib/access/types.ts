// lib/access/types.ts
// Access control type definitions for Portal28 widget paywalls

export type AccessDecision =
  | { allow: true }
  | {
      allow: false;
      reason: "LOGIN_REQUIRED" | "MEMBERSHIP_REQUIRED" | "COURSE_REQUIRED";
      saleswallType: "membership" | "course" | "hybrid";
      offers: { priceIds?: string[]; courseSlugs?: string[] };
    };

// Simple policy: just a level check
export interface SimplePolicyPublic {
  level: "PUBLIC";
}

export interface SimplePolicyAuth {
  level: "AUTH";
}

// Compound policy rules
export interface MembershipRule {
  level: "MEMBERSHIP";
  tiers: string[]; // e.g. ["member", "vip"]
}

export interface CourseRule {
  level: "COURSE";
  courseSlugs: string[]; // e.g. ["fb-ads-101"]
}

// Compound policy: anyOf means user needs at least one of the rules
export interface CompoundPolicy {
  anyOf: Array<MembershipRule | CourseRule>;
}

// Union type for all policy shapes
export type AccessPolicy = 
  | SimplePolicyPublic 
  | SimplePolicyAuth 
  | CompoundPolicy;

// Widget from database
export interface Widget {
  id: string;
  key: string;
  name: string;
  route: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  status: "active" | "hidden" | "coming_soon";
  access_policy_json: AccessPolicy;
  saleswall_type: "none" | "membership" | "course" | "hybrid";
  saleswall_config: {
    priceIds?: string[];
    courseSlugs?: string[];
  };
  display_order: number;
}

// Saleswall configuration for paywalls
export interface SaleswallConfig {
  priceIds?: string[];
  courseSlugs?: string[];
  message?: string;
}
