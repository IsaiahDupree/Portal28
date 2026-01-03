"use client";

import { useState } from "react";

export default function ReplyForm({
  widgetKey,
  threadId,
}: {
  widgetKey: string;
  threadId: string;
}) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!body.trim()) {
      setError("Reply cannot be empty");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch("/api/community/forum/post/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, body }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to reply (membership required?)");
      return;
    }

    setBody("");
    window.location.reload();
  }

  return (
    <div className="rounded-xl border p-5 space-y-4">
      <div className="font-semibold">Reply</div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="w-full border rounded-lg px-3 py-2"
        rows={4}
        placeholder="Write your reply..."
      />

      <button
        onClick={submit}
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Posting..." : "Reply"}
      </button>
    </div>
  );
}
