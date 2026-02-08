"use client";

/**
 * Create Custom Audience Form
 * META-007: Form to create new custom audiences
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

const AUDIENCE_TYPES = [
  {
    value: "purchasers",
    label: "Purchasers",
    description: "All users who have purchased any course",
  },
  {
    value: "course_completers",
    label: "Course Completers",
    description: "Users who completed at least one course",
  },
  {
    value: "engaged_users",
    label: "Engaged Users",
    description: "Users with recent activity (last 30 days)",
  },
  {
    value: "abandoned_checkouts",
    label: "Abandoned Checkouts",
    description: "Users who started checkout but didn't complete (last 7 days)",
  },
  {
    value: "high_value",
    label: "High Value Customers",
    description: "Users who spent over a certain threshold",
  },
];

export function CreateAudienceForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    audience_type: "purchasers",
    config: {} as Record<string, any>,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/custom-audiences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create audience");
      }

      const data = await response.json();

      // Redirect to the audience list
      router.push("/admin/custom-audiences");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedType = AUDIENCE_TYPES.find(
    (t) => t.value === formData.audience_type
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="border rounded-xl p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">
            Audience Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Course Purchasers - Q1 2026"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Optional description for internal reference"
            rows={2}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Audience Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.audience_type}
            onChange={(e) =>
              setFormData({ ...formData, audience_type: e.target.value })
            }
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          >
            {AUDIENCE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {selectedType && (
            <p className="text-sm text-gray-600 mt-1">
              {selectedType.description}
            </p>
          )}
        </div>

        {formData.audience_type === "high_value" && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Minimum Spend Amount (cents)
            </label>
            <input
              type="number"
              value={formData.config.min_spend || 10000}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  config: { ...formData.config, min_spend: parseInt(e.target.value) },
                })
              }
              placeholder="10000"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
            <p className="text-sm text-gray-600 mt-1">
              Default: 10000 cents ($100). Users who spent this amount or more will be included.
            </p>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-sm mb-1">What happens next?</h3>
        <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
          <li>Audience will be created in Meta (may take a few seconds)</li>
          <li>Return to audiences list and click "Sync Now" to upload users</li>
          <li>Meta will process the users (can take 24-48 hours)</li>
          <li>Use the audience in your Meta Ads Manager</li>
        </ol>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Create Audience"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
