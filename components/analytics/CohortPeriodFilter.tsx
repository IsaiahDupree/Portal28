"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CohortPeriodFilterProps {
  currentPeriod: "week" | "month";
}

export function CohortPeriodFilter({ currentPeriod }: CohortPeriodFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Period:</span>
      <div className="flex gap-2">
        <Button
          variant={currentPeriod === "week" ? "default" : "outline"}
          size="sm"
          asChild
        >
          <Link href="/admin/analytics/cohorts?period=week">Weekly</Link>
        </Button>
        <Button
          variant={currentPeriod === "month" ? "default" : "outline"}
          size="sm"
          asChild
        >
          <Link href="/admin/analytics/cohorts?period=month">Monthly</Link>
        </Button>
      </div>
    </div>
  );
}
