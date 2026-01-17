"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

interface SortableModuleProps {
  module: Module;
  onAddLesson: (moduleId: string) => void;
  onDeleteModule: (moduleId: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  onRenameModule: (moduleId: string, newTitle: string) => void;
  onReorderLessons: (moduleId: string, lessons: Lesson[]) => void;
}

function SortableModule({
  module,
  onAddLesson,
  onDeleteModule,
  onDeleteLesson,
  onRenameModule,
  onReorderLessons,
}: SortableModuleProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(module.title);
  const [localLessons, setLocalLessons] = useState(module.lessons);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleLessonDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = localLessons.findIndex((l) => l.id === active.id);
    const newIndex = localLessons.findIndex((l) => l.id === over.id);

    const reorderedLessons = arrayMove(localLessons, oldIndex, newIndex).map(
      (lesson, index) => ({
        ...lesson,
        sort_order: index,
      })
    );

    setLocalLessons(reorderedLessons);
    onReorderLessons(module.id, reorderedLessons);
  }

  function handleSaveTitle() {
    if (editedTitle.trim() && editedTitle !== module.title) {
      onRenameModule(module.id, editedTitle.trim());
    } else {
      setEditedTitle(module.title);
    }
    setIsEditingTitle(false);
  }

  function handleCancelEdit() {
    setEditedTitle(module.title);
    setIsEditingTitle(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-gray-300 rounded-md mb-3 overflow-hidden"
    >
      <div className="p-3 bg-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-2 flex-1">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded"
            title="Drag to reorder"
          >
            ⠿
          </button>

          {isEditingTitle ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") handleCancelEdit();
                }}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                autoFocus
              />
              <button
                onClick={handleSaveTitle}
                className="px-2 py-1 text-xs bg-black text-white rounded"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-2 py-1 text-xs bg-gray-300 rounded"
              >
                Cancel
              </button>
            </div>
          ) : (
            <strong
              className="cursor-pointer hover:text-blue-600"
              onDoubleClick={() => setIsEditingTitle(true)}
              title="Double-click to edit"
            >
              {module.title}
            </strong>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onAddLesson(module.id)}
            className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800"
          >
            + Lesson
          </button>
          <button
            onClick={() => onDeleteModule(module.id)}
            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>

      {localLessons.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleLessonDragEnd}
        >
          <SortableContext
            items={localLessons.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="m-0 p-0 list-none">
              {localLessons
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((lesson) => (
                  <SortableLesson
                    key={lesson.id}
                    lesson={lesson}
                    onDelete={onDeleteLesson}
                  />
                ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

interface SortableLessonProps {
  lesson: Lesson;
  onDelete: (lessonId: string) => void;
}

function SortableLesson({ lesson, onDelete }: SortableLessonProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="p-2 border-t border-gray-200 flex justify-between items-center hover:bg-gray-50"
    >
      <div className="flex items-center gap-2 flex-1">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded text-xs"
          title="Drag to reorder"
        >
          ⠿
        </button>
        <a
          href={`/admin/lessons/${lesson.id}`}
          className="text-gray-900 no-underline hover:text-blue-600"
        >
          {lesson.title}
        </a>
      </div>
      <button
        onClick={() => onDelete(lesson.id)}
        className="px-2 py-1 text-xs bg-gray-100 text-gray-600 border border-gray-300 rounded hover:bg-gray-200"
      >
        ×
      </button>
    </li>
  );
}

export default function ModulesEditor({ courseId, modules }: { courseId: string; modules: Module[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [localModules, setLocalModules] = useState(modules);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function addModule() {
    if (!newModuleTitle.trim()) return;
    setLoading(true);

    const res = await fetch(`/api/admin/courses/${courseId}/modules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newModuleTitle,
        sort_order: localModules.length
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

    const module = localModules.find((m) => m.id === moduleId);
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

  async function renameModule(moduleId: string, newTitle: string) {
    setLoading(true);

    await fetch(`/api/admin/modules/${moduleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle })
    });

    router.refresh();
    setLoading(false);
  }

  async function reorderLessons(moduleId: string, lessons: Lesson[]) {
    await fetch(`/api/admin/modules/${moduleId}/lessons/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lessons: lessons.map((l) => ({ id: l.id, sort_order: l.sort_order }))
      })
    });
  }

  function handleModuleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = localModules.findIndex((m) => m.id === active.id);
    const newIndex = localModules.findIndex((m) => m.id === over.id);

    const reorderedModules = arrayMove(localModules, oldIndex, newIndex).map(
      (module, index) => ({
        ...module,
        sort_order: index,
      })
    );

    setLocalModules(reorderedModules);

    // Save to backend
    fetch(`/api/admin/courses/${courseId}/modules/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modules: reorderedModules.map((m) => ({ id: m.id, sort_order: m.sort_order }))
      })
    });
  }

  return (
    <div style={{ opacity: loading ? 0.6 : 1 }}>
      {localModules.length === 0 ? (
        <p className="text-gray-600 mb-4">No modules yet.</p>
      ) : (
        <div className="mb-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleModuleDragEnd}
          >
            <SortableContext
              items={localModules.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              {localModules
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((module) => (
                  <SortableModule
                    key={module.id}
                    module={module}
                    onAddLesson={addLesson}
                    onDeleteModule={deleteModule}
                    onDeleteLesson={deleteLesson}
                    onRenameModule={renameModule}
                    onReorderLessons={reorderLessons}
                  />
                ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="New module title..."
          value={newModuleTitle}
          onChange={(e) => setNewModuleTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addModule()}
          className="flex-1 px-2 py-2 border border-gray-300 rounded"
        />
        <button
          onClick={addModule}
          disabled={loading || !newModuleTitle.trim()}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Module
        </button>
      </div>
    </div>
  );
}
