"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  threadId: string;
  isPinned: boolean;
  isLocked: boolean;
};

export default function ThreadModActions({ threadId, isPinned, isLocked }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateThread(updates: Record<string, boolean>) {
    setLoading(true);
    await fetch(`/api/admin/community/threads/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setLoading(false);
    router.refresh();
  }

  async function deleteThread() {
    if (!confirm("Are you sure you want to delete this thread?")) return;
    setLoading(true);
    await fetch(`/api/admin/community/threads/${threadId}`, {
      method: "DELETE",
    });
    setLoading(false);
    router.back();
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500">Mod:</span>
      <button
        onClick={() => updateThread({ is_pinned: !isPinned })}
        disabled={loading}
        className={`px-2 py-1 rounded ${
          isPinned ? "bg-black text-white" : "border hover:bg-gray-50"
        }`}
      >
        {isPinned ? "Unpin" : "Pin"}
      </button>
      <button
        onClick={() => updateThread({ is_locked: !isLocked })}
        disabled={loading}
        className={`px-2 py-1 rounded ${
          isLocked ? "bg-yellow-100" : "border hover:bg-gray-50"
        }`}
      >
        {isLocked ? "Unlock" : "Lock"}
      </button>
      <button
        onClick={deleteThread}
        disabled={loading}
        className="px-2 py-1 rounded border text-red-600 hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  );
}
