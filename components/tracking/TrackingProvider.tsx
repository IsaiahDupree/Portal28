'use client';

/**
 * TRACK-008: User Identification Provider
 *
 * Automatically identifies users in the tracking system when logged in.
 */

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { tracking } from '@/lib/tracking';

interface TrackingProviderProps {
  children: React.ReactNode;
}

export function TrackingProvider({ children }: TrackingProviderProps) {
  const [hasIdentified, setHasIdentified] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function identifyUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && !hasIdentified) {
        // Get user role from metadata or database
        const role = user.user_metadata?.role || 'student';

        // Get subscription/plan info if exists
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('tier, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        // Identify user in tracking system
        tracking.identify({
          userId: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email?.split('@')[0],
          role,
          metadata: {
            subscription_tier: subscription?.tier || null,
            subscription_status: subscription?.status || null,
            created_at: user.created_at,
          },
        });

        setHasIdentified(true);
      }
    }

    identifyUser();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const user = session.user;
        const role = user.user_metadata?.role || 'student';

        const { data: subscriptionData } = await supabase
          .from('subscriptions')
          .select('tier, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        tracking.identify({
          userId: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email?.split('@')[0],
          role,
          metadata: {
            subscription_tier: subscriptionData?.tier || null,
            subscription_status: subscriptionData?.status || null,
            created_at: user.created_at,
          },
        });

        setHasIdentified(true);
      } else if (event === 'SIGNED_OUT') {
        setHasIdentified(false);
        tracking.reset(); // GDP-009: Reset tracking SDK and PostHog on logout
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [hasIdentified]);

  return <>{children}</>;
}
