"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const title = form.get("title") as string;
    const slug = form.get("slug") as string;
    const description = form.get("description") as string;
    const priceCents = parseInt(form.get("price_cents") as string) || 0;
    const stripePriceId = form.get("stripe_price_id") as string;
    const heroImageUrl = form.get("hero_image_url") as string;

    const res = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug,
        description,
        price_cents: priceCents,
        stripe_price_id: stripePriceId,
        hero_image_url: heroImageUrl
      })
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to create course");
      setLoading(false);
      return;
    }

    router.push(`/admin/courses/${data.course.id}`);
  }

  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin/courses">← Back to Courses</Link>
      </div>

      <h1>New Course</h1>

      {error && (
        <div style={{ padding: 12, backgroundColor: "#f8d7da", color: "#721c24", borderRadius: 6, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Title *</label>
          <input
            type="text"
            name="title"
            required
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
            onChange={(e) => {
              const slugInput = document.querySelector('input[name="slug"]') as HTMLInputElement;
              if (slugInput && !slugInput.dataset.edited) {
                slugInput.value = generateSlug(e.target.value);
              }
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Slug *</label>
          <input
            type="text"
            name="slug"
            required
            pattern="[a-z0-9-]+"
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
            onChange={(e) => {
              (e.target as HTMLInputElement).dataset.edited = "true";
            }}
          />
          <small style={{ color: "#666" }}>URL-friendly name (lowercase, hyphens only)</small>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Description</label>
          <textarea
            name="description"
            rows={4}
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Price (in cents)</label>
          <input
            type="number"
            name="price_cents"
            min="0"
            placeholder="9900 = $99.00"
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Stripe Price ID</label>
          <input
            type="text"
            name="stripe_price_id"
            placeholder="price_xxxxx"
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
          />
          <small style={{ color: "#666" }}>From Stripe Dashboard → Products → Price ID</small>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Hero Image URL</label>
          <input
            type="url"
            name="hero_image_url"
            placeholder="https://..."
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: "#111",
            color: "#fff",
            padding: "12px 24px",
            border: "none",
            borderRadius: 6,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? "Creating..." : "Create Course"}
        </button>
      </form>
    </main>
  );
}
