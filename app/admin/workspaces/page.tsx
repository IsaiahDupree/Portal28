import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Layers, Star } from "lucide-react";

export default async function AdminWorkspacesPage() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/app");
  }

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select(`
      *,
      products(count)
    `)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspaces"
        description="Manage your workspace experiences"
        actions={
          <Button asChild>
            <Link href="/admin/workspaces/new">
              <Plus className="mr-2 h-4 w-4" />
              New Workspace
            </Link>
          </Button>
        }
      />

      {!workspaces || workspaces.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No workspaces yet"
          description="Create your first workspace to organize your products"
          action={
            <Button asChild>
              <Link href="/admin/workspaces/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Workspace
              </Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Workspaces ({workspaces.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4 font-medium">Name</th>
                    <th className="text-left p-4 font-medium">Slug</th>
                    <th className="text-left p-4 font-medium">Products</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Default</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaces.map((workspace: any) => (
                    <tr key={workspace.id} className="border-t hover:bg-muted/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {workspace.logo_url && (
                            <img
                              src={workspace.logo_url}
                              alt={workspace.name}
                              className="w-6 h-6 rounded"
                            />
                          )}
                          <span className="font-medium">{workspace.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        /{workspace.slug}
                      </td>
                      <td className="p-4">
                        {workspace.products?.[0]?.count || 0}
                      </td>
                      <td className="p-4">
                        <Badge variant={workspace.status === "active" ? "success" : "secondary"}>
                          {workspace.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {workspace.is_default && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/workspaces/${workspace.id}`}>
                            Manage
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
