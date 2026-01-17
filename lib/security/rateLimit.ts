/**
 * Rate Limiting for API Routes (PLT-SEC-006)
 *
 * Simple in-memory rate limiting implementation.
 * For production, consider using Redis or a service like Upstash Rate Limit.
 *
 * This implementation uses a sliding window approach with in-memory storage.
 * It's suitable for single-instance deployments and development.
 *
 * For multi-instance production deployments, use:
 * - Redis with @upstash/ratelimit
 * - Vercel Edge Config
 * - Cloudflare Workers KV
 */

import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limit tracking
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   * @default 100
   */
  maxRequests?: number;

  /**
   * Time window in seconds
   * @default 60 (1 minute)
   */
  windowSeconds?: number;

  /**
   * Custom identifier for the rate limit key
   * If not provided, uses IP address
   */
  identifier?: string;
}

/**
 * Get the client IP address from the request
 */
function getClientIp(req: NextRequest): string {
  // Check Vercel/Cloudflare headers first
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to request IP
  return req.ip || "unknown";
}

/**
 * Check if a request should be rate limited
 *
 * @param req - The Next.js request object
 * @param config - Rate limit configuration
 * @returns null if request is allowed, NextResponse with 429 status if rate limited
 *
 * @example
 * export async function POST(req: NextRequest) {
 *   const rateLimit = checkRateLimit(req, { maxRequests: 10, windowSeconds: 60 });
 *   if (rateLimit) return rateLimit;
 *
 *   // Continue with request handling...
 * }
 */
export function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig = {}
): NextResponse | null {
  const {
    maxRequests = 100,
    windowSeconds = 60,
    identifier
  } = config;

  // Get identifier (custom or IP-based)
  const clientId = identifier || getClientIp(req);
  const key = `${req.nextUrl.pathname}:${clientId}`;

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const resetAt = now + windowMs;

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // No entry or expired - create new entry
    entry = { count: 1, resetAt };
    rateLimitStore.set(key, entry);
    return null; // Allow request
  }

  // Increment counter
  entry.count++;

  // Check if limit exceeded
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

    console.warn("Rate limit exceeded", {
      path: req.nextUrl.pathname,
      clientId,
      count: entry.count,
      maxRequests,
      retryAfter
    });

    return NextResponse.json(
      {
        error: "Too many requests",
        retryAfter
      },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": entry.resetAt.toString()
        }
      }
    );
  }

  // Request allowed - return null
  return null;
}

/**
 * Get remaining rate limit info for a client
 * Useful for returning rate limit headers with successful responses
 */
export function getRateLimitInfo(
  req: NextRequest,
  config: RateLimitConfig = {}
): {
  limit: number;
  remaining: number;
  reset: number;
} {
  const {
    maxRequests = 100,
    identifier
  } = config;

  const clientId = identifier || getClientIp(req);
  const key = `${req.nextUrl.pathname}:${clientId}`;

  const entry = rateLimitStore.get(key);
  const now = Date.now();

  if (!entry || entry.resetAt < now) {
    return {
      limit: maxRequests,
      remaining: maxRequests,
      reset: now + (config.windowSeconds || 60) * 1000
    };
  }

  return {
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    reset: entry.resetAt
  };
}

/**
 * Apply rate limit headers to a response
 *
 * @example
 * const response = NextResponse.json({ data: "..." });
 * return applyRateLimitHeaders(response, req);
 */
export function applyRateLimitHeaders(
  response: NextResponse,
  req: NextRequest,
  config: RateLimitConfig = {}
): NextResponse {
  const info = getRateLimitInfo(req, config);

  response.headers.set("X-RateLimit-Limit", info.limit.toString());
  response.headers.set("X-RateLimit-Remaining", info.remaining.toString());
  response.headers.set("X-RateLimit-Reset", info.reset.toString());

  return response;
}

/**
 * Preset rate limit configurations for common use cases
 */
export const RateLimits = {
  /** Very strict: 10 requests per minute (for sensitive operations like password reset) */
  STRICT: { maxRequests: 10, windowSeconds: 60 },

  /** Standard: 100 requests per minute (for most API endpoints) */
  STANDARD: { maxRequests: 100, windowSeconds: 60 },

  /** Generous: 1000 requests per minute (for high-traffic endpoints like analytics) */
  GENEROUS: { maxRequests: 1000, windowSeconds: 60 },

  /** Per-user: 300 requests per hour (for authenticated user actions) */
  PER_USER: { maxRequests: 300, windowSeconds: 3600 },
} as const;
