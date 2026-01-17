import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getDefaultSpace } from "@/lib/community/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Megaphone, Pin, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { MarkdownContent } from "@/components/community/MarkdownContent";

export default async function AnnouncementDetailPage({
  params,
}: {
  params: { announcementId: string };
}) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login?next=/app/community/announcements");
  }

  const space = await getDefaultSpace();
  if (!space) {
    redirect("/app/community/announcements");
  }

  // Fetch the announcement
  const { data: announcement, error } = await supabase
    .from('announcements')
    .select(`
      *,
      author:author_id (
        id,
        email,
        raw_user_meta_data
      )
    `)
    .eq('id', params.announcementId)
    .eq('space_id', space.id)
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .single();

  if (error || !announcement) {
    return (
      <main className="container max-w-4xl mx-auto py-6 px-4">
        <Card className="text-center py-12">
          <CardContent>
            <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Announcement Not Found</h1>
            <p className="text-muted-foreground mb-4">
              This announcement may have been removed or is not yet published.
            </p>
            <Button asChild variant="outline">
              <Link href="/app/community/announcements">Back to Announcements</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const authorName =
    announcement.author?.raw_user_meta_data?.full_name ||
    announcement.author?.email?.split("@")[0] ||
    "Sarah Ashley";

  return (
    <main className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/app/community/announcements">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Announcements
          </Link>
        </Button>
      </div>

      {/* Announcement Content */}
      <Card className={announcement.is_pinned ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/10" : ""}>
        <CardHeader>
          <div className="space-y-3">
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {announcement.is_pinned && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  <Pin className="mr-1 h-3 w-3" />
                  Pinned
                </Badge>
              )}
              {Array.isArray(announcement.tags) && announcement.tags.map((tag: string) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Title */}
            <CardTitle className="text-3xl">{announcement.title}</CardTitle>

            {/* Metadata */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>By {authorName}</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {formatDistanceToNow(new Date(announcement.published_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Excerpt */}
          {announcement.excerpt && (
            <p className="text-lg text-muted-foreground border-l-4 border-primary/30 pl-4 py-2">
              {announcement.excerpt}
            </p>
          )}

          {/* Content */}
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <MarkdownContent content={announcement.content} />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
