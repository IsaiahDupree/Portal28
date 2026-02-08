"use client";

import { useEffect } from "react";
import { tracking } from "@/lib/tracking";

export function AttributionCapture() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const payload = {
      landing_page: url.pathname,
      fbclid: url.searchParams.get("fbclid") || "",
      utm_source: url.searchParams.get("utm_source") || "",
      utm_medium: url.searchParams.get("utm_medium") || "",
      utm_campaign: url.searchParams.get("utm_campaign") || "",
      utm_content: url.searchParams.get("utm_content") || "",
      utm_term: url.searchParams.get("utm_term") || ""
    };

    const hasAnything = Object.values(payload).some((v) => v);
    if (hasAnything) {
      fetch("/api/attribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(() => {});
    }

    // Track landing page view with UTM parameters (TRACK-002)
    const utmParams = {
      utm_source: payload.utm_source,
      utm_medium: payload.utm_medium,
      utm_campaign: payload.utm_campaign,
      utm_content: payload.utm_content,
      utm_term: payload.utm_term,
      fbclid: payload.fbclid,
      landing_page: payload.landing_page,
      referrer: document.referrer,
    };

    tracking.acquisition.landingView(utmParams);
  }, []);

  return null;
}
