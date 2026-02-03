"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart } from "lucide-react";
import OrderBump from "@/components/offers/OrderBump";
import { track } from "@/lib/meta/pixel";

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  stripe_price_id: string;
  price_label: string | null;
};

type Bump = {
  key: string;
  title: string;
  headline: string | null;
  description: string | null;
  price_label: string | null;
  compare_at_label: string | null;
  payload: any;
  stripe_price_id?: string;
};

type Props = {
  course: Course;
  bumps: Bump[];
};

function makeEventId() {
  return `p28_${crypto.randomUUID()}`;
}

export function CheckoutForm({ course, bumps }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBumps, setSelectedBumps] = useState<Set<string>>(new Set());

  function handleAddBump(bumpKey: string) {
    setSelectedBumps((prev) => {
      const next = new Set(prev);
      next.add(bumpKey);
      return next;
    });

    // Track bump add event
    track("AddToCart", { content_ids: [bumpKey], content_type: "order_bump" });
  }

  function handleRemoveBump(bumpKey: string) {
    setSelectedBumps((prev) => {
      const next = new Set(prev);
      next.delete(bumpKey);
      return next;
    });
  }

  async function handleCheckout() {
    setLoading(true);
    setError(null);

    try {
      const event_id = makeEventId();
      track("InitiateCheckout", { content_ids: [course.id] });

      // Log order_bump_viewed events for analytics
      for (const bump of bumps) {
        track("ViewContent", { content_ids: [bump.key], content_type: "order_bump" });
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          event_id,
          bumpKeys: Array.from(selectedBumps),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with status ${res.status}`);
      }

      const data = await res.json();
      if (data?.url) {
        // Track selected bumps before redirect
        if (selectedBumps.size > 0) {
          track("CustomEvent", {
            event_name: "order_bumps_selected",
            content_ids: Array.from(selectedBumps),
          });
        }
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="md:col-span-2 space-y-6">
        {/* Main Product */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-2">{course.title}</h2>
          {course.description && (
            <p className="text-gray-600 mb-4">{course.description}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Main Product</span>
            <span className="text-lg font-bold">{course.price_label || "$99"}</span>
          </div>
        </div>

        {/* Order Bumps */}
        {bumps.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Add-Ons (Optional)</h3>
            {bumps.map((bump) => (
              <OrderBump
                key={bump.key}
                bumpOfferKey={bump.key}
                headline={bump.headline || bump.title}
                description={bump.description || undefined}
                priceLabel={bump.price_label || "$47"}
                originalPriceLabel={bump.compare_at_label || undefined}
                onAdd={handleAddBump}
                onRemove={handleRemoveBump}
              />
            ))}
          </div>
        )}
      </div>

      {/* Order Summary Sidebar */}
      <div className="md:col-span-1">
        <div className="border rounded-lg p-6 sticky top-4">
          <h3 className="text-lg font-bold mb-4">Order Summary</h3>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-600">{course.title}</span>
              <span className="font-medium">{course.price_label || "$99"}</span>
            </div>

            {bumps
              .filter((bump) => selectedBumps.has(bump.key))
              .map((bump) => (
                <div key={bump.key} className="flex justify-between text-sm">
                  <span className="text-gray-600">{bump.title}</span>
                  <span className="font-medium">{bump.price_label || "$47"}</span>
                </div>
              ))}
          </div>

          <div className="border-t pt-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="font-bold">Total</span>
              <span className="text-2xl font-bold">
                {/* In production, calculate actual total */}
                {course.price_label || "$99"}
                {selectedBumps.size > 0 && " +"}
              </span>
            </div>
          </div>

          <Button
            onClick={handleCheckout}
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Continue to Payment
              </>
            )}
          </Button>

          {error && (
            <p className="text-sm text-destructive mt-4">{error}</p>
          )}

          <p className="text-xs text-gray-500 mt-4 text-center">
            Secure checkout powered by Stripe
          </p>
        </div>
      </div>
    </div>
  );
}
