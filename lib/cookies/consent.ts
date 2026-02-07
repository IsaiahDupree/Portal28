/**
 * Cookie Consent Management
 * GDPR-compliant cookie consent utilities
 */

const CONSENT_COOKIE_NAME = "portal28_cookie_consent";
const CONSENT_COOKIE_EXPIRY_DAYS = 365;

export type ConsentPreferences = {
  necessary: boolean; // Always true
  analytics: boolean;
  marketing: boolean;
};

export const DEFAULT_CONSENT: ConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

/**
 * Get current consent preferences from cookie
 */
export function getConsentPreferences(): ConsentPreferences | null {
  if (typeof window === "undefined") return null;

  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CONSENT_COOKIE_NAME}=`));

  if (!cookie) return null;

  try {
    const value = cookie.split("=")[1];
    const decoded = decodeURIComponent(value);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Save consent preferences to cookie
 */
export function setConsentPreferences(
  preferences: ConsentPreferences
): void {
  if (typeof window === "undefined") return;

  const expires = new Date();
  expires.setDate(expires.getDate() + CONSENT_COOKIE_EXPIRY_DAYS);

  const value = encodeURIComponent(JSON.stringify(preferences));
  document.cookie = `${CONSENT_COOKIE_NAME}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

  // Trigger custom event for listeners (e.g., analytics scripts)
  window.dispatchEvent(
    new CustomEvent("consentChanged", { detail: preferences })
  );
}

/**
 * Check if user has given consent for a specific category
 */
export function hasConsent(category: keyof ConsentPreferences): boolean {
  const preferences = getConsentPreferences();

  if (!preferences) {
    return false; // No consent given yet
  }

  return preferences[category] === true;
}

/**
 * Check if user has already seen the consent banner
 */
export function hasSeenConsentBanner(): boolean {
  return getConsentPreferences() !== null;
}

/**
 * Accept all cookies
 */
export function acceptAllCookies(): void {
  setConsentPreferences({
    necessary: true,
    analytics: true,
    marketing: true,
  });
}

/**
 * Reject optional cookies (keep only necessary)
 */
export function rejectOptionalCookies(): void {
  setConsentPreferences({
    necessary: true,
    analytics: false,
    marketing: false,
  });
}

/**
 * Reset consent (remove cookie)
 */
export function resetConsent(): void {
  if (typeof window === "undefined") return;

  document.cookie = `${CONSENT_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}
