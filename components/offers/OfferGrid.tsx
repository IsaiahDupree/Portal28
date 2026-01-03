"use client";

import { useEffect } from "react";
import OfferCard from "./OfferCard";
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

export default function OfferGrid({
  offers,
  next,
  placementKey,
}: {
  offers: Offer[];
  next: string;
  placementKey: string;
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
    <div className="grid md:grid-cols-2 gap-4">
      {offers.map((o) => (
        <OfferCard key={o.key} offer={o} next={next} placementKey={placementKey} />
      ))}
    </div>
  );
}
