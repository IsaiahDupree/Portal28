"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  category?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    sort_order: number;
  };
};

export default function ForumCategoryForm({ category }: Props) {
  const router = useRouter();
  const isEdit = !!category;

  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [sortOrder, setSortOrder] = useState(category?.sort_order ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from name
  function handleNameChange(value: string) {
    setName(value);
    if (!isEdit || !slug) {
      const generatedSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setSlug(generatedSlug);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setError("Name and slug are required");
      return;
    }

    setLoading(true);
    setError(null);

    // Get space_id for new categories
    let spaceId = null;
    if (!isEdit) {
      const spaceRes = await fetch("/api/community/spaces");
      const spaceData = await spaceRes.json();
      spaceId = spaceData[0]?.id; // Use the first space (Portal28)

      if (!spaceId) {
        setError("Could not find community space");
        setLoading(false);
        return;
      }
    }

    const endpoint = isEdit
      ? `/api/admin/forum-categories/${category.id}`
      : "/api/admin/forum-categories";

    const body: any = {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      icon: icon.trim() || null,
      sort_order: sortOrder,
    };

    if (!isEdit && spaceId) {
      body.space_id = spaceId;
    }

    const res = await fetch(endpoint, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save category");
      return;
    }

    router.push("/admin/community");
    router.refresh();
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm("Are you sure you want to delete this category? All threads will be deleted.")) {
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch(`/api/admin/forum-categories/${category.id}`, {
      method: "DELETE",
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to delete category");
      return;
    }

    router.push("/admin/community");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          placeholder="General Discussion"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Slug</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          placeholder="general-discussion"
        />
        <p className="text-xs text-gray-500 mt-1">Used in URLs: /community/forums/{slug}</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          rows={3}
          placeholder="A place for general conversations..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Icon (optional)</label>
        <input
          type="text"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          placeholder="💬"
        />
        <p className="text-xs text-gray-500 mt-1">Emoji or icon name</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Sort Order</label>
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
          className="w-full border rounded-lg px-3 py-2"
          min="0"
        />
        <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Saving..." : isEdit ? "Update Category" : "Create Category"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg border hover:bg-gray-50"
        >
          Cancel
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 ml-auto"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
