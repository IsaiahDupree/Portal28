"use client";

import { useEffect } from "react";
import Link from "next/link";
import { getOrCreateAnonSessionId } from "@/lib/meta/cookies";

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

export default function OffersSidebarClient({
  offers,
  placementKey,
  title,
  className,
}: {
  offers: Offer[];
  placementKey: string;
  title?: string;
  className?: string;
}) {
  useEffect(() => {
    const anonSessionId = getOrCreateAnonSessionId();
    fetch("/api/offers/impression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        placementKey,
        anonSessionId,
        offerKeys: offers.map((o) => o.key),
      }),
    }).catch(() => {});
  }, [placementKey, offers]);

  if (offers.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {title && (
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      )}
      <div className="space-y-3">
        {offers.map((offer) => (
          <div
            key={offer.key}
            className="rounded-lg border bg-white p-4 hover:shadow-md transition-shadow"
          >
            {offer.badge && (
              <div className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 mb-2">
                {offer.badge}
              </div>
            )}
            <h4 className="font-semibold text-sm mb-1">{offer.title}</h4>
            {offer.subtitle && (
              <p className="text-xs text-gray-600 mb-2">{offer.subtitle}</p>
            )}
            {offer.price_label && (
              <div className="mb-2">
                <span className="font-bold text-lg">{offer.price_label}</span>
                {offer.compare_at_label && (
                  <span className="text-xs text-gray-500 line-through ml-2">
                    {offer.compare_at_label}
                  </span>
                )}
              </div>
            )}
            {offer.bullets && offer.bullets.length > 0 && (
              <ul className="text-xs text-gray-700 space-y-1 mb-3">
                {offer.bullets.slice(0, 3).map((bullet, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={`/pricing?offer=${offer.key}`}
              className="block w-full text-center px-4 py-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              {offer.cta_text}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
