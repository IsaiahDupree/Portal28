import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getDefaultSpace } from "@/lib/community/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Megaphone, Pin, Calendar, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: { tag?: string };
}) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login?next=/app/community/announcements");
  }

  const space = await getDefaultSpace();

  let announcements: any[] = [];
  let allTags = new Set<string>();

  if (space) {
    // Build query
    let query = supabase
      .from('announcements')
      .select(`
        *,
        author:author_id (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('space_id', space.id)
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString());

    // Filter by tag if provided
    if (searchParams.tag) {
      query = query.contains('tags', [searchParams.tag]);
    }

    // Order by pinned first, then by published date
    query = query
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false });

    const { data, error } = await query;

    if (!error && data) {
      announcements = data;
      // Collect all unique tags
      data.forEach((announcement: any) => {
        announcement.tags?.forEach((tag: string) => allTags.add(tag));
      });
    }
  }

  const pinnedAnnouncements = announcements.filter(a => a.is_pinned);
  const regularAnnouncements = announcements.filter(a => !a.is_pinned);

  return (
    <main className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/app/community">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Community
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500 text-white">
            <Megaphone className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Announcements</h1>
            <p className="text-muted-foreground">Latest updates and news from Sarah Ashley</p>
          </div>
        </div>
      </div>

      {/* Tag Filter */}
      {allTags.size > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filter by Tag</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={!searchParams.tag ? "default" : "outline"}
                size="sm"
                asChild
              >
                <Link href="/app/community/announcements">All</Link>
              </Button>
              {Array.from(allTags).map((tag) => (
                <Button
                  key={tag}
                  variant={searchParams.tag === tag ? "default" : "outline"}
                  size="sm"
                  asChild
                >
                  <Link href={`/app/community/announcements?tag=${tag}`}>
                    {tag}
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pinned Announcements */}
      {pinnedAnnouncements.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Pin className="h-5 w-5" />
            Pinned Announcements
          </h2>
          {pinnedAnnouncements.map((announcement: any) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} pinned />
          ))}
        </div>
      )}

      {/* Regular Announcements */}
      <div className="space-y-4">
        {regularAnnouncements.length > 0 ? (
          regularAnnouncements.map((announcement: any) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))
        ) : announcements.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchParams.tag
                  ? `No announcements found with the tag "${searchParams.tag}".`
                  : "No announcements yet. Check back soon!"}
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}

function AnnouncementCard({
  announcement,
  pinned = false,
}: {
  announcement: any;
  pinned?: boolean;
}) {
  const authorName =
    announcement.author?.raw_user_meta_data?.full_name ||
    announcement.author?.email?.split("@")[0] ||
    "Sarah Ashley";

  return (
    <Link href={`/app/community/announcements/${announcement.id}`}>
      <Card
        className={`hover:border-primary/50 hover:shadow-md transition-all cursor-pointer ${
          pinned ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/10" : ""
        }`}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {pinned && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    <Pin className="mr-1 h-3 w-3" />
                    Pinned
                  </Badge>
                )}
                {Array.isArray(announcement.tags) && announcement.tags.map((tag: string) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <CardTitle className="text-xl">{announcement.title}</CardTitle>
              {announcement.excerpt && (
                <CardDescription className="mt-2">
                  {announcement.excerpt}
                </CardDescription>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
              <Calendar className="h-4 w-4" />
              {formatDistanceToNow(new Date(announcement.published_at || announcement.created_at), {
                addSuffix: true,
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>By {authorName}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
