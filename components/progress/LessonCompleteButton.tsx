"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  lessonId: string;
  courseId: string;
  isCompleted?: boolean;
  nextLessonUrl?: string;
};

export default function LessonCompleteButton({
  lessonId,
  courseId,
  isCompleted = false,
  nextLessonUrl,
}: Props) {
  const router = useRouter();
  const [completed, setCompleted] = useState(isCompleted);
  const [loading, setLoading] = useState(false);

  async function markComplete() {
    if (completed) return;
    setLoading(true);

    const res = await fetch("/api/progress/lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lessonId,
        courseId,
        status: "completed",
        progressPercent: 100,
      }),
    });

    setLoading(false);

    if (res.ok) {
      setCompleted(true);
      if (nextLessonUrl) {
        router.push(nextLessonUrl);
      } else {
        router.refresh();
      }
    }
  }

  if (completed) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <span className="font-medium">Completed</span>
      </div>
    );
  }

  return (
    <button
      onClick={markComplete}
      disabled={loading}
      className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
    >
      {loading ? (
        "Saving..."
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Mark Complete
        </>
      )}
    </button>
  );
}
