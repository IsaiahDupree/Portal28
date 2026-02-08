"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function HeaderSearch({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`);
        const data = await response.json();
        setResults(data);
        setIsOpen(true);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setIsOpen(false);
    }
  };

  const handleResultClick = (slug: string, type: "course" | "lesson") => {
    router.push(`/courses/${slug}`);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div ref={searchRef} className={cn("relative", className)}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Search courses, lessons..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query && setIsOpen(true)}
            className="pl-9 pr-9 w-full md:w-64"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </form>

      {isOpen && results && (
        <div className="absolute top-full mt-2 w-full md:w-96 bg-background border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {results.totalResults === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            <>
              {results.courses.length > 0 && (
                <div className="p-2">
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                    Courses
                  </div>
                  {results.courses.map((course: any) => (
                    <button
                      key={course.id}
                      onClick={() => handleResultClick(course.slug, "course")}
                      className="w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors"
                    >
                      <div className="font-medium text-sm">{course.title}</div>
                      {course.instructor_name && (
                        <div className="text-xs text-muted-foreground">
                          by {course.instructor_name}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {results.lessons.length > 0 && (
                <div className="p-2 border-t">
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                    Lessons
                  </div>
                  {results.lessons.map((lesson: any) => (
                    <button
                      key={lesson.id}
                      onClick={() => handleResultClick(lesson.course_slug, "lesson")}
                      className="w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors"
                    >
                      <div className="font-medium text-sm">{lesson.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {lesson.course_title}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="border-t p-2">
                <button
                  onClick={() => {
                    router.push(`/search?q=${encodeURIComponent(query)}`);
                    setIsOpen(false);
                  }}
                  className="w-full text-center text-sm text-primary hover:underline py-2"
                >
                  View all {results.totalResults} results →
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
