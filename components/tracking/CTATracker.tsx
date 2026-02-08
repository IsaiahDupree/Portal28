"use client";

import { tracking } from "@/lib/tracking";

/**
 * Track CTA clicks for acquisition tracking (TRACK-002)
 */
export function trackCTAClick(ctaName: string, additionalProps?: Record<string, any>) {
  tracking.acquisition.ctaClick(ctaName, {
    ...additionalProps,
    timestamp: new Date().toISOString(),
  });
}
