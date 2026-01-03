"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Version {
  id: string;
  subject: string;
  preview_text: string | null;
  html_content: string;
  status: string;
  version_number: number;
}

interface Props {
  programId: string;
  currentVersion: Version | null;
  promptBase: string | null;
}

export default function PromptStudio({ programId, currentVersion, promptBase }: Props) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [subject, setSubject] = useState(currentVersion?.subject || "");
  const [html, setHtml] = useState(currentVersion?.html_content || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // For MVP, manual editing instead of LLM generation
  // In production, you'd call an LLM API here

  async function handleSaveVersion() {
    if (!subject || !html) {
      setMessage("Subject and content are required");
      return;
    }

    setLoading(true);
    setMessage("");

    const res = await fetch(`/api/admin/email-programs/${programId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        html_content: html,
        change_reason: prompt || "Manual edit"
      })
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(`Error: ${data.error}`);
    } else {
      setMessage("Version saved as draft!");
      setPrompt("");
      router.refresh();
    }
  }

  async function handleSendTest() {
    setLoading(true);
    setMessage("");

    const res = await fetch(`/api/admin/email-programs/${programId}/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version_id: currentVersion?.id
      })
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(`Error: ${data.error}`);
    } else {
      setMessage(`Test sent to ${data.sent_to}`);
    }
  }

  async function handleApprove() {
    if (!currentVersion) {
      setMessage("No version to approve");
      return;
    }

    setLoading(true);

    const res = await fetch(`/api/admin/email-programs/${programId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version_id: currentVersion.id,
        activate: true
      })
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(`Error: ${data.error}`);
    } else {
      setMessage("Approved and activated!");
      router.refresh();
    }
  }

  return (
    <div>
      {message && (
        <div style={{
          padding: 12,
          marginBottom: 16,
          borderRadius: 6,
          backgroundColor: message.startsWith("Error") ? "#f8d7da" : "#d4edda",
          color: message.startsWith("Error") ? "#721c24" : "#155724",
          fontSize: 14
        }}>
          {message}
        </div>
      )}

      <div style={{ marginBottom: 16, padding: 12, backgroundColor: "#f8f9fa", borderRadius: 6 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>
          Prompt (describe changes)
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
          placeholder="e.g., Make it more playful, add a CTA to the course page, shorten to 100 words..."
          style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, marginBottom: 8 }}
        />
        <small style={{ color: "#666" }}>
          Commands: schedule: [time], audience: [filter], tone: [style]
        </small>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Subject Line</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Email Content (HTML)</label>
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={10}
          style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, fontFamily: "monospace", fontSize: 12 }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={handleSaveVersion}
          disabled={loading}
          style={{
            backgroundColor: "#111",
            color: "#fff",
            padding: "10px 16px",
            border: "none",
            borderRadius: 6,
            cursor: "pointer"
          }}
        >
          Save as Draft
        </button>

        <button
          onClick={handleSendTest}
          disabled={loading || !currentVersion}
          style={{
            backgroundColor: "#6c757d",
            color: "#fff",
            padding: "10px 16px",
            border: "none",
            borderRadius: 6,
            cursor: "pointer"
          }}
        >
          Send Test to Me
        </button>

        <button
          onClick={handleApprove}
          disabled={loading || !currentVersion || currentVersion.status === "approved"}
          style={{
            backgroundColor: "#28a745",
            color: "#fff",
            padding: "10px 16px",
            border: "none",
            borderRadius: 6,
            cursor: "pointer"
          }}
        >
          {currentVersion?.status === "approved" ? "✓ Approved" : "Approve & Activate"}
        </button>
      </div>

      {currentVersion && (
        <div style={{ marginTop: 16, padding: 12, backgroundColor: "#e9ecef", borderRadius: 6, fontSize: 13 }}>
          <strong>Current: Version {currentVersion.version_number}</strong>
          <span style={{
            marginLeft: 8,
            padding: "2px 6px",
            borderRadius: 3,
            fontSize: 11,
            backgroundColor: currentVersion.status === "approved" ? "#d4edda" : "#fff3cd"
          }}>
            {currentVersion.status}
          </span>
        </div>
      )}
    </div>
  );
}
