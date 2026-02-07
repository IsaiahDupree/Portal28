"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";
import {
  hasSeenConsentBanner,
  acceptAllCookies,
  rejectOptionalCookies,
  setConsentPreferences,
  type ConsentPreferences,
} from "@/lib/cookies/consent";

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Show banner if user hasn't consented yet
    if (!hasSeenConsentBanner()) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    acceptAllCookies();
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    rejectOptionalCookies();
    setIsVisible(false);
  };

  const handleSaveCustom = () => {
    setConsentPreferences(preferences);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    // Treat dismiss as reject (conservative approach)
    rejectOptionalCookies();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t">
      <div className="container max-w-4xl mx-auto">
        <Card className="relative">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-6">
            {!showCustomize ? (
              <>
                {/* Simple view */}
                <div className="flex items-start gap-4">
                  <Cookie className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">
                      We value your privacy
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      We use cookies to enhance your browsing experience, serve
                      personalized ads or content, and analyze our traffic. By
                      clicking "Accept All", you consent to our use of cookies.{" "}
                      <Link
                        href="/legal/cookies"
                        className="underline hover:text-foreground"
                      >
                        Cookie Policy
                      </Link>
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button onClick={handleAcceptAll} size="sm">
                        Accept All
                      </Button>
                      <Button
                        onClick={handleRejectAll}
                        variant="outline"
                        size="sm"
                      >
                        Reject All
                      </Button>
                      <Button
                        onClick={() => setShowCustomize(true)}
                        variant="ghost"
                        size="sm"
                      >
                        Customize
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Customize view */}
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <Cookie className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">
                        Customize Cookie Preferences
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Choose which cookies you want to accept. You can change
                        these settings at any time.
                      </p>
                    </div>
                  </div>

                  {/* Cookie categories */}
                  <div className="space-y-3 pl-10">
                    {/* Necessary cookies - always on */}
                    <div className="flex items-start justify-between p-3 border rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <div className="font-medium text-sm mb-1">
                          Necessary Cookies
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Required for the website to function properly. Cannot
                          be disabled.
                        </p>
                      </div>
                      <div className="ml-4">
                        <div className="text-xs font-medium text-muted-foreground">
                          Always Active
                        </div>
                      </div>
                    </div>

                    {/* Analytics cookies */}
                    <div className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm mb-1">
                          Analytics Cookies
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Help us understand how visitors interact with our
                          website.
                        </p>
                      </div>
                      <div className="ml-4">
                        <input
                          type="checkbox"
                          checked={preferences.analytics}
                          onChange={(e) =>
                            setPreferences({
                              ...preferences,
                              analytics: e.target.checked,
                            })
                          }
                          className="w-4 h-4 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Marketing cookies */}
                    <div className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm mb-1">
                          Marketing Cookies
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Used to track visitors across websites and display
                          relevant ads.
                        </p>
                      </div>
                      <div className="ml-4">
                        <input
                          type="checkbox"
                          checked={preferences.marketing}
                          onChange={(e) =>
                            setPreferences({
                              ...preferences,
                              marketing: e.target.checked,
                            })
                          }
                          className="w-4 h-4 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3 pl-10">
                    <Button onClick={handleSaveCustom} size="sm">
                      Save Preferences
                    </Button>
                    <Button
                      onClick={() => setShowCustomize(false)}
                      variant="ghost"
                      size="sm"
                    >
                      Back
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
