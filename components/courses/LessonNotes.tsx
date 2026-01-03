"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StickyNote, Save, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface LessonNotesProps {
  lessonId: string;
  userId?: string;
  initialNotes?: string;
  className?: string;
}

export function LessonNotes({ lessonId, userId, initialNotes = "", className }: LessonNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHasChanges(notes !== initialNotes);
  }, [notes, initialNotes]);

  // Auto-save after 2 seconds of no typing
  useEffect(() => {
    if (!hasChanges || !userId) return;

    const timeout = setTimeout(() => {
      saveNotes();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [notes, hasChanges, userId]);

  async function saveNotes() {
    if (!userId) return;
    
    setSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, content: notes }),
      });

      if (res.ok) {
        setLastSaved(new Date());
        setHasChanges(false);
      }
    } catch (error) {
      console.error("Failed to save notes:", error);
    } finally {
      setSaving(false);
    }
  }

  if (!userId) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <StickyNote className="h-5 w-5" />
            Your Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Lock className="h-8 w-8 mb-2" />
            <p className="text-sm">Sign in to take private notes</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <StickyNote className="h-5 w-5" />
            Your Notes
            <Badge variant="outline" className="ml-2 text-xs">
              Private
            </Badge>
          </CardTitle>
          {lastSaved && (
            <span className="text-xs text-muted-foreground">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={notes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
          placeholder="Take notes on this lesson... (auto-saves)"
          className="min-h-[150px] resize-none"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Your notes are private and only visible to you and course admins.
          </p>
          <Button 
            size="sm" 
            onClick={saveNotes} 
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-3 w-3" />
                Save
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
