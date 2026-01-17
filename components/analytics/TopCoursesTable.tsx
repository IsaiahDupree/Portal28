import Link from "next/link";
import type { TopCourse } from "@/lib/db/analytics";

interface TopCoursesTableProps {
  courses: TopCourse[];
}

export function TopCoursesTable({ courses }: TopCoursesTableProps) {
  if (courses.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-6">
        No course sales yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {courses.map((course, index) => (
        <Link
          key={course.id}
          href={`/admin/courses/${course.id}`}
          className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
              #{index + 1}
            </div>
            <div>
              <div className="font-medium">{course.title}</div>
              <div className="text-xs text-muted-foreground">
                {Number(course.orders)} {Number(course.orders) === 1 ? "sale" : "sales"}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold">
              ${(Number(course.revenue) / 100).toFixed(2)}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
