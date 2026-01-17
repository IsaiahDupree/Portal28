"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  stripe_price_id: string | null;
  price_cents: number | null;
  hero_image_url: string | null;
}

export default function CourseEditForm({ course }: { course: Course }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    title: course.title,
    slug: course.slug,
    description: course.description || "",
    status: course.status,
    stripe_price_id: course.stripe_price_id || "",
    price_cents: course.price_cents?.toString() || "",
    hero_image_url: course.hero_image_url || ""
  });

  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autosaveTimeoutRef = useRef<NodeJS.Timeout>();
  const hasChangesRef = useRef(false);

  // Autosave effect
  useEffect(() => {
    if (!hasChangesRef.current) return;

    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    // Set new timeout for autosave (2 seconds after last change)
    autosaveTimeoutRef.current = setTimeout(() => {
      handleAutosave();
    }, 2000);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [formData]);

  async function handleAutosave() {
    if (!hasChangesRef.current) return;

    setAutosaveStatus("saving");

    const res = await fetch(`/api/admin/courses/${course.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.title,
        slug: formData.slug,
        description: formData.description || null,
        status: formData.status,
        stripe_price_id: formData.stripe_price_id || null,
        price_cents: parseInt(formData.price_cents) || null,
        hero_image_url: formData.hero_image_url || null
      })
    });

    if (res.ok) {
      setAutosaveStatus("saved");
      hasChangesRef.current = false;

      // Clear "saved" status after 2 seconds
      setTimeout(() => {
        setAutosaveStatus("idle");
      }, 2000);
    } else {
      setAutosaveStatus("idle");
      const data = await res.json();
      setMessage(`Autosave failed: ${data.error}`);
    }
  }

  function handleInputChange(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
    hasChangesRef.current = true;
    setMessage(""); // Clear any error messages
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch(`/api/admin/courses/${course.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.title,
        slug: formData.slug,
        description: formData.description || null,
        status: formData.status,
        stripe_price_id: formData.stripe_price_id || null,
        price_cents: parseInt(formData.price_cents) || null,
        hero_image_url: formData.hero_image_url || null
      })
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(`Error: ${data.error}`);
    } else {
      setMessage("Saved!");
      hasChangesRef.current = false;
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this course? This cannot be undone.")) return;

    setLoading(true);
    const res = await fetch(`/api/admin/courses/${course.id}`, { method: "DELETE" });

    if (res.ok) {
      router.push("/admin/courses");
    } else {
      const data = await res.json();
      setMessage(`Error: ${data.error}`);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4 flex items-center justify-between">
        {message && (
          <div
            className={`px-3 py-2 rounded text-sm ${
              message.startsWith("Error") || message.startsWith("Autosave failed")
                ? "bg-red-100 text-red-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {message}
          </div>
        )}

        {autosaveStatus !== "idle" && (
          <div className="text-sm text-gray-600 ml-auto">
            {autosaveStatus === "saving" && "Saving..."}
            {autosaveStatus === "saved" && "✓ Saved"}
          </div>
        )}
      </div>

      <div className="mb-3">
        <label className="block mb-1 font-medium text-sm">Title</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={(e) => handleInputChange("title", e.target.value)}
          required
          className="w-full px-2 py-2 border border-gray-300 rounded"
        />
      </div>

      <div className="mb-3">
        <label className="block mb-1 font-medium text-sm">Slug</label>
        <input
          type="text"
          name="slug"
          value={formData.slug}
          onChange={(e) => handleInputChange("slug", e.target.value)}
          required
          pattern="[a-z0-9-]+"
          className="w-full px-2 py-2 border border-gray-300 rounded"
        />
      </div>

      <div className="mb-3">
        <label className="block mb-1 font-medium text-sm">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={(e) => handleInputChange("description", e.target.value)}
          rows={3}
          className="w-full px-2 py-2 border border-gray-300 rounded"
        />
      </div>

      <div className="mb-3">
        <label className="block mb-1 font-medium text-sm">Status</label>
        <select
          name="status"
          value={formData.status}
          onChange={(e) => handleInputChange("status", e.target.value)}
          className="w-full px-2 py-2 border border-gray-300 rounded"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="block mb-1 font-medium text-sm">Price (cents)</label>
        <input
          type="number"
          name="price_cents"
          value={formData.price_cents}
          onChange={(e) => handleInputChange("price_cents", e.target.value)}
          min="0"
          className="w-full px-2 py-2 border border-gray-300 rounded"
        />
      </div>

      <div className="mb-3">
        <label className="block mb-1 font-medium text-sm">Stripe Price ID</label>
        <input
          type="text"
          name="stripe_price_id"
          value={formData.stripe_price_id}
          onChange={(e) => handleInputChange("stripe_price_id", e.target.value)}
          placeholder="price_xxxxx"
          className="w-full px-2 py-2 border border-gray-300 rounded"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-medium text-sm">Hero Image URL</label>
        <input
          type="url"
          name="hero_image_url"
          value={formData.hero_image_url}
          onChange={(e) => handleInputChange("hero_image_url", e.target.value)}
          className="w-full px-2 py-2 border border-gray-300 rounded"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-5 py-2 rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="bg-red-600 text-white px-5 py-2 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Delete Course
        </button>
      </div>
    </form>
  );
}
