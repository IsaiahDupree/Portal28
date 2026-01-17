"use client";

import { useState, useEffect } from "react";

type Offer = {
  key: string;
  kind: string;
  title: string;
  is_active: boolean;
};

type Placement = {
  placement_key: string;
  offer_key: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  offers: Offer;
};

export default function PlacementsManager({
  offers,
  initialPlacements,
}: {
  offers: Offer[];
  initialPlacements: string[];
}) {
  const [selectedPlacement, setSelectedPlacement] = useState<string>(
    initialPlacements[0] || ""
  );
  const [newPlacementKey, setNewPlacementKey] = useState("");
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState("");

  // Load placements when selectedPlacement changes
  useEffect(() => {
    if (selectedPlacement) {
      loadPlacements();
    }
  }, [selectedPlacement]);

  async function loadPlacements() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/placements?placement_key=${encodeURIComponent(
          selectedPlacement
        )}`
      );
      const data = await res.json();
      setPlacements(data.placements || []);
    } catch (err) {
      console.error("Failed to load placements:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddOffer() {
    if (!selectedOffer || !selectedPlacement) return;

    try {
      const res = await fetch("/api/admin/placements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placement_key: selectedPlacement,
          offer_key: selectedOffer,
        }),
      });

      if (res.ok) {
        setSelectedOffer("");
        setShowAddForm(false);
        loadPlacements();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error("Failed to add offer:", err);
      alert("Failed to add offer");
    }
  }

  async function handleRemove(offer_key: string) {
    if (!confirm("Remove this offer from the placement?")) return;

    try {
      const res = await fetch(
        `/api/admin/placements?placement_key=${encodeURIComponent(
          selectedPlacement
        )}&offer_key=${encodeURIComponent(offer_key)}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        loadPlacements();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error("Failed to remove offer:", err);
      alert("Failed to remove offer");
    }
  }

  async function handleReorder(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;

    const newOrder = [...placements];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);

    // Optimistically update UI
    setPlacements(newOrder);

    try {
      const res = await fetch("/api/admin/placements/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placement_key: selectedPlacement,
          offer_keys: newOrder.map((p) => p.offer_key),
        }),
      });

      if (!res.ok) {
        // Revert on error
        loadPlacements();
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error("Failed to reorder:", err);
      loadPlacements();
      alert("Failed to reorder");
    }
  }

  function handleCreatePlacement() {
    if (!newPlacementKey.trim()) return;
    setSelectedPlacement(newPlacementKey.trim());
    setNewPlacementKey("");
  }

  const availableOffers = offers.filter(
    (o) => !placements.find((p) => p.offer_key === o.key)
  );

  return (
    <div className="space-y-6">
      {/* Placement Selector */}
      <div className="rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold">Select Placement</h2>
        <div className="flex gap-3">
          <select
            value={selectedPlacement}
            onChange={(e) => setSelectedPlacement(e.target.value)}
            className="flex-1 rounded-lg border px-4 py-2"
          >
            <option value="">-- Select a placement --</option>
            {initialPlacements.map((pk) => (
              <option key={pk} value={pk}>
                {pk}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const key = prompt("Enter new placement key (e.g., widget:my-widget):");
              if (key) {
                setNewPlacementKey(key.trim());
                handleCreatePlacement();
              }
            }}
            className="px-4 py-2 rounded-lg border hover:bg-gray-50"
          >
            + New Placement
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Examples: widget:templates, course:fb-ads-101, pricing-page
        </p>
      </div>

      {selectedPlacement && (
        <div className="rounded-xl border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              Offers in {selectedPlacement}
              {loading && <span className="ml-2 text-sm text-gray-500">Loading...</span>}
            </h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 text-sm"
            >
              + Add Offer
            </button>
          </div>

          {showAddForm && (
            <div className="p-4 rounded-lg border bg-gray-50 space-y-3">
              <select
                value={selectedOffer}
                onChange={(e) => setSelectedOffer(e.target.value)}
                className="w-full rounded-lg border px-4 py-2"
              >
                <option value="">-- Select an offer --</option>
                {availableOffers.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.title} ({o.key})
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleAddOffer}
                  disabled={!selectedOffer}
                  className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setSelectedOffer("");
                  }}
                  className="px-4 py-2 rounded-lg border hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {placements.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              No offers in this placement yet.
            </p>
          ) : (
            <div className="space-y-2">
              {placements.map((p, index) => (
                <div
                  key={p.offer_key}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-white"
                >
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleReorder(index, index - 1)}
                      disabled={index === 0}
                      className="px-2 py-0.5 rounded text-xs hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleReorder(index, index + 1)}
                      disabled={index === placements.length - 1}
                      className="px-2 py-0.5 rounded text-xs hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      ↓
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 w-8">{index + 1}</div>
                  <div className="flex-1">
                    <div className="font-medium">{p.offers.title}</div>
                    <div className="text-sm text-gray-600">
                      {p.offer_key} • {p.offers.kind}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(p.offer_key)}
                    className="px-3 py-1 rounded text-sm text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
