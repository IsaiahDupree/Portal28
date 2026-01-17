/**
 * CSRF Protection for API Routes (PLT-SEC-005)
 *
 * Next.js + Supabase CSRF Protection Strategy:
 *
 * 1. Supabase Auth uses HttpOnly cookies with SameSite=Lax by default
 * 2. Webhook endpoints use cryptographic signature verification (more secure than CSRF tokens)
 * 3. For API routes, we verify the Origin/Referer header matches our domain
 *
 * This provides defense-in-depth CSRF protection:
 * - SameSite cookies prevent cross-site cookie sending
 * - Origin header verification prevents cross-origin requests
 * - Signature verification for webhooks (strongest protection)
 */

import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:2828",
  "http://localhost:2828", // Local development
  "http://127.0.0.1:2828", // Local development alternative
];

/**
 * Verify that the request comes from an allowed origin
 * Prevents CSRF attacks by checking Origin or Referer header
 */
export function verifyOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  // For same-origin requests, browsers may not send Origin header
  // In that case, check the Referer header
  const requestOrigin = origin || (referer ? new URL(referer).origin : null);

  if (!requestOrigin) {
    // No origin/referer header - this is suspicious for POST/PUT/DELETE/PATCH
    // GET requests may not have these headers, so we need to check the method
    const method = req.method;
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      // Safe methods - allow
      return true;
    }
    // Unsafe methods without origin/referer - reject
    return false;
  }

  // Check if the origin is in our allowlist
  return ALLOWED_ORIGINS.some(allowed => {
    try {
      const allowedUrl = new URL(allowed);
      const requestUrl = new URL(requestOrigin);
      return allowedUrl.origin === requestUrl.origin;
    } catch {
      return false;
    }
  });
}

/**
 * CSRF protection middleware for API routes
 * Use this in API routes that modify data (POST, PUT, DELETE, PATCH)
 *
 * @example
 * export async function POST(req: NextRequest) {
 *   const csrfCheck = validateCsrf(req);
 *   if (csrfCheck) return csrfCheck; // Returns error response if CSRF check fails
 *
 *   // Continue with request handling...
 * }
 */
export function validateCsrf(req: NextRequest): NextResponse | null {
  // Skip CSRF check for safe methods
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return null;
  }

  // Verify origin
  if (!verifyOrigin(req)) {
    console.error("CSRF validation failed: Invalid origin", {
      origin: req.headers.get("origin"),
      referer: req.headers.get("referer"),
      method: req.method,
      path: req.nextUrl.pathname
    });

    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 }
    );
  }

  // CSRF check passed
  return null;
}

/**
 * Check if a request is from a webhook (has signature headers)
 * Webhooks use cryptographic signatures which provide stronger CSRF protection
 * than origin verification, so we can skip origin checks for webhooks
 */
export function isWebhookRequest(req: NextRequest): boolean {
  // Check for common webhook signature headers
  return (
    req.headers.has("stripe-signature") ||
    req.headers.has("svix-id") ||
    req.headers.has("svix-signature") ||
    req.headers.has("mux-signature")
  );
}

/**
 * Combined CSRF validation that handles both API routes and webhooks
 *
 * @example
 * export async function POST(req: NextRequest) {
 *   const csrfCheck = validateCsrfOrWebhook(req);
 *   if (csrfCheck) return csrfCheck;
 *
 *   // Continue with request handling...
 * }
 */
export function validateCsrfOrWebhook(req: NextRequest): NextResponse | null {
  // Skip CSRF check for safe methods
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return null;
  }

  // Webhook requests use signature verification instead of CSRF tokens
  if (isWebhookRequest(req)) {
    return null;
  }

  // For non-webhook requests, validate CSRF via origin
  return validateCsrf(req);
}
