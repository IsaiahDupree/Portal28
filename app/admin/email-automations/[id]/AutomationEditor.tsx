"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sanitizeHtml } from "@/lib/security/sanitize";

interface AutomationStep {
  id: string;
  automation_id: string;
  step_order: number;
  delay_value: number;
  delay_unit: string;
  subject: string;
  preview_text: string | null;
  html_content: string;
  plain_text: string | null;
  prompt_instruction: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Automation {
  id: string;
  name: string;
  description: string | null;
  status: string;
  trigger_event: string;
  trigger_filter_json: Record<string, unknown>;
  prompt_base: string | null;
  created_at: string;
  updated_at: string;
  automation_steps: AutomationStep[];
}

export function AutomationEditor({ automation }: { automation: Automation }) {
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(automation.name);
  const [description, setDescription] = useState(automation.description || "");
  const [status, setStatus] = useState(automation.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAddStep, setShowAddStep] = useState(false);

  async function handleSaveBasicInfo() {
    setSaving(true);
    setError("");

    const res = await fetch(`/api/admin/email-automations/${automation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, status })
    });

    if (res.ok) {
      setEditMode(false);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to update");
    }

    setSaving(false);
  }

  async function handleActivate() {
    setSaving(true);
    setError("");

    const res = await fetch(`/api/admin/email-automations/${automation.id}/activate`, {
      method: "POST"
    });

    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to activate");
    }

    setSaving(false);
  }

  async function handleDeleteStep(stepId: string) {
    if (!confirm("Delete this step? This cannot be undone.")) return;

    const res = await fetch(`/api/admin/automation-steps/${stepId}`, {
      method: "DELETE"
    });

    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete step");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          {editMode ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ fontSize: 28, fontWeight: 600, padding: 8, border: "1px solid #ddd", borderRadius: 4, width: 400 }}
            />
          ) : (
            <h1>{automation.name}</h1>
          )}
          {editMode ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={{ fontSize: 14, padding: 8, border: "1px solid #ddd", borderRadius: 4, width: 400, marginTop: 8 }}
              placeholder="Description"
            />
          ) : (
            automation.description && <p style={{ color: "#666", marginTop: 4 }}>{automation.description}</p>
          )}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {editMode ? (
            <>
              <button
                onClick={() => setEditMode(false)}
                style={{ padding: "8px 16px", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", background: "#fff" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBasicInfo}
                disabled={saving}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: 6,
                  cursor: saving ? "not-allowed" : "pointer",
                  background: "#111",
                  color: "#fff",
                  opacity: saving ? 0.6 : 1
                }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditMode(true)}
                style={{ padding: "8px 16px", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", background: "#fff" }}
              >
                Edit Info
              </button>
              {automation.status === "draft" && automation.automation_steps.length > 0 && (
                <button
                  onClick={handleActivate}
                  disabled={saving}
                  style={{
                    padding: "8px 16px",
                    border: "none",
                    borderRadius: 6,
                    cursor: saving ? "not-allowed" : "pointer",
                    background: "#28a745",
                    color: "#fff",
                    opacity: saving ? 0.6 : 1
                  }}
                >
                  {saving ? "Activating..." : "Activate"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, backgroundColor: "#f8d7da", color: "#721c24", borderRadius: 6, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        <div style={{ padding: 16, backgroundColor: "#f5f5f5", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Trigger</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>{automation.trigger_event}</div>
        </div>
        <div style={{ padding: 16, backgroundColor: "#f5f5f5", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Status</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>
            {editMode ? (
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ width: "100%", padding: 4, border: "1px solid #ddd", borderRadius: 4 }}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
            ) : (
              <span style={{
                display: "inline-block",
                padding: "4px 8px",
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
                backgroundColor:
                  status === "active" ? "#d4edda" :
                  status === "paused" ? "#fff3cd" :
                  status === "draft" ? "#e2e3e5" : "#f8d7da",
                color:
                  status === "active" ? "#155724" :
                  status === "paused" ? "#856404" :
                  status === "draft" ? "#383d41" : "#721c24"
              }}>
                {status}
              </span>
            )}
          </div>
        </div>
        <div style={{ padding: 16, backgroundColor: "#f5f5f5", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Steps</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>{automation.automation_steps.length}</div>
        </div>
      </div>

      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Email Steps</h2>
        <button
          onClick={() => setShowAddStep(true)}
          style={{
            backgroundColor: "#111",
            color: "#fff",
            padding: "8px 16px",
            border: "none",
            borderRadius: 6,
            cursor: "pointer"
          }}
        >
          + Add Step
        </button>
      </div>

      {showAddStep && (
        <AddStepForm
          automationId={automation.id}
          stepOrder={automation.automation_steps.length}
          onCancel={() => setShowAddStep(false)}
          onSuccess={() => {
            setShowAddStep(false);
            router.refresh();
          }}
        />
      )}

      {automation.automation_steps.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", backgroundColor: "#f5f5f5", borderRadius: 8 }}>
          <p style={{ margin: 0, color: "#666" }}>No steps yet. Add your first email step above.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {automation.automation_steps.map((step, index) => (
            <div key={step.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    backgroundColor: "#111",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    fontSize: 14
                  }}>
                    {index + 1}
                  </div>
                  <div>
                    <strong style={{ fontSize: 16 }}>{step.subject}</strong>
                    {step.preview_text && (
                      <div style={{ fontSize: 13, color: "#666", marginTop: 2 }}>{step.preview_text}</div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteStep(step.id)}
                  style={{
                    padding: "4px 12px",
                    border: "1px solid #dc3545",
                    borderRadius: 4,
                    cursor: "pointer",
                    background: "#fff",
                    color: "#dc3545",
                    fontSize: 12
                  }}
                >
                  Delete
                </button>
              </div>

              <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: "#666" }}>
                  <strong>Delay:</strong> {step.delay_value} {step.delay_unit}
                  {index > 0 && " after previous email"}
                  {index === 0 && " after trigger"}
                </div>
                <div style={{ fontSize: 13, color: "#666" }}>
                  <strong>Status:</strong> {step.status}
                </div>
              </div>

              <details style={{ fontSize: 13 }}>
                <summary style={{ cursor: "pointer", color: "#111", fontWeight: 500 }}>View content</summary>
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    backgroundColor: "#f9f9f9",
                    borderRadius: 4,
                    maxHeight: 200,
                    overflow: "auto"
                  }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(step.html_content) }}
                />
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddStepForm({
  automationId,
  stepOrder,
  onCancel,
  onSuccess
}: {
  automationId: string;
  stepOrder: number;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [delayValue, setDelayValue] = useState(0);
  const [delayUnit, setDelayUnit] = useState("days");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/admin/email-automations/${automationId}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step_order: stepOrder,
        subject,
        preview_text: previewText || null,
        html_content: htmlContent,
        delay_value: delayValue,
        delay_unit: delayUnit
      })
    });

    if (res.ok) {
      onSuccess();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to create step");
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 24, padding: 16, border: "2px solid #111", borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>Add Email Step {stepOrder + 1}</h3>

      {error && (
        <div style={{ padding: 12, backgroundColor: "#f8d7da", color: "#721c24", borderRadius: 6, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Subject Line *</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          placeholder="e.g., Welcome to Portal28!"
          style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Preview Text</label>
        <input
          type="text"
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          placeholder="Optional preview text shown in inbox"
          style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Delay Value *</label>
          <input
            type="number"
            value={delayValue}
            onChange={(e) => setDelayValue(Number(e.target.value))}
            min="0"
            required
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Delay Unit *</label>
          <select
            value={delayUnit}
            onChange={(e) => setDelayUnit(e.target.value)}
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
          </select>
        </div>
      </div>
      <small style={{ color: "#666", display: "block", marginTop: -8, marginBottom: 16 }}>
        {stepOrder === 0
          ? "Delay from trigger event"
          : `Delay from previous email (Step ${stepOrder})`}
      </small>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Email Content (HTML) *</label>
        <textarea
          value={htmlContent}
          onChange={(e) => setHtmlContent(e.target.value)}
          required
          rows={8}
          placeholder="<h1>Welcome!</h1><p>Thanks for joining...</p>"
          style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6, fontFamily: "monospace", fontSize: 13 }}
        />
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{ padding: "8px 16px", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", background: "#fff" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "8px 16px",
            border: "none",
            borderRadius: 6,
            cursor: loading ? "not-allowed" : "pointer",
            background: "#111",
            color: "#fff",
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? "Adding..." : "Add Step"}
        </button>
      </div>
    </form>
  );
}
