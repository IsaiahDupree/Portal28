"use client";

import { useState } from "react";
import { track } from "@/lib/meta/pixel";

type Course = {
  id: string;
  title: string;
  slug: string;
  description?: string;
};

type Props = {
  offerKey: string;
  title: string;
  subtitle?: string;
  priceLabel: string;
  compareAtLabel?: string;
  courses: Course[];
  bullets?: string[];
  badge?: string;
  ctaText?: string;
};

export default function BundleCard({
  offerKey,
  title,
  subtitle,
  priceLabel,
  compareAtLabel,
  courses,
  bullets = [],
  badge,
  ctaText = "Get Bundle",
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);

    const eventId = `p28_${crypto.randomUUID()}`;
    track("InitiateCheckout", {
      content_ids: courses.map((c) => c.id),
      content_type: "bundle",
    });

    const res = await fetch("/api/stripe/offer-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offerKey,
        eventId,
        placementKey: "bundle-page",
      }),
    });

    const data = await res.json();
    if (data?.url) {
      window.location.href = data.url;
    } else {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-black p-6 space-y-5 relative">
      {badge && (
        <span className="absolute -top-3 left-4 bg-black text-white text-xs font-medium px-3 py-1 rounded-full">
          {badge}
        </span>
      )}

      <div>
        <h3 className="text-xl font-bold">{title}</h3>
        {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold">{priceLabel}</span>
        {compareAtLabel && (
          <span className="text-lg text-gray-400 line-through">{compareAtLabel}</span>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Includes:</p>
        <ul className="space-y-1">
          {courses.map((course) => (
            <li key={course.id} className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              {course.title}
            </li>
          ))}
        </ul>
      </div>

      {bullets.length > 0 && (
        <ul className="space-y-2 pt-2 border-t">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <svg className="w-4 h-4 text-black mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              {bullet}
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Redirecting..." : ctaText}
      </button>
    </div>
  );
}
