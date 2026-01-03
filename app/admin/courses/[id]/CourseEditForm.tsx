"use client";

import { useState } from "react";
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const form = new FormData(e.currentTarget);

    const res = await fetch(`/api/admin/courses/${course.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        slug: form.get("slug"),
        description: form.get("description"),
        status: form.get("status"),
        stripe_price_id: form.get("stripe_price_id") || null,
        price_cents: parseInt(form.get("price_cents") as string) || null,
        hero_image_url: form.get("hero_image_url") || null
      })
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(`Error: ${data.error}`);
    } else {
      setMessage("Saved!");
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
      {message && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            borderRadius: 6,
            backgroundColor: message.startsWith("Error") ? "#f8d7da" : "#d4edda",
            color: message.startsWith("Error") ? "#721c24" : "#155724"
          }}
        >
          {message}
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Title</label>
        <input
          type="text"
          name="title"
          defaultValue={course.title}
          required
          style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Slug</label>
        <input
          type="text"
          name="slug"
          defaultValue={course.slug}
          required
          pattern="[a-z0-9-]+"
          style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Description</label>
        <textarea
          name="description"
          defaultValue={course.description || ""}
          rows={3}
          style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Status</label>
        <select
          name="status"
          defaultValue={course.status}
          style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Price (cents)</label>
        <input
          type="number"
          name="price_cents"
          defaultValue={course.price_cents || ""}
          min="0"
          style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Stripe Price ID</label>
        <input
          type="text"
          name="stripe_price_id"
          defaultValue={course.stripe_price_id || ""}
          placeholder="price_xxxxx"
          style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Hero Image URL</label>
        <input
          type="url"
          name="hero_image_url"
          defaultValue={course.hero_image_url || ""}
          style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
        />
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: "#111",
            color: "#fff",
            padding: "10px 20px",
            border: "none",
            borderRadius: 6,
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          style={{
            backgroundColor: "#dc3545",
            color: "#fff",
            padding: "10px 20px",
            border: "none",
            borderRadius: 6,
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          Delete Course
        </button>
      </div>
    </form>
  );
}
