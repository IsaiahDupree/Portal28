"use client";

import { Button } from "@/components/ui/button";
import { trackCTAClick } from "./CTATracker";
import { ComponentProps } from "react";

interface TrackedButtonProps extends ComponentProps<typeof Button> {
  ctaName: string;
  trackingProps?: Record<string, any>;
}

/**
 * Button component that automatically tracks CTA clicks
 * Part of TRACK-002: Acquisition Event Tracking
 */
export function TrackedButton({
  ctaName,
  trackingProps,
  onClick,
  children,
  ...props
}: TrackedButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    trackCTAClick(ctaName, trackingProps);
    onClick?.(e);
  };

  return (
    <Button onClick={handleClick} {...props}>
      {children}
    </Button>
  );
}
