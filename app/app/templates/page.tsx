"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Copy,
  FileText,
  Image as ImageIcon,
  Code,
  Briefcase,
  TrendingUp,
  Filter,
  Check
} from "lucide-react";

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
  is_premium: boolean;
  has_access: boolean;
  sort_order: number;
  created_at: string;
}

const categories = [
  { value: null, label: "All Categories", icon: Filter },
  { value: "general", label: "General", icon: FileText },
  { value: "design", label: "Design", icon: ImageIcon },
  { value: "code", label: "Code", icon: Code },
  { value: "business", label: "Business", icon: Briefcase },
  { value: "marketing", label: "Marketing", icon: TrendingUp },
  { value: "other", label: "Other", icon: FileText },
];

export default function TemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory]);

  async function fetchTemplates() {
    try {
      setLoading(true);
      const url = new URL("/api/templates", window.location.origin);
      if (selectedCategory) {
        url.searchParams.set("category", selectedCategory);
      }

      const response = await fetch(url.toString());

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

  async function handleDownload(template: Template) {
    if (!template.has_access) {
      alert("You need to purchase access to download this premium template");
      return;
    }

    if (!template.file_url) {
      alert("This template does not have a downloadable file");
      return;
    }

    try {
      const response = await fetch(`/api/templates/${template.id}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "download" }),
      });

      if (response.ok) {
        const data = await response.json();

        // Trigger browser download
        if (data.file_url) {
          const link = document.createElement("a");
          link.href = data.file_url;
          link.download = data.file_name || "template";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        // Update download count locally
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === template.id
              ? { ...t, download_count: t.download_count + 1 }
              : t
          )
        );
      } else {
        const data = await response.json();
        alert(data.error || "Failed to download template");
      }
    } catch (err) {
      console.error("Error downloading template:", err);
      alert("Failed to download template");
    }
  }

  async function handleCopy(template: Template) {
    if (!template.has_access) {
      alert("You need to purchase access to copy this premium template");
      return;
    }

    if (!template.content) {
      alert("This template does not have copyable content");
      return;
    }

    try {
      const response = await fetch(`/api/templates/${template.id}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "copy" }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.content) {
          await navigator.clipboard.writeText(data.content);
          setCopiedId(template.id);
          setTimeout(() => setCopiedId(null), 2000);

          // Update copy count locally
          setTemplates((prev) =>
            prev.map((t) =>
              t.id === template.id
                ? { ...t, copy_count: t.copy_count + 1 }
                : t
            )
          );
        }
      } else {
        const data = await response.json();
        alert(data.error || "Failed to copy template");
      }
    } catch (err) {
      console.error("Error copying template:", err);
      alert("Failed to copy template");
    }
  }

  function formatFileSize(bytes?: number) {
    if (!bytes) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  }

  const getCategoryIcon = (category: string) => {
    const cat = categories.find((c) => c.value === category);
    return cat ? cat.icon : FileText;
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Templates Vault</h1>
        <p className="text-muted-foreground">
          Browse and download professional templates for your projects
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.value;

          return (
            <Button
              key={category.value || "all"}
              variant={isSelected ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.value)}
              className="whitespace-nowrap"
            >
              <Icon className="mr-2 h-4 w-4" />
              {category.label}
            </Button>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded mb-8">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-10 text-center text-muted-foreground">
                No templates found in this category.
              </CardContent>
            </Card>
          ) : (
            templates.map((template) => {
              const CategoryIcon = getCategoryIcon(template.category);
              const isCopied = copiedId === template.id;

              return (
                <Card key={template.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="text-lg">{template.title}</CardTitle>
                      <CategoryIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="capitalize">
                        {template.category}
                      </Badge>
                      {template.is_premium && (
                        <Badge variant="secondary">Premium</Badge>
                      )}
                      {!template.has_access && template.is_premium && (
                        <Badge variant="destructive">Locked</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    {template.preview_url && (
                      <div className="mb-4 rounded-md overflow-hidden bg-gray-100">
                        <img
                          src={template.preview_url}
                          alt={template.title}
                          className="w-full h-40 object-cover"
                        />
                      </div>
                    )}

                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-4 flex-1">
                        {template.description}
                      </p>
                    )}

                    {template.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap mb-4">
                        {template.tags.slice(0, 3).map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-4 text-xs text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        <span>{template.download_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Copy className="h-3 w-3" />
                        <span>{template.copy_count}</span>
                      </div>
                      {template.file_size_bytes && (
                        <div>{formatFileSize(template.file_size_bytes)}</div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {template.file_url && (
                        <Button
                          onClick={() => handleDownload(template)}
                          disabled={!template.has_access}
                          className="flex-1"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      )}
                      {template.content && (
                        <Button
                          variant="outline"
                          onClick={() => handleCopy(template)}
                          disabled={!template.has_access}
                          className="flex-1"
                        >
                          {isCopied ? (
                            <>
                              <Check className="mr-2 h-4 w-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
