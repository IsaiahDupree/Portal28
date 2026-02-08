"use client";

import Link from "next/link";
import { trackCTAClick } from "./CTATracker";
import { ComponentProps } from "react";

interface TrackedLinkProps extends ComponentProps<typeof Link> {
  ctaName: string;
  trackingProps?: Record<string, any>;
}

/**
 * Link component that automatically tracks CTA clicks
 * Part of TRACK-002: Acquisition Event Tracking
 */
export function TrackedLink({
  ctaName,
  trackingProps,
  onClick,
  children,
  ...props
}: TrackedLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    trackCTAClick(ctaName, {
      ...trackingProps,
      href: props.href,
    });
    onClick?.(e);
  };

  return (
    <Link onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
