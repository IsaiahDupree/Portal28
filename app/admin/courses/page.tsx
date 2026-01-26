import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, GraduationCap, CheckCircle, Link as LinkIcon } from "lucide-react";

export default async function AdminCoursesPage() {
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

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, slug, status, stripe_price_id, price_cents, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses"
        description="Manage your course catalog"
        actions={
          <Button asChild>
            <Link href="/admin/courses/new">
              <Plus className="mr-2 h-4 w-4" />
              New Course
            </Link>
          </Button>
        }
      />

      {!courses || courses.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No courses yet"
          description="Create your first course to start teaching"
          action={
            <Button asChild>
              <Link href="/admin/courses/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Course
              </Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Courses ({courses.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4 font-medium">Title</th>
                    <th className="text-left p-4 font-medium">Slug</th>
                    <th className="text-left p-4 font-medium">Price</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Stripe</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.id} className="border-t hover:bg-muted/50 transition-colors">
                      <td className="p-4">
                        <span className="font-medium">{course.title}</span>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        /{course.slug}
                      </td>
                      <td className="p-4">
                        {course.price_cents ? `$${(course.price_cents / 100).toFixed(2)}` : "—"}
                      </td>
                      <td className="p-4">
                        <Badge variant={course.status === "published" ? "success" : "secondary"}>
                          {course.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {course.stripe_price_id ? (
                          <span className="flex items-center gap-1 text-brand-green text-xs">
                            <CheckCircle className="h-3 w-3" />
                            Connected
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/courses/${course.id}`}>
                            Edit
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
