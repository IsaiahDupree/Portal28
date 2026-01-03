"use client";

import { useState, useEffect } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  upsellOfferKey: string;
  headline: string;
  description?: string;
  priceLabel: string;
  originalPriceLabel?: string;
  expiresMinutes?: number;
  onAccept: () => void;
};

export default function UpsellModal({
  isOpen,
  onClose,
  upsellOfferKey,
  headline,
  description,
  priceLabel,
  originalPriceLabel,
  expiresMinutes = 30,
  onAccept,
}: Props) {
  const [timeLeft, setTimeLeft] = useState(expiresMinutes * 60);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  async function handleAccept() {
    setLoading(true);
    onAccept();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl max-w-md w-full mx-4 p-6 space-y-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-black"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-red-600">
            One-Time Offer - Expires in {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
        </div>

        <h2 className="text-2xl font-bold text-center">{headline}</h2>

        {description && <p className="text-gray-600 text-center">{description}</p>}

        <div className="flex items-center justify-center gap-3">
          <span className="text-3xl font-bold">{priceLabel}</span>
          {originalPriceLabel && (
            <span className="text-xl text-gray-400 line-through">{originalPriceLabel}</span>
          )}
        </div>

        <div className="space-y-3 pt-4">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="w-full py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Yes, Add to My Order!"}
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-lg border text-gray-600 hover:bg-gray-50"
          >
            No thanks, I'll pass
          </button>
        </div>
      </div>
    </div>
  );
}
