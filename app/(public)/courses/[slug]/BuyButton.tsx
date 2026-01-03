"use client";

import { useState } from "react";
import { track } from "@/lib/meta/pixel";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2 } from "lucide-react";

function makeEventId() {
  return `p28_${crypto.randomUUID()}`;
}

export function BuyButton({ courseId, price, className }: { courseId: string; price?: string; className?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);

    try {
      const event_id = makeEventId();
      track("InitiateCheckout", { content_ids: [courseId] });

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, event_id })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with status ${res.status}`);
      }

      const data = await res.json();
      if (data?.url) {
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
    <div className="flex flex-col gap-2">
      <Button 
        onClick={startCheckout} 
        disabled={loading} 
        size="lg"
        className={className}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Redirecting to checkout...
          </>
        ) : (
          <>
            <ShoppingCart className="mr-2 h-4 w-4" />
            {price ? `Buy Now - ${price}` : "Buy Now"}
          </>
        )}
      </Button>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
