"use client";

import { useEffect } from "react";
import { tracking } from "@/lib/tracking";
import { useSearchParams } from "next/navigation";

interface ActivationTrackerProps {
  userId: string;
  email: string;
}

/**
 * Tracks activation events when user successfully logs in (TRACK-003)
 * - login_success: When user lands on app page after auth
 * - activation_complete: When user completes first session
 */
export function ActivationTracker({ userId, email }: ActivationTrackerProps) {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if this is coming from auth callback
    const isFromAuth = document.referrer.includes('/auth/callback') ||
                       document.referrer.includes('/login') ||
                       document.referrer.includes('/signup');

    // Check if user just signed in (session is less than 1 minute old)
    const sessionKey = `portal28_login_tracked_${userId}`;
    const hasTrackedLogin = sessionStorage.getItem(sessionKey);

    if (isFromAuth && !hasTrackedLogin) {
      // Determine login method from referrer or searchParams
      let method = 'magic-link';
      if (document.referrer.includes('/login')) {
        method = 'password';
      } else if (searchParams.get('provider')) {
        method = searchParams.get('provider') || 'oauth';
      }

      // Track login success (TRACK-003)
      tracking.activation.loginSuccess(method);

      // Identify user
      tracking.identify({
        userId,
        email,
      });

      // Mark login as tracked for this session
      sessionStorage.setItem(sessionKey, Date.now().toString());

      // Check if this is first login (activation_complete)
      const activationKey = `portal28_activation_complete_${userId}`;
      const hasTrackedActivation = localStorage.getItem(activationKey);

      if (!hasTrackedActivation) {
        // Track activation complete (TRACK-003)
        tracking.activation.activationComplete();
        localStorage.setItem(activationKey, Date.now().toString());
      }
    }
  }, [userId, email, searchParams]);

  return null;
}
