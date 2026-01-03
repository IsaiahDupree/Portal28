"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { updateLessonContent } from "@/app/actions/studio";

export function useAutosaveLesson(lessonId: string) {
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    
    return (doc: any) => {
      clearTimeout(timeoutId);
      setError(null);
      
      timeoutId = setTimeout(async () => {
        setSaving(true);
        try {
          const res = await updateLessonContent(lessonId, doc);
          setSavedAt(res.updatedAt);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
          setSaving(false);
        }
      }, 600); // 600ms debounce
    };
  }, [lessonId]);

  return { save, saving, savedAt, error };
}

// Hook for saving any lesson field with debounce
export function useAutosave<T>(
  lessonId: string,
  field: string,
  initialValue: T,
  delay: number = 1000
) {
  const [value, setValue] = useState<T>(initialValue);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const debouncedSave = useCallback(
    async (newValue: T) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/studio/lessons/${lessonId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: newValue }),
        });
        if (res.ok) {
          const data = await res.json();
          setSavedAt(new Date(data.saved_at));
        }
      } catch (err) {
        console.error("Autosave failed:", err);
      } finally {
        setSaving(false);
      }
    },
    [lessonId, field]
  );

  useEffect(() => {
    if (value === initialValue) return;

    const timeoutId = setTimeout(() => {
      debouncedSave(value);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [value, delay, debouncedSave, initialValue]);

  return { value, setValue, saving, savedAt };
}
