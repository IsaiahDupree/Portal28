"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BrandOverlayProps {
  logo?: string | ReactNode;
  watermark?: string;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  opacity?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  colorScheme?: "light" | "dark" | "auto";
}

const POSITION_CLASSES = {
  "top-left": "top-4 left-4",
  "top-right": "top-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "bottom-right": "bottom-4 right-4",
  "center": "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
};

const SIZE_CLASSES = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base"
};

export function BrandOverlay({
  logo,
  watermark,
  position = "bottom-right",
  opacity = 0.7,
  size = "sm",
  className,
  colorScheme = "light"
}: BrandOverlayProps) {
  const textColor = colorScheme === "dark" ? "text-slate-900" : "text-white";
  const bgColor = colorScheme === "dark" ? "bg-white/80" : "bg-black/50";

  return (
    <div
      className={cn(
        "absolute z-10 pointer-events-none",
        POSITION_CLASSES[position],
        className
      )}
      style={{ opacity }}
    >
      {/* Logo */}
      {logo && (
        <div className="mb-1">
          {typeof logo === "string" ? (
            <img
              src={logo}
              alt="Brand logo"
              className={cn(
                "object-contain",
                size === "sm" && "h-6 w-6",
                size === "md" && "h-8 w-8",
                size === "lg" && "h-12 w-12"
              )}
            />
          ) : (
            logo
          )}
        </div>
      )}

      {/* Watermark Text */}
      {watermark && (
        <div className={cn(
          "rounded px-2 py-1 font-semibold",
          SIZE_CLASSES[size],
          textColor,
          bgColor
        )}>
          {watermark}
        </div>
      )}
    </div>
  );
}
