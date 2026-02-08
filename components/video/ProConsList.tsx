"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProConsListProps {
  pros?: string[];
  cons?: string[];
  className?: string;
  showIcons?: boolean;
}

export function ProConsList({
  pros = [],
  cons = [],
  className,
  showIcons = true
}: ProConsListProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Pros Section */}
      {pros.length > 0 && (
        <div>
          <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
            {showIcons && <Check className="h-5 w-5" />}
            Pros
          </h4>
          <ul className="space-y-2">
            {pros.map((pro, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                <span className="text-sm text-slate-700">{pro}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cons Section */}
      {cons.length > 0 && (
        <div>
          <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
            {showIcons && <X className="h-5 w-5" />}
            Cons
          </h4>
          <ul className="space-y-2">
            {cons.map((con, index) => (
              <li key={index} className="flex items-start gap-2">
                <X className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                <span className="text-sm text-slate-700">{con}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
