"use client";

import { useEffect } from "react";
import { track } from "@/lib/meta/pixel";

export function ViewContentTracker({
  courseId,
  price
}: {
  courseId: string;
  price?: number;
}) {
  useEffect(() => {
    // Fire ViewContent event on course sales page
    track("ViewContent", {
      content_ids: [courseId],
      content_type: "product",
      value: price ? price / 100 : undefined, // Convert cents to dollars
      currency: price ? "USD" : undefined
    });
  }, [courseId, price]);

  return null;
}
