"use client";

import { useMemo, useState } from "react";
import { track } from "@/lib/meta/pixel";
import { getFbpFbc, getOrCreateAnonSessionId } from "@/lib/meta/cookies";

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

  return (
    <div className="rounded-2xl border border-gray-200 p-5 space-y-3 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">{offer.title}</div>
        {offer.badge && (
          <span className="text-xs px-2 py-1 rounded bg-black text-white font-medium">
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

      <button
        onClick={checkout}
        disabled={loading}
        className="w-full px-4 py-2.5 rounded-lg bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
      >
        {loading ? "Redirecting..." : offer.cta_text || "Continue"}
      </button>
    </div>
  );
}
