"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewEmailProgramPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/admin/email-programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description"),
        type: form.get("type"),
        schedule_text: form.get("schedule_text"),
        timezone: form.get("timezone"),
        audience_type: form.get("audience_type"),
        prompt_base: form.get("prompt_base")
      })
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to create program");
      setLoading(false);
      return;
    }

    router.push(`/admin/email-programs/${data.program.id}`);
  }

  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin/email-programs">← Back to Programs</Link>
      </div>

      <h1>New Email Program</h1>

      {error && (
        <div style={{ padding: 12, backgroundColor: "#f8d7da", color: "#721c24", borderRadius: 6, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Program Name *</label>
          <input
            type="text"
            name="name"
            required
            placeholder="e.g., Weekly Newsletter"
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Description</label>
          <textarea
            name="description"
            rows={2}
            placeholder="What's this program for?"
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Type *</label>
          <select
            name="type"
            required
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
          >
            <option value="broadcast">Broadcast (Newsletter/Marketing)</option>
            <option value="transactional">Transactional (System emails)</option>
          </select>
          <small style={{ color: "#666" }}>Broadcasts include unsubscribe handling</small>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Schedule</label>
          <input
            type="text"
            name="schedule_text"
            placeholder="e.g., every Monday at 9am ET, Friday 3pm"
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
          />
          <small style={{ color: "#666" }}>Use natural language - we'll parse it for you</small>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Timezone</label>
          <select
            name="timezone"
            defaultValue="America/New_York"
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
          >
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Audience *</label>
          <select
            name="audience_type"
            required
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
          >
            <option value="all">Everyone</option>
            <option value="leads">Leads Only (non-customers)</option>
            <option value="customers">Customers Only</option>
            <option value="segment">Custom Segment (define later)</option>
          </select>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Base Style Prompt</label>
          <textarea
            name="prompt_base"
            rows={3}
            placeholder="e.g., Keep it warm, confident, and under 150 words. Always include a clear CTA."
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
          />
          <small style={{ color: "#666" }}>Default style instructions for all emails in this program</small>
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
          {loading ? "Creating..." : "Create Program"}
        </button>
      </form>
    </main>
  );
}
