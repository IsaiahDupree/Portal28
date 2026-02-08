"use client";

import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ComparisonSide {
  title: string;
  content: ReactNode;
  color?: "blue" | "green" | "red" | "purple";
}

interface ComparisonViewProps {
  left: ComparisonSide;
  right: ComparisonSide;
  className?: string;
  orientation?: "horizontal" | "vertical";
}

const COLOR_CLASSES = {
  blue: "border-blue-500 bg-blue-50",
  green: "border-green-500 bg-green-50",
  red: "border-red-500 bg-red-50",
  purple: "border-purple-500 bg-purple-50"
};

const HEADER_COLORS = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  red: "bg-red-500",
  purple: "bg-purple-500"
};

export function ComparisonView({
  left,
  right,
  className,
  orientation = "horizontal"
}: ComparisonViewProps) {
  const leftColor = left.color || "blue";
  const rightColor = right.color || "green";

  const containerClass = orientation === "horizontal"
    ? "grid grid-cols-1 md:grid-cols-2 gap-4"
    : "flex flex-col gap-4";

  return (
    <div className={cn(containerClass, className)}>
      {/* Left Side */}
      <Card className={cn("overflow-hidden border-2", COLOR_CLASSES[leftColor])}>
        <div className={cn("p-3 text-white font-semibold", HEADER_COLORS[leftColor])}>
          {left.title}
        </div>
        <div className="p-4 bg-white">
          {left.content}
        </div>
      </Card>

      {/* Right Side */}
      <Card className={cn("overflow-hidden border-2", COLOR_CLASSES[rightColor])}>
        <div className={cn("p-3 text-white font-semibold", HEADER_COLORS[rightColor])}>
          {right.title}
        </div>
        <div className="p-4 bg-white">
          {right.content}
        </div>
      </Card>
    </div>
  );
}
