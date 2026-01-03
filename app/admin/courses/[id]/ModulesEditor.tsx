"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Lesson {
  id: string;
  title: string;
  sort_order: number;
}

interface Module {
  id: string;
  title: string;
  sort_order: number;
  lessons: Lesson[];
}

export default function ModulesEditor({ courseId, modules }: { courseId: string; modules: Module[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");

  async function addModule() {
    if (!newModuleTitle.trim()) return;
    setLoading(true);

    const res = await fetch(`/api/admin/courses/${courseId}/modules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newModuleTitle,
        sort_order: modules.length
      })
    });

    if (res.ok) {
      setNewModuleTitle("");
      router.refresh();
    }
    setLoading(false);
  }

  async function deleteModule(moduleId: string) {
    if (!confirm("Delete this module and all its lessons?")) return;
    setLoading(true);

    await fetch(`/api/admin/modules/${moduleId}`, { method: "DELETE" });
    router.refresh();
    setLoading(false);
  }

  async function addLesson(moduleId: string) {
    const title = prompt("Lesson title:");
    if (!title) return;
    setLoading(true);

    const module = modules.find((m) => m.id === moduleId);
    const lessonCount = module?.lessons.length || 0;

    await fetch(`/api/admin/modules/${moduleId}/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        sort_order: lessonCount
      })
    });

    router.refresh();
    setLoading(false);
  }

  async function deleteLesson(lessonId: string) {
    if (!confirm("Delete this lesson?")) return;
    setLoading(true);

    await fetch(`/api/admin/lessons/${lessonId}`, { method: "DELETE" });
    router.refresh();
    setLoading(false);
  }

  return (
    <div style={{ opacity: loading ? 0.6 : 1 }}>
      {modules.length === 0 ? (
        <p style={{ color: "#666", marginBottom: 16 }}>No modules yet.</p>
      ) : (
        <div style={{ marginBottom: 16 }}>
          {modules
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((module) => (
              <div
                key={module.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  marginBottom: 12,
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    padding: 12,
                    backgroundColor: "#f5f5f5",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <strong>{module.title}</strong>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => addLesson(module.id)}
                      style={{
                        padding: "4px 8px",
                        fontSize: 12,
                        backgroundColor: "#111",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer"
                      }}
                    >
                      + Lesson
                    </button>
                    <button
                      onClick={() => deleteModule(module.id)}
                      style={{
                        padding: "4px 8px",
                        fontSize: 12,
                        backgroundColor: "#dc3545",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer"
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {module.lessons.length > 0 && (
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {module.lessons
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((lesson) => (
                        <li
                          key={lesson.id}
                          style={{
                            padding: "8px 12px",
                            borderTop: "1px solid #eee",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}
                        >
                          <a
                            href={`/admin/lessons/${lesson.id}`}
                            style={{ color: "#111", textDecoration: "none" }}
                          >
                            {lesson.title}
                          </a>
                          <button
                            onClick={() => deleteLesson(lesson.id)}
                            style={{
                              padding: "2px 6px",
                              fontSize: 11,
                              backgroundColor: "#f5f5f5",
                              color: "#666",
                              border: "1px solid #ddd",
                              borderRadius: 3,
                              cursor: "pointer"
                            }}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder="New module title..."
          value={newModuleTitle}
          onChange={(e) => setNewModuleTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addModule()}
          style={{ flex: 1, padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
        />
        <button
          onClick={addModule}
          disabled={loading || !newModuleTitle.trim()}
          style={{
            padding: "8px 16px",
            backgroundColor: "#111",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer"
          }}
        >
          Add Module
        </button>
      </div>
    </div>
  );
}
