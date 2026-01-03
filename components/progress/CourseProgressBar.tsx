"use client";

type Props = {
  lessonsCompleted: number;
  totalLessons: number;
  className?: string;
};

export default function CourseProgressBar({
  lessonsCompleted,
  totalLessons,
  className = "",
}: Props) {
  const percent = totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">
          {lessonsCompleted} of {totalLessons} lessons
        </span>
        <span className="font-medium">{percent}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-black rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
