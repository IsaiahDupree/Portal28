"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewEmailAutomationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/admin/email-automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description"),
        trigger_event: form.get("trigger_event"),
        prompt_base: form.get("prompt_base")
      })
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to create automation");
      setLoading(false);
      return;
    }

    router.push(`/admin/email-automations/${data.automation.id}`);
  }

  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin/email-automations">← Back to Automations</Link>
      </div>

      <h1>New Email Automation</h1>

      {error && (
        <div style={{ padding: 12, backgroundColor: "#f8d7da", color: "#721c24", borderRadius: 6, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Automation Name *</label>
          <input
            type="text"
            name="name"
            required
            placeholder="e.g., New Customer Onboarding"
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Description</label>
          <textarea
            name="description"
            rows={2}
            placeholder="What's this automation for?"
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Trigger Event *</label>
          <select
            name="trigger_event"
            required
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
          >
            <option value="">Select a trigger...</option>
            <option value="lead_created">Lead Created (Newsletter Signup)</option>
            <option value="purchase_completed">Purchase Completed</option>
            <option value="course_started">Course Started</option>
            <option value="subscription_created">Subscription Created</option>
            <option value="trial_started">Trial Started</option>
            <option value="trial_ending_soon">Trial Ending Soon (3 days)</option>
            <option value="subscription_cancelled">Subscription Cancelled</option>
          </select>
          <small style={{ color: "#666" }}>What event triggers this automation?</small>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Base Style Prompt</label>
          <textarea
            name="prompt_base"
            rows={3}
            placeholder="e.g., Keep it warm, confident, and helpful. Focus on value delivery."
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
          />
          <small style={{ color: "#666" }}>Default style instructions for all emails in this sequence</small>
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
          {loading ? "Creating..." : "Create Automation"}
        </button>
      </form>
    </main>
  );
}
