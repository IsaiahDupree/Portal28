"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  description?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  description,
  className,
}: StatCardProps) {
  const changeColors = {
    positive: "text-brand-green",
    negative: "text-destructive",
    neutral: "text-muted-foreground",
  };

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {Icon && (
            <div className="rounded-full bg-muted p-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {change && (
            <span className={cn("text-sm font-medium", changeColors[changeType])}>
              {change}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface StatCardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatCardGrid({ children, columns = 4, className }: StatCardGridProps) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  );
}
