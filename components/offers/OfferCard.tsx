"use client";

import { useMemo, useState, useEffect } from "react";
import { track } from "@/lib/meta/pixel";
import { getFbpFbc, getOrCreateAnonSessionId } from "@/lib/meta/cookies";
import CountdownTimer from "@/components/ui/CountdownTimer";

type Offer = {
  key: string;
  kind: string;
  title: string;
  subtitle: string | null;
  badge: string | null;
  cta_text: string;
  price_label: string | null;
  compare_at_label: string | null;
  bullets: string[];
  starts_at?: string | null;
  ends_at?: string | null;
  show_countdown?: boolean;
};

export default function OfferCard({
  offer,
  next,
  placementKey,
}: {
  offer: Offer;
  next: string;
  placementKey: string;
}) {
  const eventId = useMemo(() => crypto.randomUUID(), []);
  const [loading, setLoading] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // Check if offer is expired
  useEffect(() => {
    if (offer.ends_at) {
      const checkExpiration = () => {
        const now = new Date();
        const endsAt = new Date(offer.ends_at!);
        if (endsAt <= now) {
          setIsExpired(true);
        }
      };

      checkExpiration();
      const interval = setInterval(checkExpiration, 1000);

      return () => clearInterval(interval);
    }
  }, [offer.ends_at]);

  async function checkout() {
    setLoading(true);

    track("InitiateCheckout", { content_name: offer.title, content_category: offer.kind });

    const { fbp, fbc } = getFbpFbc();
    const anonSessionId = getOrCreateAnonSessionId();

    try {
      const res = await fetch("/api/stripe/offer-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerKey: offer.key,
          eventId,
          next,
          placementKey,
          anonSessionId,
          meta: { fbp, fbc },
        }),
      });

      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  // Don't render if expired
  if (isExpired) {
    return null;
  }

  // Calculate urgency for styling
  const isEndingSoon = offer.ends_at
    ? new Date(offer.ends_at).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000
    : false;

  return (
    <div className={`rounded-2xl border p-5 space-y-3 bg-white hover:shadow-md transition-shadow ${
      isEndingSoon ? "border-red-300 shadow-sm" : "border-gray-200"
    }`}>
      {/* Countdown Timer */}
      {offer.show_countdown && offer.ends_at && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-red-700 mb-2">
            ⏰ Offer Ends In:
          </div>
          <CountdownTimer
            targetDate={offer.ends_at}
            size="small"
            compact={false}
            onExpire={() => setIsExpired(true)}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">{offer.title}</div>
        {offer.badge && (
          <span className={`text-xs px-2 py-1 rounded font-medium ${
            isEndingSoon
              ? "bg-red-600 text-white"
              : "bg-black text-white"
          }`}>
            {offer.badge}
          </span>
        )}
      </div>

      {offer.subtitle && (
        <div className="text-sm text-gray-600">{offer.subtitle}</div>
      )}

      <div className="flex items-baseline gap-2">
        {offer.price_label && (
          <div className="text-xl font-semibold">{offer.price_label}</div>
        )}
        {offer.compare_at_label && (
          <div className="text-sm text-gray-500 line-through">
            {offer.compare_at_label}
          </div>
        )}
      </div>

      {Array.isArray(offer.bullets) && offer.bullets.length > 0 && (
        <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
          {offer.bullets.map((b: string, i: number) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}

      {/* Urgency Message */}
      {isEndingSoon && !offer.show_countdown && (
        <div className="text-sm text-red-600 font-medium flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          Ending soon!
        </div>
      )}

      <button
        onClick={checkout}
        disabled={loading || isExpired}
        className="w-full px-4 py-2.5 rounded-lg bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
      >
        {loading ? "Redirecting..." : offer.cta_text || "Continue"}
      </button>
    </div>
  );
}
