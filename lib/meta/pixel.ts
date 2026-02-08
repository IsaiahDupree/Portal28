declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Generate a unique event ID for deduplication between Pixel and CAPI
 * GDP-010: Event ID format ensures uniqueness and deduplication
 */
export function generateEventId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
}

/**
 * Track a standard event with Meta Pixel
 * GDP-010: Accepts eventID parameter for deduplication with CAPI
 */
export function track(
  event: string,
  params?: Record<string, unknown>,
  eventID?: string
) {
  if (typeof window !== "undefined" && window.fbq) {
    const trackingParams = params ?? {};

    // GDP-010: Pass eventID to Meta Pixel for deduplication
    if (eventID) {
      window.fbq("track", event, trackingParams, { eventID });
    } else {
      window.fbq("track", event, trackingParams);
    }
  }
}

/**
 * Track a custom event with Meta Pixel
 */
export function trackCustom(
  event: string,
  params?: Record<string, unknown>,
  eventID?: string
) {
  if (typeof window !== "undefined" && window.fbq) {
    const trackingParams = params ?? {};

    if (eventID) {
      window.fbq("trackCustom", event, trackingParams, { eventID });
    } else {
      window.fbq("trackCustom", event, trackingParams);
    }
  }
}
