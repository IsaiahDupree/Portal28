"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { GitCommitIcon, GitBranchIcon } from "lucide-react";

interface GitCommitProps {
  hash: string;
  message: string;
  author?: string;
  authorAvatar?: string;
  branch?: string;
  timestamp?: string;
  animated?: boolean;
  animationSpeed?: number; // characters per second for hash
  className?: string;
}

export function GitCommit({
  hash,
  message,
  author = "Developer",
  authorAvatar,
  branch = "main",
  timestamp = "just now",
  animated = true,
  animationSpeed = 10,
  className
}: GitCommitProps) {
  const [displayedHash, setDisplayedHash] = useState(animated ? "" : hash);
  const [showContent, setShowContent] = useState(!animated);

  // Hash typing animation
  useEffect(() => {
    if (!animated) {
      setDisplayedHash(hash);
      setShowContent(true);
      return;
    }

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= hash.length) {
        setDisplayedHash(hash.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
        setShowContent(true);
      }
    }, 1000 / animationSpeed);

    return () => clearInterval(interval);
  }, [hash, animated, animationSpeed]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className={cn("overflow-hidden bg-slate-900 text-slate-50 border-slate-700", className)}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar className="h-10 w-10 flex-shrink-0">
            {authorAvatar ? (
              <AvatarImage src={authorAvatar} alt={author} />
            ) : (
              <AvatarFallback className="bg-slate-700 text-slate-200">
                {getInitials(author)}
              </AvatarFallback>
            )}
          </Avatar>

          {/* Commit Info */}
          <div className="flex-1 min-w-0">
            {/* Commit Message */}
            <div className="flex items-start gap-2 mb-2">
              <GitCommitIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-slate-400" />
              <p className="font-medium text-slate-100">{message}</p>
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
              {/* Hash - always visible for animation */}
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs bg-slate-800 px-1.5 py-0.5 rounded text-green-400">
                  {displayedHash}
                  {animated && displayedHash.length < hash.length && (
                    <span className="animate-pulse">▋</span>
                  )}
                </span>
              </div>

              {/* Branch, Author, Timestamp - shown after animation */}
              {showContent && (
                <>
                  {/* Branch */}
                  {branch && (
                    <div className="flex items-center gap-1">
                      <GitBranchIcon className="h-3 w-3" />
                      <span className="font-mono text-xs bg-slate-800 px-1.5 py-0.5 rounded">
                        {branch}
                      </span>
                    </div>
                  )}

                  {/* Author and Timestamp */}
                  <div className="flex items-center gap-1">
                    <span>{author}</span>
                    <span>•</span>
                    <span>{timestamp}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
