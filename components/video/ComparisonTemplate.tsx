"use client";

import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComparisonView } from "./ComparisonView";
import { ProConsList } from "./ProConsList";
import { Trophy, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonOption {
  title: string;
  description?: string;
  pros: string[];
  cons: string[];
  color?: "blue" | "green" | "red" | "purple";
}

interface ComparisonTemplateProps {
  title: string;
  optionA: ComparisonOption;
  optionB: ComparisonOption;
  winner?: "A" | "B" | "tie";
  recommendation?: ReactNode;
  duration?: number; // in seconds
  className?: string;
}

export function ComparisonTemplate({
  title,
  optionA,
  optionB,
  winner,
  recommendation,
  duration = 90,
  className
}: ComparisonTemplateProps) {
  // Validate duration is within acceptable range (60-120 seconds)
  const isValidDuration = duration >= 60 && duration <= 120;

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`;
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header */}
      <div className="border-b bg-slate-900 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">{title}</h3>
          <div className="flex items-center gap-2">
            <Badge variant={isValidDuration ? "default" : "destructive"} className="gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(duration)}
            </Badge>
            <Badge variant="outline" className="text-white border-white">
              16:9
            </Badge>
          </div>
        </div>
      </div>

      {/* Video Placeholder */}
      <div className="bg-black aspect-video">
        <div className="h-full w-full flex items-center justify-center text-slate-400">
          <p className="text-sm">Video Content Area (16:9)</p>
        </div>
      </div>

      {/* Comparison Content */}
      <div className="p-6 bg-slate-50">
        <h4 className="text-lg font-semibold text-slate-900 mb-4">
          {optionA.title} vs {optionB.title}
        </h4>

        {/* Side-by-Side Comparison */}
        <ComparisonView
          left={{
            title: optionA.title,
            content: (
              <div>
                {optionA.description && (
                  <p className="text-sm text-slate-600 mb-4">{optionA.description}</p>
                )}
                <ProConsList pros={optionA.pros} cons={optionA.cons} />
              </div>
            ),
            color: optionA.color || "blue"
          }}
          right={{
            title: optionB.title,
            content: (
              <div>
                {optionB.description && (
                  <p className="text-sm text-slate-600 mb-4">{optionB.description}</p>
                )}
                <ProConsList pros={optionB.pros} cons={optionB.cons} />
              </div>
            ),
            color: optionB.color || "green"
          }}
          className="mb-6"
        />

        {/* Winner Section */}
        {winner && (
          <Card className="bg-yellow-50 border-2 border-yellow-400 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <h5 className="font-semibold text-yellow-900">
                {winner === "tie" ? "It's a Tie!" : `Winner: ${winner === "A" ? optionA.title : optionB.title}`}
              </h5>
            </div>
            {recommendation && (
              <div className="text-sm text-yellow-900">
                {recommendation}
              </div>
            )}
          </Card>
        )}

        {/* Duration Warning */}
        {!isValidDuration && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> Duration should be between 60-120 seconds.
              Current: {duration}s
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

// Helper function to create a comparison
export function createComparison(config: {
  title: string;
  optionA: ComparisonOption;
  optionB: ComparisonOption;
  winner?: "A" | "B" | "tie";
  recommendation?: ReactNode;
  duration?: number;
}): {
  title: string;
  optionA: ComparisonOption;
  optionB: ComparisonOption;
  winner?: "A" | "B" | "tie";
  recommendation?: ReactNode;
  duration: number;
} {
  return {
    title: config.title,
    optionA: config.optionA,
    optionB: config.optionB,
    winner: config.winner,
    recommendation: config.recommendation,
    duration: config.duration || 90
  };
}
