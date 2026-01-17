import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getPortal28SpaceId } from "@/lib/community/community";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Plus, Pin, Edit, Trash2 } from "lucide-react";

export default async function AdminAnnouncementsPage() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) redirect("/login?next=/admin/announcements");

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") redirect("/app");

  const spaceId = await getPortal28SpaceId();

  // Fetch all announcements (including drafts)
  const { data: announcements, error } = await supabase
    .from("announcements")
    .select(`
      *,
      author:author_id (
        id,
        email,
        raw_user_meta_data
      )
    `)
    .eq("space_id", spaceId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  const publishedCount = announcements?.filter(a => a.published_at).length || 0;
  const draftCount = announcements?.filter(a => !a.published_at).length || 0;
  const pinnedCount = announcements?.filter(a => a.is_pinned).length || 0;

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Announcements</h1>
          <p className="text-muted-foreground mt-1">
            Manage community announcements and updates
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin">Back to Admin</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/announcements/new">
              <Plus className="mr-2 h-4 w-4" />
              New Announcement
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Published</CardDescription>
            <CardTitle className="text-3xl">{publishedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Drafts</CardDescription>
            <CardTitle className="text-3xl">{draftCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pinned</CardDescription>
            <CardTitle className="text-3xl">{pinnedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Announcements List */}
      <Card>
        <CardHeader>
          <CardTitle>All Announcements</CardTitle>
          <CardDescription>
            Manage your announcements below. Pinned announcements appear first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {announcements && announcements.length > 0 ? (
            <div className="space-y-3">
              {announcements.map((announcement) => {
                const authorName =
                  announcement.author?.raw_user_meta_data?.full_name ||
                  announcement.author?.email?.split("@")[0] ||
                  "Unknown";

                return (
                  <div
                    key={announcement.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{announcement.title}</h3>
                        {announcement.is_pinned && (
                          <Badge variant="secondary" className="gap-1">
                            <Pin className="h-3 w-3" />
                            Pinned
                          </Badge>
                        )}
                        {!announcement.published_at && (
                          <Badge variant="outline">Draft</Badge>
                        )}
                        {announcement.tags?.map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        By {authorName} •{" "}
                        {announcement.published_at
                          ? `Published ${formatDistanceToNow(
                              new Date(announcement.published_at),
                              { addSuffix: true }
                            )}`
                          : `Created ${formatDistanceToNow(
                              new Date(announcement.created_at),
                              { addSuffix: true }
                            )}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/announcements/${announcement.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/app/community/announcements/${announcement.id}`}>
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No announcements yet. Create your first announcement to get started.
              </p>
              <Button asChild>
                <Link href="/admin/announcements/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Announcement
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
