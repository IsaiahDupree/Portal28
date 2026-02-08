import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, BookOpen, Calendar, ArrowRight } from "lucide-react";

export default async function BookmarksPage() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p>Please log in to view your bookmarks.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Fetch all bookmarks with lesson and course info
  const { data: bookmarks, error } = await supabase
    .from("lesson_bookmarks")
    .select(`
      id,
      lesson_id,
      created_at,
      lessons (
        id,
        title,
        description,
        module_id,
        modules (
          title,
          course_id,
          courses (
            id,
            title,
            slug
          )
        )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching bookmarks:", error);
  }

  const bookmarksWithLessons = (bookmarks || []).filter(b => b.lessons);

  return (
    <main className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Bookmark className="h-8 w-8 text-brand-purple" />
          <h1 className="text-3xl font-bold">My Bookmarks</h1>
        </div>
        <p className="text-muted-foreground">
          Quick access to your bookmarked lessons. Pick up where you left off or revisit important content.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-brand-purple">{bookmarksWithLessons.length}</div>
              <p className="text-sm text-muted-foreground mt-1">Total Bookmarks</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-brand-blue">
                {new Set(bookmarksWithLessons.map(b => (b.lessons as any)?.modules?.courses?.id).filter(Boolean)).size}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Courses</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-brand-green">
                {bookmarksWithLessons.length > 0
                  ? new Date(bookmarksWithLessons[0].created_at).toLocaleDateString()
                  : "N/A"}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Last Bookmarked</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookmarks List */}
      {bookmarksWithLessons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No bookmarks yet</h3>
            <p className="text-muted-foreground mb-4">
              Bookmark lessons you want to revisit or save for later.
            </p>
            <Button asChild>
              <Link href="/app">
                <BookOpen className="mr-2 h-4 w-4" />
                Browse Courses
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookmarksWithLessons.map((bookmark) => {
            const lesson = bookmark.lessons as any;
            const module = lesson?.modules;
            const course = module?.courses;

            return (
              <Card key={bookmark.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-2">
                        <Link
                          href={`/app/lesson/${bookmark.lesson_id}`}
                          className="hover:text-brand-purple transition-colors"
                        >
                          {lesson?.title || "Untitled Lesson"}
                        </Link>
                      </CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {course?.title || "Unknown Course"}
                        </Badge>
                        <span className="text-xs">•</span>
                        <span className="text-xs">{module?.title || "Unknown Module"}</span>
                      </CardDescription>
                    </div>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/app/lesson/${bookmark.lesson_id}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                {lesson?.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {lesson.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Bookmark className="h-3 w-3" />
                      <span>Bookmarked {new Date(bookmark.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
