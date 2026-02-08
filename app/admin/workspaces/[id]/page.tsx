"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  brand_color: string | null;
  status: string;
  is_default: boolean;
  products?: any[];
}

export default function WorkspaceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadWorkspace();
  }, [params.id]);

  async function loadWorkspace() {
    const res = await fetch(`/api/admin/workspaces/${params.id}`);
    const data = await res.json();

    if (res.ok) {
      setWorkspace(data.workspace);
    } else {
      setError(data.error || "Failed to load workspace");
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const slug = form.get("slug") as string;
    const description = form.get("description") as string;
    const logoUrl = form.get("logo_url") as string;
    const brandColor = form.get("brand_color") as string;
    const status = form.get("status") as string;
    const isDefault = form.get("is_default") === "on";

    const res = await fetch(`/api/admin/workspaces/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        description,
        logo_url: logoUrl,
        brand_color: brandColor,
        status,
        is_default: isDefault
      })
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to update workspace");
      setSaving(false);
      return;
    }

    setSuccess("Workspace updated successfully");
    setWorkspace(data.workspace);
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this workspace? This action cannot be undone.")) {
      return;
    }

    const res = await fetch(`/api/admin/workspaces/${params.id}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to delete workspace");
      return;
    }

    router.push("/admin/workspaces");
  }

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!workspace) {
    return <div className="p-8">Workspace not found</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={workspace.name}
        description={`Manage ${workspace.name}`}
        backLink="/admin/workspaces"
        actions={
          <Button variant="destructive" onClick={handleDelete} disabled={workspace.is_default}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Workspace
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="products">Products ({workspace.products?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Settings</CardTitle>
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
                    defaultValue={workspace.name}
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
                    defaultValue={workspace.slug}
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
                    defaultValue={workspace.description || ""}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo_url">Logo URL</Label>
                  <Input
                    id="logo_url"
                    name="logo_url"
                    type="url"
                    defaultValue={workspace.logo_url || ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand_color">Brand Color</Label>
                  <Input
                    id="brand_color"
                    name="brand_color"
                    type="color"
                    defaultValue={workspace.brand_color || "#000000"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <select
                    id="status"
                    name="status"
                    className="w-full p-2 border rounded-md"
                    defaultValue={workspace.status}
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_default"
                    name="is_default"
                    defaultChecked={workspace.is_default}
                  />
                  <Label htmlFor="is_default" className="font-normal">
                    Set as default workspace
                  </Label>
                </div>

                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Products in this Workspace</CardTitle>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!workspace.products || workspace.products.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No products yet. Add products to this workspace to get started.
                </p>
              ) : (
                <div className="space-y-4">
                  {workspace.products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {product.product_type} • {product.status}
                        </p>
                      </div>
                      <Badge variant={product.status === "published" ? "success" : "secondary"}>
                        {product.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
