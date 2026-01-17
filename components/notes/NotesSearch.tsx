"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight, Calendar } from "lucide-react";

interface Note {
  id: string;
  content: string;
  lesson_id: string;
  created_at: string;
  updated_at: string;
  lessons: {
    id: string;
    title: string;
    module_id: string;
    modules: {
      title: string;
      course_id: string;
      courses: {
        id: string;
        title: string;
        slug: string;
      };
    };
  } | null;
}

interface NotesSearchProps {
  notes: Note[];
}

export function NotesSearch({ notes }: NotesSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) {
      return notes;
    }

    const query = searchQuery.toLowerCase();
    return notes.filter((note) => {
      const lesson = note.lessons as any;
      const module = lesson?.modules;
      const course = module?.courses;

      return (
        note.content.toLowerCase().includes(query) ||
        lesson?.title?.toLowerCase().includes(query) ||
        module?.title?.toLowerCase().includes(query) ||
        course?.title?.toLowerCase().includes(query)
      );
    });
  }, [notes, searchQuery]);

  return (
    <div className="mb-8">
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search notes by content, lesson, module, or course..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {searchQuery && (
        <p className="text-sm text-muted-foreground mb-4">
          Found {filteredNotes.length} {filteredNotes.length === 1 ? "note" : "notes"}
        </p>
      )}

      <div className="space-y-4">
        {filteredNotes.map((note) => {
          const lesson = note.lessons as any;
          const module = lesson?.modules;
          const course = module?.courses;

          return (
            <Card key={note.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg mb-2">
                      <Link
                        href={`/app/lesson/${note.lesson_id}`}
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
                    <Link href={`/app/lesson/${note.lesson_id}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {note.content}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Updated {new Date(note.updated_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
