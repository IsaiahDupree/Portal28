"use client";

import { useState } from "react";

export default function NewThreadForm({
  widgetKey,
  categorySlug,
}: {
  widgetKey: string;
  categorySlug: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim() || !body.trim()) {
      setError("Title and body are required");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch("/api/community/forum/thread/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgetKey, categorySlug, title, body }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create thread (membership required?)");
      return;
    }

    window.location.reload();
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full rounded-xl border p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-gray-600">Start a new thread...</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border p-5 space-y-4">
      <div className="font-semibold">Start a new thread</div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border rounded-lg px-3 py-2"
        placeholder="Thread title"
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="w-full border rounded-lg px-3 py-2"
        rows={5}
        placeholder="Write your post..."
      />

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Posting..." : "Post Thread"}
        </button>
        <button
          onClick={() => setExpanded(false)}
          className="px-4 py-2 rounded-lg border hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
