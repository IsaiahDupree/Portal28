import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getDefaultSpace, getAnnouncements } from "@/lib/community/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Megaphone, Pin, Calendar, Bell } from "lucide-react";

export default async function AnnouncementsPage() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login?next=/app/community/announcements");
  }

  const space = await getDefaultSpace();
  
  let announcements: any[] = [];
  if (space) {
    announcements = await getAnnouncements(space.id, 50);
  }

  // Default announcements if none exist
  const defaultAnnouncements = [
    {
      id: "welcome",
      title: "Welcome to Portal28! 🎉",
      body: "We're excited to have you here! This is your community hub where you'll find course updates, new content announcements, and important information.\n\nMake sure to check back regularly for the latest news and updates from Sarah Ashley.",
      is_pinned: true,
      created_at: new Date().toISOString(),
      tags: ["welcome", "getting-started"],
    },
    {
      id: "community-launch",
      title: "Community Features Now Live",
      body: "The Portal28 community is now live! Here's what you can do:\n\n• Join discussions in the Forums\n• Access exclusive resources\n• Connect with other members\n• Share your wins and success stories\n\nWe can't wait to see you engage with the community!",
      is_pinned: false,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      tags: ["update", "community"],
    },
  ];

  const displayAnnouncements = announcements.length > 0 ? announcements : defaultAnnouncements;

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

      {/* Subscribe Card */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-amber-600" />
            <p className="text-sm">Get notified when new announcements are posted</p>
          </div>
          <Button size="sm" variant="outline">
            <Bell className="mr-2 h-4 w-4" />
            Subscribe
          </Button>
        </CardContent>
      </Card>

      {/* Announcements List */}
      <div className="space-y-4">
        {displayAnnouncements.map((announcement: any) => (
          <Card key={announcement.id} className={announcement.is_pinned ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/10" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {announcement.is_pinned && (
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
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
                  <Calendar className="h-4 w-4" />
                  {new Date(announcement.created_at).toLocaleDateString()}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                {announcement.body}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {displayAnnouncements.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No announcements yet. Check back soon!</p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
