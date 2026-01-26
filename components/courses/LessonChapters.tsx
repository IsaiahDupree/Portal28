"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ChevronDown, ChevronUp, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface Chapter {
  id: string;
  timestamp_seconds: number;
  title: string;
  summary?: string;
}

interface LessonChaptersProps {
  chapters: Chapter[];
  onSeek?: (seconds: number) => void;
  currentTime?: number;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function LessonChapters({ chapters, onSeek, currentTime = 0 }: LessonChaptersProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!chapters || chapters.length === 0) {
    return null;
  }

  // Find current chapter based on currentTime
  const currentChapterIndex = chapters.findIndex((ch, idx) => {
    const nextChapter = chapters[idx + 1];
    if (!nextChapter) return true;
    return currentTime >= ch.timestamp_seconds && currentTime < nextChapter.timestamp_seconds;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5" />
            Chapters ({chapters.length})
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-1">
            {chapters.map((chapter, idx) => {
              const isCurrent = idx === currentChapterIndex;
              const isPast = currentTime > chapter.timestamp_seconds && idx < currentChapterIndex;

              return (
                <button
                  key={chapter.id}
                  onClick={() => onSeek?.(chapter.timestamp_seconds)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                    "hover:bg-accent",
                    isCurrent && "bg-primary/10 border border-primary/20",
                    isPast && "opacity-60"
                  )}
                >
                  <div className="flex-shrink-0 flex items-center justify-center w-12 text-xs font-mono text-muted-foreground">
                    {formatTimestamp(chapter.timestamp_seconds)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isCurrent && (
                        <Play className="h-3 w-3 text-primary flex-shrink-0" />
                      )}
                      <span className={cn(
                        "font-medium text-sm",
                        isCurrent && "text-primary"
                      )}>
                        {chapter.title}
                      </span>
                    </div>
                    {chapter.summary && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {chapter.summary}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
