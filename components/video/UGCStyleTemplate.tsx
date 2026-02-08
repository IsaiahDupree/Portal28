"use client";

import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface UGCSection {
  type: "hook" | "problem" | "solution" | "cta";
  duration: number;
  content: ReactNode;
  timestamp?: number;
}

interface BrandingConfig {
  logo?: string;
  watermark?: string;
  colorScheme?: "light" | "dark" | "auto";
  fontFamily?: string;
}

interface UGCStyleTemplateProps {
  title: string;
  trendingFormat: string; // Description of the trending format being recreated
  sections: UGCSection[];
  branding?: BrandingConfig;
  duration?: number;
  className?: string;
  authenticStyle?: "casual" | "professional" | "playful";
}

const SECTION_CONFIG = {
  hook: { label: "Hook", color: "bg-pink-500" },
  problem: { label: "Problem", color: "bg-orange-500" },
  solution: { label: "Solution", color: "bg-green-500" },
  cta: { label: "Call to Action", color: "bg-blue-500" }
};

export function UGCStyleTemplate({
  title,
  trendingFormat,
  sections,
  branding,
  duration,
  className,
  authenticStyle = "casual"
}: UGCStyleTemplateProps) {
  const calculatedDuration = duration || sections.reduce((sum, s) => sum + s.duration, 0);
  const isValidDuration = calculatedDuration >= 30 && calculatedDuration <= 60;

  const formatDuration = (seconds: number): string => {
    return seconds >= 60 ? `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}` : `${seconds}s`;
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-pink-600 to-purple-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1">{title}</h3>
            <p className="text-xs text-pink-100 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Recreating: {trendingFormat}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isValidDuration ? "default" : "destructive"} className="gap-1 bg-white text-purple-700">
              <Clock className="h-3 w-3" />
              {formatDuration(calculatedDuration)}
            </Badge>
            <Badge variant="outline" className="text-white border-white">
              9:16
            </Badge>
          </div>
        </div>
      </div>

      {/* Video Placeholder */}
      <div className="bg-black aspect-[9/16] max-h-[600px] mx-auto relative">
        <div className="h-full w-full flex items-center justify-center text-slate-400">
          <p className="text-sm">UGC Video Content Area (9:16)</p>
        </div>

        {/* Brand Watermark */}
        {branding?.watermark && (
          <div className="absolute bottom-4 right-4 opacity-70">
            <p className="text-white text-xs font-semibold">{branding.watermark}</p>
          </div>
        )}
      </div>

      {/* Content Breakdown */}
      <div className="p-6 bg-slate-50">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-slate-900">
            Structure ({sections.length} sections)
          </h4>
          <Badge variant="secondary" className="capitalize">
            {authenticStyle} style
          </Badge>
        </div>

        <div className="space-y-3 mb-6">
          {sections.map((section, index) => {
            const config = SECTION_CONFIG[section.type];
            const startTime = section.timestamp || sections
              .slice(0, index)
              .reduce((sum, s) => sum + s.duration, 0);

            return (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg border bg-white p-3"
              >
                <div className={cn("rounded-full px-3 py-1 text-white text-xs font-semibold", config.color)}>
                  {config.label}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm text-slate-600">
                      {formatDuration(startTime)} - {formatDuration(startTime + section.duration)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {section.duration}s
                    </Badge>
                  </div>

                  <div className="text-sm text-slate-700">
                    {section.content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Branding Info */}
        {branding && (
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 p-4">
            <h5 className="font-semibold text-purple-900 mb-2">Brand Consistency</h5>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {branding.colorScheme && (
                <div>
                  <span className="text-purple-700 font-medium">Color Scheme:</span>
                  <span className="ml-2 text-purple-600 capitalize">{branding.colorScheme}</span>
                </div>
              )}
              {branding.fontFamily && (
                <div>
                  <span className="text-purple-700 font-medium">Font:</span>
                  <span className="ml-2 text-purple-600">{branding.fontFamily}</span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Duration Warning */}
        {!isValidDuration && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> UGC format should be 30-60 seconds. Current: {calculatedDuration}s
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

// Helper function to create UGC content
export function createUGCContent(config: {
  title: string;
  trendingFormat: string;
  hook: { duration: number; content: ReactNode };
  problem: { duration: number; content: ReactNode };
  solution: { duration: number; content: ReactNode };
  cta: { duration: number; content: ReactNode };
  branding?: BrandingConfig;
  authenticStyle?: "casual" | "professional" | "playful";
}): {
  title: string;
  trendingFormat: string;
  sections: UGCSection[];
  branding?: BrandingConfig;
  authenticStyle?: "casual" | "professional" | "playful";
} {
  return {
    title: config.title,
    trendingFormat: config.trendingFormat,
    branding: config.branding,
    authenticStyle: config.authenticStyle || "casual",
    sections: [
      { type: "hook", duration: config.hook.duration, content: config.hook.content },
      { type: "problem", duration: config.problem.duration, content: config.problem.content },
      { type: "solution", duration: config.solution.duration, content: config.solution.content },
      { type: "cta", duration: config.cta.duration, content: config.cta.content }
    ]
  };
}
