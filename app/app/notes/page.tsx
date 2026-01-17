import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StickyNote, BookOpen, Calendar, Search, ArrowRight } from "lucide-react";
import { NotesSearch } from "@/components/notes/NotesSearch";

export default async function NotesPage() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p>Please log in to view your notes.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Fetch all notes with lesson and course info
  const { data: notes, error } = await supabase
    .from("lesson_notes")
    .select(`
      id,
      content,
      lesson_id,
      created_at,
      updated_at,
      lessons (
        id,
        title,
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
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching notes:", error);
  }

  const notesWithLessons = (notes || []).filter(n => n.lessons && n.content?.trim());

  return (
    <main className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <StickyNote className="h-8 w-8 text-brand-purple" />
          <h1 className="text-3xl font-bold">My Notes</h1>
        </div>
        <p className="text-muted-foreground">
          All your lesson notes in one place. Search and review your learning journey.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-brand-purple">{notesWithLessons.length}</div>
              <p className="text-sm text-muted-foreground mt-1">Total Notes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-brand-blue">
                {new Set(notesWithLessons.map(n => (n.lessons as any)?.modules?.courses?.id).filter(Boolean)).size}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Courses with Notes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-brand-green">
                {notesWithLessons.length > 0
                  ? new Date(notesWithLessons[0].updated_at).toLocaleDateString()
                  : "N/A"}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Last Updated</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes List with Search */}
      {notesWithLessons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <StickyNote className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No notes yet</h3>
            <p className="text-muted-foreground mb-4">
              Start taking notes on lessons to build your personal knowledge base.
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
        <NotesSearch notes={notesWithLessons} />
      )}
    </main>
  );
}
