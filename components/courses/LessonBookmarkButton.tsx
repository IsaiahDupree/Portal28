"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LessonBookmarkButtonProps {
  lessonId: string;
}

export function LessonBookmarkButton({ lessonId }: LessonBookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if lesson is bookmarked
    const checkBookmark = async () => {
      try {
        const response = await fetch(`/api/bookmarks?lessonId=${lessonId}`);
        const data = await response.json();
        setBookmarked(data.bookmarked);
      } catch (error) {
        console.error("Error checking bookmark:", error);
      }
    };

    checkBookmark();
  }, [lessonId]);

  const toggleBookmark = async () => {
    setLoading(true);

    try {
      if (bookmarked) {
        // Remove bookmark
        const response = await fetch(`/api/bookmarks?lessonId=${lessonId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to remove bookmark");
        }

        setBookmarked(false);
        toast({
          title: "Bookmark removed",
          description: "Lesson removed from your bookmarks.",
        });
      } else {
        // Add bookmark
        const response = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId }),
        });

        if (!response.ok) {
          throw new Error("Failed to add bookmark");
        }

        setBookmarked(true);
        toast({
          title: "Lesson bookmarked",
          description: "Lesson saved to your bookmarks.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update bookmark",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={bookmarked ? "default" : "outline"}
      size="sm"
      onClick={toggleBookmark}
      disabled={loading}
      className={bookmarked ? "bg-brand-purple hover:bg-brand-purple/90" : ""}
    >
      {bookmarked ? (
        <>
          <BookmarkCheck className="mr-2 h-4 w-4" />
          Bookmarked
        </>
      ) : (
        <>
          <Bookmark className="mr-2 h-4 w-4" />
          Bookmark
        </>
      )}
    </Button>
  );
}
