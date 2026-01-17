"use client";

import type { ConversionFunnelData } from "@/lib/db/analytics";

interface ConversionFunnelProps {
  data: ConversionFunnelData[];
}

export function ConversionFunnel({ data }: ConversionFunnelProps) {
  return (
    <div className="space-y-4">
      {data.map((step, index) => {
        const widthPercentage = step.percentage;
        const isLast = index === data.length - 1;

        return (
          <div key={step.step} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{step.step}</span>
              <span className="text-muted-foreground">{step.count.toLocaleString()}</span>
            </div>
            <div className="relative h-12 bg-muted rounded-lg overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 flex items-center justify-center transition-all ${
                  isLast
                    ? "bg-green-500"
                    : index === 1
                    ? "bg-blue-500"
                    : "bg-primary"
                }`}
                style={{ width: `${widthPercentage}%` }}
              >
                <span className="text-sm font-medium text-white">
                  {widthPercentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
