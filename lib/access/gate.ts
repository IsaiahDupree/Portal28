// Portal28 Access Gate - The heart of the paywall system
// Evaluates access policies against user entitlements

export type AccessLevel = "PUBLIC" | "AUTH" | "MEMBERSHIP" | "COURSE" | "ROLE_ADMIN";

export interface AccessPolicySimple {
  level: AccessLevel;
  tiers?: string[];        // For MEMBERSHIP: ['member', 'vip']
  courseSlugs?: string[];  // For COURSE: ['fb-ads-101']
  roles?: string[];        // For ROLE_ADMIN: ['admin']
}

export interface AccessPolicyCompound {
  anyOf?: AccessPolicySimple[];
  allOf?: AccessPolicySimple[];
}

export type AccessPolicy = AccessPolicySimple | AccessPolicyCompound;

export interface UserContext {
  isAuthenticated: boolean;
  userId?: string;
  email?: string;
  role?: string;
  tier?: string;                    // 'free', 'member', 'vip'
  subscriptionStatus?: string;      // 'active', 'trialing', 'canceled'
  courseEntitlements: string[];     // Array of course slugs user owns
  widgetEntitlements: string[];     // Array of widget keys user has access to
}

export interface GateResult {
  allowed: boolean;
  reason?: "not_authenticated" | "no_membership" | "wrong_tier" | "no_course" | "no_permission";
  paywallType?: "auth" | "membership" | "course" | "admin";
  requiredTiers?: string[];
  requiredCourses?: string[];
}

/**
 * Evaluate a single access policy rule
 */
function evaluateSimplePolicy(policy: AccessPolicySimple, user: UserContext): GateResult {
  switch (policy.level) {
    case "PUBLIC":
      return { allowed: true };

    case "AUTH":
      if (!user.isAuthenticated) {
        return { allowed: false, reason: "not_authenticated", paywallType: "auth" };
      }
      return { allowed: true };

    case "MEMBERSHIP": {
      if (!user.isAuthenticated) {
        return { allowed: false, reason: "not_authenticated", paywallType: "auth" };
      }
      
      const requiredTiers = policy.tiers || [];
      const userTier = user.tier || "free";
      
      // Check if user's tier is in the required tiers
      if (requiredTiers.length === 0 || requiredTiers.includes(userTier)) {
        // Also check subscription is active
        if (user.subscriptionStatus === "active" || user.subscriptionStatus === "trialing") {
          return { allowed: true };
        }
      }
      
      return {
        allowed: false,
        reason: "no_membership",
        paywallType: "membership",
        requiredTiers
      };
    }

    case "COURSE": {
      if (!user.isAuthenticated) {
        return { allowed: false, reason: "not_authenticated", paywallType: "auth" };
      }
      
      const requiredCourses = policy.courseSlugs || [];
      const userCourses = user.courseEntitlements || [];
      
      // Check if user owns any of the required courses
      const hasAccess = requiredCourses.some(slug => userCourses.includes(slug));
      
      if (hasAccess) {
        return { allowed: true };
      }
      
      return {
        allowed: false,
        reason: "no_course",
        paywallType: "course",
        requiredCourses
      };
    }

    case "ROLE_ADMIN": {
      if (!user.isAuthenticated) {
        return { allowed: false, reason: "not_authenticated", paywallType: "auth" };
      }
      
      const requiredRoles = policy.roles || ["admin"];
      if (requiredRoles.includes(user.role || "")) {
        return { allowed: true };
      }
      
      return { allowed: false, reason: "no_permission", paywallType: "admin" };
    }

    default:
      return { allowed: false, reason: "no_permission" };
  }
}

/**
 * Evaluate an access policy (simple or compound)
 */
export function evaluateAccessPolicy(policy: AccessPolicy, user: UserContext): GateResult {
  // Check if it's a compound policy
  if ("anyOf" in policy && policy.anyOf) {
    // ANY of the rules must pass
    let lastDenial: GateResult | null = null;
    
    for (const rule of policy.anyOf) {
      const result = evaluateSimplePolicy(rule, user);
      if (result.allowed) {
        return result;
      }
      lastDenial = result;
    }
    
    // Return the last denial with combined requirements
    if (lastDenial) {
      // Combine all required tiers/courses from all rules
      const allTiers = policy.anyOf
        .filter(r => r.level === "MEMBERSHIP" && r.tiers)
        .flatMap(r => r.tiers || []);
      const allCourses = policy.anyOf
        .filter(r => r.level === "COURSE" && r.courseSlugs)
        .flatMap(r => r.courseSlugs || []);
      
      return {
        ...lastDenial,
        requiredTiers: allTiers.length > 0 ? Array.from(new Set(allTiers)) : lastDenial.requiredTiers,
        requiredCourses: allCourses.length > 0 ? Array.from(new Set(allCourses)) : lastDenial.requiredCourses
      };
    }
  }
  
  if ("allOf" in policy && policy.allOf) {
    // ALL rules must pass
    for (const rule of policy.allOf) {
      const result = evaluateSimplePolicy(rule, user);
      if (!result.allowed) {
        return result;
      }
    }
    return { allowed: true };
  }
  
  // Simple policy
  return evaluateSimplePolicy(policy as AccessPolicySimple, user);
}

/**
 * Check if a widget is accessible to a user
 */
export function checkWidgetAccess(
  widgetPolicy: AccessPolicy,
  user: UserContext
): GateResult {
  return evaluateAccessPolicy(widgetPolicy, user);
}

/**
 * Get display info for a paywall
 */
export function getPaywallInfo(result: GateResult): {
  title: string;
  message: string;
  ctaText: string;
  ctaType: "login" | "upgrade" | "purchase";
} {
  switch (result.paywallType) {
    case "auth":
      return {
        title: "Sign in required",
        message: "Create a free account to access this content.",
        ctaText: "Sign In",
        ctaType: "login"
      };
    
    case "membership":
      return {
        title: "Member-only content",
        message: "Upgrade to unlock this feature and get full access to the Portal28 vault.",
        ctaText: "Become a Member",
        ctaType: "upgrade"
      };
    
    case "course":
      return {
        title: "Course access required",
        message: "Purchase the course to unlock this content.",
        ctaText: "Get the Course",
        ctaType: "purchase"
      };
    
    case "admin":
      return {
        title: "Admin only",
        message: "This area is restricted to administrators.",
        ctaText: "Go Back",
        ctaType: "login"
      };
    
    default:
      return {
        title: "Access denied",
        message: "You don't have permission to view this content.",
        ctaText: "Go Back",
        ctaType: "login"
      };
  }
}

/**
 * Build user context from session data
 */
export function buildUserContext(data: {
  user?: { id: string; email?: string } | null;
  profile?: { role?: string } | null;
  subscription?: { tier: string; status: string } | null;
  entitlements?: Array<{ scope_type: string; scope_id: string }>;
}): UserContext {
  const { user, profile, subscription, entitlements = [] } = data;
  
  return {
    isAuthenticated: !!user,
    userId: user?.id,
    email: user?.email,
    role: profile?.role,
    tier: subscription?.tier || "free",
    subscriptionStatus: subscription?.status,
    courseEntitlements: entitlements
      .filter(e => e.scope_type === "course")
      .map(e => e.scope_id),
    widgetEntitlements: entitlements
      .filter(e => e.scope_type === "widget")
      .map(e => e.scope_id)
  };
}
