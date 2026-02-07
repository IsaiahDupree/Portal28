"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  payload: Record<string, any>;
  stripe_price_id: string | null;
  is_active: boolean;
  headline?: string | null;
  description?: string | null;
  parent_offer_key?: string | null;
  expires_minutes?: number | null;
};

export default function OfferForm({
  offer,
  isNew,
}: {
  offer: Offer;
  isNew: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [key, setKey] = useState(offer.key);
  const [kind, setKind] = useState(offer.kind);
  const [title, setTitle] = useState(offer.title);
  const [subtitle, setSubtitle] = useState(offer.subtitle || "");
  const [badge, setBadge] = useState(offer.badge || "");
  const [ctaText, setCtaText] = useState(offer.cta_text);
  const [priceLabel, setPriceLabel] = useState(offer.price_label || "");
  const [compareAtLabel, setCompareAtLabel] = useState(offer.compare_at_label || "");
  const [bullets, setBullets] = useState(JSON.stringify(offer.bullets, null, 2));
  const [payload, setPayload] = useState(JSON.stringify(offer.payload, null, 2));
  const [stripePriceId, setStripePriceId] = useState(offer.stripe_price_id || "");
  const [isActive, setIsActive] = useState(offer.is_active);

  // Order bump / Upsell specific fields
  const [headline, setHeadline] = useState(offer.headline || "");
  const [description, setDescription] = useState(offer.description || "");
  const [parentOfferKey, setParentOfferKey] = useState(offer.parent_offer_key || "");
  const [expiresMinutes, setExpiresMinutes] = useState(offer.expires_minutes?.toString() || "30");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let bulletsJson: string[] = [];
    let payloadJson: Record<string, any> = {};

    try {
      bulletsJson = JSON.parse(bullets);
    } catch {
      setError("Invalid bullets JSON");
      setLoading(false);
      return;
    }

    try {
      payloadJson = JSON.parse(payload);
    } catch {
      setError("Invalid payload JSON");
      setLoading(false);
      return;
    }

    const body: any = {
      key: key.toLowerCase().replace(/[^a-z0-9-_]/g, ""),
      kind,
      title,
      subtitle: subtitle || null,
      badge: badge || null,
      cta_text: ctaText || "Continue",
      price_label: priceLabel || null,
      compare_at_label: compareAtLabel || null,
      bullets: bulletsJson,
      payload: payloadJson,
      stripe_price_id: stripePriceId || null,
      is_active: isActive,
    };

    // Add order_bump / upsell specific fields
    if (kind === "order_bump" || kind === "upsell") {
      body.headline = headline || null;
      body.description = description || null;
      body.parent_offer_key = parentOfferKey || null;
    }

    // Add upsell specific fields
    if (kind === "upsell") {
      body.expires_minutes = parseInt(expiresMinutes) || 30;
    }

    const res = await fetch("/api/admin/offers/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Save failed");
      setLoading(false);
      return;
    }

    router.push("/admin/offers");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/offers" className="text-sm text-gray-600 hover:text-black">
            ← Offers
          </Link>
          <h1 className="text-2xl font-semibold mt-1">
            {isNew ? "New Offer" : `Edit: ${offer.key}`}
          </h1>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Key</label>
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
            disabled={!isNew}
            className="w-full border rounded-lg p-2 disabled:bg-gray-50"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Lowercase, hyphens, underscores only</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Kind</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-full border rounded-lg p-2"
          >
            <option value="membership">Membership</option>
            <option value="course">Course</option>
            <option value="bundle">Bundle</option>
            <option value="order_bump">Order Bump</option>
            <option value="upsell">Upsell (Post-Purchase)</option>
          </select>
        </div>
      </div>

      {/* Order Bump / Upsell Specific Fields */}
      {(kind === "order_bump" || kind === "upsell") && (
        <div className="border-t pt-6 space-y-4">
          <h3 className="text-lg font-medium">
            {kind === "order_bump" ? "Order Bump" : "Upsell"} Settings
          </h3>

          <div>
            <label className="block text-sm font-medium mb-1">Headline</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full border rounded-lg p-2"
              placeholder={kind === "upsell" ? "Wait! Don't miss this exclusive offer" : "Add this to your order"}
            />
            <p className="text-xs text-gray-500 mt-1">Bold headline shown in the {kind === "upsell" ? "modal" : "checkout"}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-lg p-2"
              rows={3}
              placeholder="Supporting description text"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Parent Offer Key</label>
              <input
                type="text"
                value={parentOfferKey}
                onChange={(e) => setParentOfferKey(e.target.value)}
                className="w-full border rounded-lg p-2"
                placeholder="course-fb-ads-101"
              />
              <p className="text-xs text-gray-500 mt-1">
                {kind === "upsell"
                  ? "Trigger after this offer is purchased (blank = show after any purchase)"
                  : "Show this bump with this parent offer"}
              </p>
            </div>

            {kind === "upsell" && (
              <div>
                <label className="block text-sm font-medium mb-1">Expires (minutes)</label>
                <input
                  type="number"
                  value={expiresMinutes}
                  onChange={(e) => setExpiresMinutes(e.target.value)}
                  className="w-full border rounded-lg p-2"
                  min="1"
                  max="60"
                />
                <p className="text-xs text-gray-500 mt-1">How long the upsell offer remains valid</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border rounded-lg p-2"
          required
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Subtitle</label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Badge</label>
          <input
            type="text"
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            className="w-full border rounded-lg p-2"
            placeholder="e.g. Popular, Best Value"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">CTA Text</label>
          <input
            type="text"
            value={ctaText}
            onChange={(e) => setCtaText(e.target.value)}
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Price Label</label>
          <input
            type="text"
            value={priceLabel}
            onChange={(e) => setPriceLabel(e.target.value)}
            className="w-full border rounded-lg p-2"
            placeholder="e.g. $29/mo"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Compare At</label>
          <input
            type="text"
            value={compareAtLabel}
            onChange={(e) => setCompareAtLabel(e.target.value)}
            className="w-full border rounded-lg p-2"
            placeholder="e.g. $49/mo"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Bullets (JSON array)</label>
        <textarea
          value={bullets}
          onChange={(e) => setBullets(e.target.value)}
          className="w-full border rounded-lg p-2 font-mono text-sm"
          rows={5}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Payload (JSON)</label>
        <textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          className="w-full border rounded-lg p-2 font-mono text-sm"
          rows={6}
        />
        <p className="text-xs text-gray-500 mt-1">
          membership: {"{"} tier, interval {"}"} | course: {"{"} courseSlug {"}"} | bundle: {"{"} courseIds: ["uuid1", "uuid2"] {"}"}
        </p>
      </div>

      {kind === "bundle" && (
        <div>
          <label className="block text-sm font-medium mb-1">Stripe Price ID (Required for Bundles)</label>
          <input
            type="text"
            value={stripePriceId}
            onChange={(e) => setStripePriceId(e.target.value)}
            className="w-full border rounded-lg p-2 font-mono text-sm"
            placeholder="price_xxx"
            required={kind === "bundle"}
          />
          <p className="text-xs text-gray-500 mt-1">
            Create a bundle product in Stripe Dashboard and paste the price ID here
          </p>
        </div>
      )}

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <span className="text-sm">Active</span>
      </label>
    </form>
  );
}
