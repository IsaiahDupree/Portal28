"use client";

import { useEffect } from "react";
import { tracking } from "@/lib/tracking";

/**
 * Component to track pricing_view events when a pricing/course listing page is viewed
 * Part of TRACK-002: Acquisition Event Tracking
 */
export function PricingViewTracker() {
  useEffect(() => {
    // Track pricing view with current URL context
    const url = new URL(window.location.href);
    tracking.acquisition.pricingView({
      page: url.pathname,
      url: url.href,
      referrer: document.referrer,
    });
  }, []);

  return null;
}
