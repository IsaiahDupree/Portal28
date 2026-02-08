"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/ui/page-header";

export default function NewWorkspacePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const slug = form.get("slug") as string;
    const description = form.get("description") as string;
    const logoUrl = form.get("logo_url") as string;
    const brandColor = form.get("brand_color") as string;
    const isDefault = form.get("is_default") === "on";

    const res = await fetch("/api/admin/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        description,
        logo_url: logoUrl,
        brand_color: brandColor,
        is_default: isDefault
      })
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to create workspace");
      setLoading(false);
      return;
    }

    router.push(`/admin/workspaces/${data.workspace.id}`);
  }

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Workspace"
        description="Create a new workspace experience"
        backLink="/admin/workspaces"
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Workspace Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                placeholder="My Workspace"
                onChange={(e) => {
                  const slugInput = document.querySelector('input[name="slug"]') as HTMLInputElement;
                  if (slugInput && !slugInput.dataset.edited) {
                    slugInput.value = generateSlug(e.target.value);
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                name="slug"
                type="text"
                required
                pattern="[a-z0-9-]+"
                placeholder="my-workspace"
                onChange={(e) => {
                  (e.target as HTMLInputElement).dataset.edited = "true";
                }}
              />
              <p className="text-sm text-muted-foreground">
                URL-friendly name (lowercase letters, numbers, and hyphens only)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe your workspace..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                name="logo_url"
                type="url"
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand_color">Brand Color</Label>
              <div className="flex gap-2">
                <Input
                  id="brand_color"
                  name="brand_color"
                  type="color"
                  className="w-20"
                />
                <Input
                  type="text"
                  placeholder="#000000"
                  className="flex-1"
                  onChange={(e) => {
                    const colorInput = document.querySelector('input[type="color"]') as HTMLInputElement;
                    if (colorInput) colorInput.value = e.target.value;
                  }}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="is_default" name="is_default" />
              <Label htmlFor="is_default" className="font-normal">
                Set as default workspace
              </Label>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Workspace"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/workspaces">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
