"use client";

import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, Code, Lightbulb, CheckCircle } from "lucide-react";

interface DevVlogSection {
  type: "hook" | "context" | "code-walk" | "insight" | "result-cta";
  duration: number; // in seconds
  content: ReactNode;
  timestamp?: number; // optional timestamp in seconds from start
}

interface DevVlogTemplateProps {
  title: string;
  sections: DevVlogSection[];
  aspectRatio?: "9:16" | "16:9";
  totalDuration?: number;
  className?: string;
}

const SECTION_CONFIG = {
  hook: {
    icon: CheckCircle,
    label: "Hook",
    color: "bg-blue-500",
    recommendedDuration: "3-5s"
  },
  context: {
    icon: Code,
    label: "Context",
    color: "bg-purple-500",
    recommendedDuration: "10-15s"
  },
  "code-walk": {
    icon: Code,
    label: "Code Walk",
    color: "bg-green-500",
    recommendedDuration: "30-60s"
  },
  insight: {
    icon: Lightbulb,
    label: "Key Insight",
    color: "bg-yellow-500",
    recommendedDuration: "10-15s"
  },
  "result-cta": {
    icon: CheckCircle,
    label: "Result & CTA",
    color: "bg-pink-500",
    recommendedDuration: "15-20s"
  }
};

export function DevVlogTemplate({
  title,
  sections,
  aspectRatio = "16:9",
  totalDuration,
  className
}: DevVlogTemplateProps) {
  const calculatedDuration = totalDuration || sections.reduce((sum, s) => sum + s.duration, 0);

  // Validate duration is within acceptable range (60-180 seconds)
  const isValidDuration = calculatedDuration >= 60 && calculatedDuration <= 180;

  // Calculate aspect ratio class
  const aspectRatioClass = aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-video";

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Video Header */}
      <div className="border-b bg-slate-900 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">{title}</h3>
          <div className="flex items-center gap-2">
            <Badge variant={isValidDuration ? "default" : "destructive"} className="gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(calculatedDuration)}
            </Badge>
            <Badge variant="outline" className="text-white border-white">
              {aspectRatio}
            </Badge>
          </div>
        </div>
      </div>

      {/* Video Container */}
      <div className={cn("bg-black", aspectRatioClass)}>
        {/* Placeholder for actual video content */}
        <div className="h-full w-full flex items-center justify-center text-slate-400">
          <p className="text-sm">Video Content Area ({aspectRatio})</p>
        </div>
      </div>

      {/* Timeline/Sections */}
      <div className="border-t bg-slate-50 p-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">
            Video Structure ({sections.length} sections)
          </h4>

          {sections.map((section, index) => {
            const config = SECTION_CONFIG[section.type];
            const Icon = config.icon;
            const startTime = section.timestamp || sections
              .slice(0, index)
              .reduce((sum, s) => sum + s.duration, 0);

            return (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg border bg-white p-3"
              >
                <div className={cn("rounded-full p-2 text-white", config.color)}>
                  <Icon className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-sm text-slate-900">
                      {config.label}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{formatDuration(startTime)} - {formatDuration(startTime + section.duration)}</span>
                      <Badge variant="secondary" className="text-xs">
                        {section.duration}s
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mb-2">
                    Recommended: {config.recommendedDuration}
                  </p>

                  <div className="mt-2 text-sm text-slate-700">
                    {section.content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Duration Validation Warning */}
        {!isValidDuration && (
          <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> Total duration should be between 60-180 seconds.
              Current: {calculatedDuration}s
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins === 0) {
    return `${secs}s`;
  }

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Helper function to create a dev vlog structure
export function createDevVlog(config: {
  title: string;
  hook: { duration: number; content: ReactNode };
  context: { duration: number; content: ReactNode };
  codeWalk: { duration: number; content: ReactNode };
  insight: { duration: number; content: ReactNode };
  resultCta: { duration: number; content: ReactNode };
  aspectRatio?: "9:16" | "16:9";
}): { title: string; sections: DevVlogSection[]; aspectRatio: "9:16" | "16:9" } {
  return {
    title: config.title,
    aspectRatio: config.aspectRatio || "16:9",
    sections: [
      {
        type: "hook",
        duration: config.hook.duration,
        content: config.hook.content
      },
      {
        type: "context",
        duration: config.context.duration,
        content: config.context.content
      },
      {
        type: "code-walk",
        duration: config.codeWalk.duration,
        content: config.codeWalk.content
      },
      {
        type: "insight",
        duration: config.insight.duration,
        content: config.insight.content
      },
      {
        type: "result-cta",
        duration: config.resultCta.duration,
        content: config.resultCta.content
      }
    ]
  };
}
