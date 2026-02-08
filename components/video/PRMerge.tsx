"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { GitMergeIcon, CheckCircle2, Sparkles } from "lucide-react";

interface PRMergeProps {
  prNumber: number;
  title: string;
  sourceBranch: string;
  targetBranch: string;
  author?: string;
  animated?: boolean;
  animationDuration?: number; // ms for merge animation
  className?: string;
}

export function PRMerge({
  prNumber,
  title,
  sourceBranch,
  targetBranch,
  author = "Developer",
  animated = true,
  animationDuration = 1500,
  className
}: PRMergeProps) {
  const [showMerge, setShowMerge] = useState(!animated);
  const [showSuccess, setShowSuccess] = useState(!animated);
  const [isMerging, setIsMerging] = useState(false);

  useEffect(() => {
    if (!animated) {
      setShowMerge(true);
      setShowSuccess(true);
      return;
    }

    // Start merge animation after a brief delay
    const startTimer = setTimeout(() => {
      setIsMerging(true);
      setShowMerge(true);
    }, 300);

    // Show success state after merge animation
    const successTimer = setTimeout(() => {
      setIsMerging(false);
      setShowSuccess(true);
    }, 300 + animationDuration);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(successTimer);
    };
  }, [animated, animationDuration]);

  return (
    <Card className={cn("overflow-hidden bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/30", className)}>
      <div className="p-6">
        {/* PR Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className={cn(
            "flex-shrink-0 transition-all duration-500",
            showSuccess ? "text-green-400" : "text-purple-400"
          )}>
            {showSuccess ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <GitMergeIcon className={cn(
                "h-6 w-6",
                isMerging && "animate-spin"
              )} />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-purple-400 font-mono text-sm">#{prNumber}</span>
              <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
            </div>

            {author && (
              <p className="text-sm text-slate-400">by {author}</p>
            )}
          </div>

          {/* Celebratory sparkles */}
          {showSuccess && animated && (
            <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
          )}
        </div>

        {/* Branch Merge Visual */}
        {showMerge && (
          <div className="relative">
            <div className="flex items-center gap-3 text-sm">
              {/* Source Branch */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                  <span className="font-mono text-blue-300 bg-blue-500/10 px-2 py-1 rounded">
                    {sourceBranch}
                  </span>
                </div>
              </div>

              {/* Merge Arrow */}
              <div className={cn(
                "transition-all duration-500",
                isMerging ? "scale-110 text-purple-400" : "text-slate-500"
              )}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(isMerging && "animate-pulse")}
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>

              {/* Target Branch */}
              <div className="flex-1">
                <div className="flex items-center gap-2 justify-end">
                  <span className="font-mono text-green-300 bg-green-500/10 px-2 py-1 rounded">
                    {targetBranch}
                  </span>
                  <div className={cn(
                    "h-2 w-2 rounded-full transition-colors duration-300",
                    showSuccess ? "bg-green-400" : "bg-slate-500"
                  )}></div>
                </div>
              </div>
            </div>

            {/* Success Message */}
            {showSuccess && (
              <div className={cn(
                "mt-4 text-center transition-all duration-500",
                animated ? "animate-in fade-in slide-in-from-bottom-2" : ""
              )}>
                <p className="text-green-400 font-medium flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Successfully merged!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
