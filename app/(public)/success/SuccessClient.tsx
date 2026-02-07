"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import UpsellModal from "@/components/offers/UpsellModal";

type Course = {
  id: string;
  title: string;
  slug: string;
};

type UpsellOffer = {
  key: string;
  title: string;
  headline: string;
  description?: string;
  price_label: string;
  compare_at_label?: string;
  expires_minutes?: number;
  payload?: {
    courseSlug?: string;
  };
};

type Props = {
  orderId: string;
  orderEmail: string;
  course: Course | null;
  upsellOffer: UpsellOffer | null;
};

export default function SuccessClient({ orderId, orderEmail, course, upsellOffer }: Props) {
  const router = useRouter();
  const [showUpsell, setShowUpsell] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Track pageview
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "Purchase");
    }

    // Show upsell modal after 2 seconds
    if (upsellOffer) {
      const timer = setTimeout(() => {
        setShowUpsell(true);
        trackUpsellViewed();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [upsellOffer]);

  async function trackUpsellViewed() {
    if (!upsellOffer) return;

    try {
      await fetch("/api/paywall-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "upsell_viewed",
          offer_key: upsellOffer.key,
          email: orderEmail,
          metadata: { orderId }
        })
      });
    } catch (err) {
      console.error("Error tracking upsell view:", err);
    }
  }

  async function trackUpsellDeclined() {
    if (!upsellOffer) return;

    try {
      await fetch("/api/paywall-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "upsell_declined",
          offer_key: upsellOffer.key,
          email: orderEmail,
          metadata: { orderId }
        })
      });
    } catch (err) {
      console.error("Error tracking upsell decline:", err);
    }
  }

  async function handleAcceptUpsell() {
    if (!upsellOffer || processing) return;

    setProcessing(true);
    setError(null);

    // Generate Meta Pixel event ID for deduplication
    const eventId = `upsell_${orderId}_${upsellOffer.key}_${Date.now()}`;

    // Track Meta Pixel event
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "InitiateCheckout", {
        content_name: upsellOffer.title,
        content_category: "upsell"
      }, { eventID: eventId });
    }

    try {
      const response = await fetch("/api/upsell/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          upsellOfferKey: upsellOffer.key,
          eventId
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success! Track and redirect
        if (typeof window !== "undefined" && (window as any).fbq) {
          (window as any).fbq("track", "Purchase", {
            content_name: upsellOffer.title,
            content_category: "upsell",
            value: parseFloat(upsellOffer.price_label.replace(/[^0-9.]/g, "")),
            currency: "USD"
          }, { eventID: eventId });
        }

        // Show success message briefly before redirecting
        setShowUpsell(false);
        alert(`Success! You now have access to ${data.course.title}`);
        router.push("/app/courses");
      } else {
        setError(data.error || "Payment failed. Please try again.");
        setProcessing(false);
      }
    } catch (err) {
      console.error("Error processing upsell:", err);
      setError("An error occurred. Please try again.");
      setProcessing(false);
    }
  }

  function handleDeclineUpsell() {
    trackUpsellDeclined();
    setShowUpsell(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl p-8 shadow-lg text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Success Message */}
        <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
        <p className="text-gray-600 mb-8">
          Thank you for your purchase. A confirmation email has been sent to <strong>{orderEmail}</strong>.
        </p>

        {/* Course Access */}
        {course && (
          <div className="bg-blue-50 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-2">You now have access to:</h2>
            <p className="text-lg text-blue-600 font-medium">{course.title}</p>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => router.push("/app/courses")}
            className="w-full py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800"
          >
            Go to My Courses
          </button>

          <button
            onClick={() => router.push("/")}
            className="w-full py-3 rounded-lg border text-gray-600 hover:bg-gray-50"
          >
            Return to Home
          </button>
        </div>
      </div>

      {/* Upsell Modal */}
      {upsellOffer && (
        <UpsellModal
          isOpen={showUpsell}
          onClose={handleDeclineUpsell}
          upsellOfferKey={upsellOffer.key}
          headline={upsellOffer.headline}
          description={upsellOffer.description}
          priceLabel={upsellOffer.price_label}
          originalPriceLabel={upsellOffer.compare_at_label}
          expiresMinutes={upsellOffer.expires_minutes || 30}
          onAccept={handleAcceptUpsell}
        />
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg max-w-md">
          {error}
        </div>
      )}

      {/* Processing Overlay */}
      {processing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="font-medium">Processing your order...</p>
          </div>
        </div>
      )}
    </div>
  );
}
