"use client";

import { useEffect, useState } from "react";
import { initPostHog } from "./client";
import { hasConsent } from "@/lib/cookies/consent";

/**
 * PostHog Provider Component
 * GDP-009: Initialize PostHog on client-side with consent
 */
export function PostHogProvider() {
  const [shouldLoad, setShouldLoad] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  useEffect(() => {
    // Check if user has consented to analytics cookies
    const checkConsent = () => {
      setShouldLoad(hasConsent("analytics"));
    };

    // Check consent on mount
    checkConsent();

    // Listen for consent changes
    window.addEventListener("consentChanged", checkConsent);

    return () => {
      window.removeEventListener("consentChanged", checkConsent);
    };
  }, []);

  useEffect(() => {
    if (shouldLoad && apiKey) {
      initPostHog();
    }
  }, [shouldLoad, apiKey]);

  return null;
}
