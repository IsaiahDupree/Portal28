"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Video, Search as SearchIcon } from "lucide-react";

interface SearchResultsProps {
  results: {
    query: string;
    courses: any[];
    lessons: any[];
    totalResults: number;
    searchDurationMs: number;
  };
  query: string;
}

export function SearchResults({ results, query }: SearchResultsProps) {
  const { courses, lessons, totalResults, searchDurationMs } = results;

  const trackClick = async (resultId: string, resultType: "course" | "lesson", rank: number) => {
    try {
      await fetch("/api/search/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultId,
          resultType,
          resultRank: rank,
        }),
      });
    } catch (error) {
      console.error("Failed to track search click:", error);
    }
  };

  if (totalResults === 0) {
    return (
      <div className="text-center py-12">
        <SearchIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No results found</h3>
        <p className="text-muted-foreground">
          Try adjusting your search query or filters
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Found {totalResults} result{totalResults !== 1 ? "s" : ""} for "{query}"
          <span className="ml-2">({searchDurationMs}ms)</span>
        </p>
      </div>

      {courses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            Courses ({courses.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course, index) => (
              <Link
                key={course.id}
                href={`/courses/${course.slug}`}
                onClick={() => trackClick(course.id, "course", index)}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  {course.thumbnail_url && (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-40 object-cover rounded-t-lg"
                    />
                  )}
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                    {course.instructor_name && (
                      <CardDescription>by {course.instructor_name}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {course.description}
                    </p>
                    <div className="flex items-center justify-between">
                      {course.category && (
                        <Badge variant="secondary">{course.category}</Badge>
                      )}
                      {course.price_cents > 0 ? (
                        <span className="font-bold">
                          ${(course.price_cents / 100).toFixed(2)}
                        </span>
                      ) : (
                        <Badge variant="outline">Free</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {lessons.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Video className="w-6 h-6" />
            Lessons ({lessons.length})
          </h2>
          <div className="space-y-3">
            {lessons.map((lesson, index) => (
              <Link
                key={lesson.id}
                href={`/courses/${lesson.course_slug}`}
                onClick={() => trackClick(lesson.id, "lesson", index)}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{lesson.title}</CardTitle>
                        <CardDescription>
                          {lesson.course_title}
                          {lesson.duration_seconds && (
                            <span className="ml-2">
                              • {Math.floor(lesson.duration_seconds / 60)} min
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <Video className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-4" />
                    </div>
                  </CardHeader>
                  {lesson.description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {lesson.description}
                      </p>
                    </CardContent>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
