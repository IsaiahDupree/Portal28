/**
 * Meta Pixel Advanced Match Parameters
 * META-008: Conversion Optimization
 *
 * Advanced matching improves attribution by sending additional user data
 * to Meta. This helps Meta better match website visitors to their Facebook profiles,
 * improving conversion tracking and optimization.
 *
 * Supported parameters:
 * - em (email)
 * - fn (first name)
 * - ln (last name)
 * - ph (phone)
 * - ct (city)
 * - st (state)
 * - zp (zip code)
 * - country (country code)
 *
 * All PII data is automatically hashed by Meta's Pixel SDK.
 */

import crypto from "crypto";

export interface AdvancedMatchParams {
  em?: string; // email
  fn?: string; // first name
  ln?: string; // last name
  ph?: string; // phone
  ct?: string; // city
  st?: string; // state
  zp?: string; // zip code
  country?: string; // country code (e.g., 'us')
}

/**
 * Normalize and hash PII for advanced matching
 * Meta requires specific normalization rules before hashing
 */
function normalizeAndHash(value: string | undefined): string | undefined {
  if (!value) return undefined;

  // Normalize: trim, lowercase, remove spaces
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "");

  // Hash with SHA256
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Normalize phone number
 * Remove all non-numeric characters except leading +
 */
function normalizePhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined;

  // Keep only digits and leading +
  let normalized = phone.replace(/[^\d+]/g, "");

  // If starts with +, keep it; otherwise remove all +
  if (!normalized.startsWith("+")) {
    normalized = normalized.replace(/\+/g, "");
  }

  return normalized;
}

/**
 * Prepare advanced match parameters for Meta Pixel
 * Automatically normalizes and hashes PII according to Meta requirements
 */
export function prepareAdvancedMatchParams(
  params: AdvancedMatchParams
): Record<string, string> {
  const prepared: Record<string, string> = {};

  // Email
  if (params.em) {
    const hashed = normalizeAndHash(params.em);
    if (hashed) prepared.em = hashed;
  }

  // First name
  if (params.fn) {
    const hashed = normalizeAndHash(params.fn);
    if (hashed) prepared.fn = hashed;
  }

  // Last name
  if (params.ln) {
    const hashed = normalizeAndHash(params.ln);
    if (hashed) prepared.ln = hashed;
  }

  // Phone - normalize first, then hash
  if (params.ph) {
    const normalized = normalizePhone(params.ph);
    if (normalized) {
      const hashed = normalizeAndHash(normalized);
      if (hashed) prepared.ph = hashed;
    }
  }

  // City
  if (params.ct) {
    const hashed = normalizeAndHash(params.ct);
    if (hashed) prepared.ct = hashed;
  }

  // State (2-letter code)
  if (params.st) {
    const hashed = normalizeAndHash(params.st);
    if (hashed) prepared.st = hashed;
  }

  // Zip code (numbers only, first 5 digits in US)
  if (params.zp) {
    const zipOnly = params.zp.replace(/[^\d]/g, "").substring(0, 5);
    const hashed = normalizeAndHash(zipOnly);
    if (hashed) prepared.zp = hashed;
  }

  // Country code (2-letter ISO code)
  if (params.country) {
    const hashed = normalizeAndHash(params.country);
    if (hashed) prepared.country = hashed;
  }

  return prepared;
}

/**
 * Initialize Meta Pixel with advanced matching
 * Call this on page load after user authentication
 */
export function initPixelWithAdvancedMatch(params: AdvancedMatchParams) {
  if (typeof window === "undefined" || !window.fbq) return;

  const prepared = prepareAdvancedMatchParams(params);

  // Initialize pixel with advanced match parameters
  window.fbq("init", process.env.NEXT_PUBLIC_META_PIXEL_ID!, prepared);
}

/**
 * Extract advanced match params from user data
 * Use this to prepare params from your user object
 */
export function extractAdvancedMatchFromUser(user: {
  email?: string;
  name?: string;
  phone?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}): AdvancedMatchParams {
  const params: AdvancedMatchParams = {};

  if (user.email) params.em = user.email;

  // Split name into first and last
  if (user.name) {
    const parts = user.name.trim().split(/\s+/);
    if (parts.length > 0) params.fn = parts[0];
    if (parts.length > 1) params.ln = parts[parts.length - 1];
  }

  if (user.phone) params.ph = user.phone;
  if (user.city) params.ct = user.city;
  if (user.state) params.st = user.state;
  if (user.zip) params.zp = user.zip;
  if (user.country) params.country = user.country;

  return params;
}
