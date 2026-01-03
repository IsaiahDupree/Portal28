"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Program {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  schedule_text: string | null;
  timezone: string;
  audience_type: string;
  next_run_at: string | null;
}

export default function ProgramEditor({ program }: { program: Program }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const form = new FormData(e.currentTarget);

    const res = await fetch(`/api/admin/email-programs/${program.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description"),
        schedule_text: form.get("schedule_text"),
        timezone: form.get("timezone"),
        audience_type: form.get("audience_type")
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

  async function toggleStatus() {
    setLoading(true);
    const newStatus = program.status === "active" ? "paused" : "active";

    await fetch(`/api/admin/email-programs/${program.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });

    router.refresh();
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      {message && (
        <div style={{
          padding: 12,
          marginBottom: 16,
          borderRadius: 6,
          backgroundColor: message.startsWith("Error") ? "#f8d7da" : "#d4edda",
          color: message.startsWith("Error") ? "#721c24" : "#155724"
        }}>
          {message}
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Name</label>
        <input
          type="text"
          name="name"
          defaultValue={program.name}
          required
          style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Description</label>
        <textarea
          name="description"
          defaultValue={program.description || ""}
          rows={2}
          style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Schedule</label>
        <input
          type="text"
          name="schedule_text"
          defaultValue={program.schedule_text || ""}
          placeholder="e.g., Monday 9am ET"
          style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
        />
        {program.next_run_at && (
          <small style={{ color: "#666" }}>
            Next run: {new Date(program.next_run_at).toLocaleString()}
          </small>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Timezone</label>
        <select
          name="timezone"
          defaultValue={program.timezone}
          style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
        >
          <option value="America/New_York">Eastern Time (ET)</option>
          <option value="America/Chicago">Central Time (CT)</option>
          <option value="America/Denver">Mountain Time (MT)</option>
          <option value="America/Los_Angeles">Pacific Time (PT)</option>
          <option value="UTC">UTC</option>
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Audience</label>
        <select
          name="audience_type"
          defaultValue={program.audience_type}
          style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
        >
          <option value="all">Everyone</option>
          <option value="leads">Leads Only</option>
          <option value="customers">Customers Only</option>
          <option value="segment">Custom Segment</option>
        </select>
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
          onClick={toggleStatus}
          disabled={loading}
          style={{
            backgroundColor: program.status === "active" ? "#ffc107" : "#28a745",
            color: program.status === "active" ? "#000" : "#fff",
            padding: "10px 20px",
            border: "none",
            borderRadius: 6,
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {program.status === "active" ? "Pause" : "Activate"}
        </button>
      </div>
    </form>
  );
}
