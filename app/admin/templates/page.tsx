"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Download, Copy } from "lucide-react";

interface Template {
  id: string;
  title: string;
  description?: string;
  category: string;
  file_url?: string;
  file_name?: string;
  file_size_bytes?: number;
  file_type?: string;
  preview_url?: string;
  content?: string;
  tags: string[];
  download_count: number;
  copy_count: number;
  is_published: boolean;
  is_premium: boolean;
  required_product_id?: string;
  sort_order: number;
  created_at: string;
}

const categories = [
  "general",
  "design",
  "code",
  "business",
  "marketing",
  "other",
];

export default function AdminTemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "general",
    file_url: "",
    file_name: "",
    file_size_bytes: 0,
    file_type: "",
    preview_url: "",
    content: "",
    tags: [] as string[],
    is_published: true,
    is_premium: false,
    required_product_id: null as string | null,
    sort_order: 0,
  });
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      setLoading(true);
      const response = await fetch("/api/templates?limit=1000");

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        setError("Failed to load templates");
      }
    } catch (err) {
      console.error("Error fetching templates:", err);
      setError("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      title: "",
      description: "",
      category: "general",
      file_url: "",
      file_name: "",
      file_size_bytes: 0,
      file_type: "",
      preview_url: "",
      content: "",
      tags: [],
      is_published: true,
      is_premium: false,
      required_product_id: null,
      sort_order: 0,
    });
    setTagInput("");
    setEditingTemplate(null);
  }

  function handleEdit(template: Template) {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      description: template.description || "",
      category: template.category,
      file_url: template.file_url || "",
      file_name: template.file_name || "",
      file_size_bytes: template.file_size_bytes || 0,
      file_type: template.file_type || "",
      preview_url: template.preview_url || "",
      content: template.content || "",
      tags: template.tags || [],
      is_published: template.is_published,
      is_premium: template.is_premium,
      required_product_id: template.required_product_id || null,
      sort_order: template.sort_order,
    });
    setShowCreateForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.file_url && !formData.content) {
      alert("Please provide either a file URL or content");
      return;
    }

    try {
      const url = editingTemplate
        ? `/api/templates/${editingTemplate.id}`
        : "/api/templates";

      const method = editingTemplate ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCreateForm(false);
        resetForm();
        fetchTemplates();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to save template");
      }
    } catch (err) {
      console.error("Error saving template:", err);
      alert("Failed to save template");
    }
  }

  async function handleDelete(templateId: string) {
    if (!confirm("Are you sure you want to delete this template?")) {
      return;
    }

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchTemplates();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete template");
      }
    } catch (err) {
      console.error("Error deleting template:", err);
      alert("Failed to delete template");
    }
  }

  function addTag() {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput("");
    }
  }

  function removeTag(tag: string) {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  }

  function formatFileSize(bytes?: number) {
    if (!bytes) return "N/A";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Templates Management</h1>
          <p className="text-muted-foreground">
            Manage templates for the Templates Vault
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowCreateForm(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {showCreateForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              {editingTemplate ? "Edit Template" : "Create Template"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">File URL</label>
                  <input
                    type="url"
                    value={formData.file_url}
                    onChange={(e) =>
                      setFormData({ ...formData, file_url: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">File Name</label>
                  <input
                    type="text"
                    value={formData.file_name}
                    onChange={(e) =>
                      setFormData({ ...formData, file_name: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    placeholder="template.pdf"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    File Size (bytes)
                  </label>
                  <input
                    type="number"
                    value={formData.file_size_bytes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        file_size_bytes: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full border rounded px-3 py-2"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">File Type</label>
                  <input
                    type="text"
                    value={formData.file_type}
                    onChange={(e) =>
                      setFormData({ ...formData, file_type: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    placeholder="application/pdf"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sort_order: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Preview URL</label>
                <input
                  type="url"
                  value={formData.preview_url}
                  onChange={(e) =>
                    setFormData({ ...formData, preview_url: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Content (for copy functionality)
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2 font-mono text-sm"
                  rows={5}
                  placeholder="Template content that can be copied..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    className="flex-1 border rounded px-3 py-2"
                    placeholder="Add a tag and press Enter"
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {formData.tags.map((tag, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_published"
                    checked={formData.is_published}
                    onChange={(e) =>
                      setFormData({ ...formData, is_published: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  <label htmlFor="is_published" className="text-sm font-medium">
                    Published
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_premium"
                    checked={formData.is_premium}
                    onChange={(e) =>
                      setFormData({ ...formData, is_premium: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  <label htmlFor="is_premium" className="text-sm font-medium">
                    Premium
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Required Product ID
                  </label>
                  <input
                    type="text"
                    value={formData.required_product_id || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        required_product_id: e.target.value || null,
                      })
                    }
                    className="w-full border rounded px-3 py-2"
                    placeholder="UUID"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingTemplate ? "Update Template" : "Create Template"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded mb-8">{error}</div>
      )}

      <div className="grid gap-4">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No templates yet. Create your first template to get started.
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{template.title}</h3>
                      <Badge variant="outline" className="capitalize">
                        {template.category}
                      </Badge>
                      {!template.is_published && (
                        <Badge variant="outline">Unpublished</Badge>
                      )}
                      {template.is_premium && (
                        <Badge variant="secondary">Premium</Badge>
                      )}
                    </div>

                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {template.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Download className="h-4 w-4" />
                        <span>{template.download_count} downloads</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Copy className="h-4 w-4" />
                        <span>{template.copy_count} copies</span>
                      </div>
                      <div className="text-muted-foreground">
                        {formatFileSize(template.file_size_bytes)}
                      </div>
                      <div className="text-muted-foreground">
                        Sort: {template.sort_order}
                      </div>
                    </div>

                    {template.tags.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {template.tags.map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
