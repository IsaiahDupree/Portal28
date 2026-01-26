"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  text?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  fullPage?: boolean;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function LoadingState({
  text = "Loading...",
  size = "md",
  className,
  fullPage = false,
}: LoadingStateProps) {
  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        fullPage && "min-h-[50vh]",
        className
      )}
    >
      <Loader2 className={cn("animate-spin text-muted-foreground", sizeClasses[size])} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}

export function LoadingSpinner({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  return <Loader2 className={cn("animate-spin", sizeClasses[size], className)} />;
}
