/**
 * PostHog Client Configuration
 * GDP-009: PostHog Identity Stitching
 */

import posthog from 'posthog-js';

export function initPostHog() {
  if (typeof window !== 'undefined') {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

    if (!apiKey) {
      console.warn('[PostHog] API key not configured');
      return;
    }

    posthog.init(apiKey, {
      api_host: host,
      person_profiles: 'identified_only',
      capture_pageview: false, // We'll handle this manually
      capture_pageleave: true,
      autocapture: false, // We'll use explicit tracking
    });
  }
}

/**
 * Identify a user with PostHog
 * This should be called on login/signup with the person_id from the database
 */
export function identifyUser(personId: string, traits?: Record<string, any>) {
  if (typeof window !== 'undefined' && personId) {
    posthog.identify(personId, traits);
  }
}

/**
 * Reset PostHog identity (on logout)
 */
export function resetIdentity() {
  if (typeof window !== 'undefined') {
    posthog.reset();
  }
}

/**
 * Track an event with PostHog
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined') {
    posthog.capture(eventName, properties);
  }
}

/**
 * Get the PostHog distinct ID (before identification)
 */
export function getDistinctId(): string | undefined {
  if (typeof window !== 'undefined') {
    return posthog.get_distinct_id();
  }
  return undefined;
}
