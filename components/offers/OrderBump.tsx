"use client";

import { useState } from "react";

type Props = {
  bumpOfferKey: string;
  headline: string;
  description?: string;
  priceLabel: string;
  originalPriceLabel?: string;
  onAdd: (offerKey: string) => void;
  onRemove: (offerKey: string) => void;
};

export default function OrderBump({
  bumpOfferKey,
  headline,
  description,
  priceLabel,
  originalPriceLabel,
  onAdd,
  onRemove,
}: Props) {
  const [added, setAdded] = useState(false);

  function toggle() {
    if (added) {
      onRemove(bumpOfferKey);
      setAdded(false);
    } else {
      onAdd(bumpOfferKey);
      setAdded(true);
    }
  }

  return (
    <div
      className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${
        added ? "border-black bg-gray-50" : "border-dashed border-gray-300 hover:border-gray-400"
      }`}
      onClick={toggle}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
            added ? "bg-black border-black" : "border-gray-400"
          }`}
        >
          {added && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
              One-Time Offer
            </span>
          </div>
          <h4 className="font-semibold mt-1">{headline}</h4>
          {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}

          <div className="flex items-center gap-2 mt-2">
            <span className="font-bold">{priceLabel}</span>
            {originalPriceLabel && (
              <span className="text-sm text-gray-400 line-through">{originalPriceLabel}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
