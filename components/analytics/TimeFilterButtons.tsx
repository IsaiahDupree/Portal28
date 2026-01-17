"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface TimeFilterButtonsProps {
  currentDays: number;
}

export function TimeFilterButtons({ currentDays }: TimeFilterButtonsProps) {
  const periods = [
    { label: "7D", days: 7 },
    { label: "30D", days: 30 },
    { label: "90D", days: 90 },
  ];

  return (
    <div className="flex items-center gap-1 rounded-lg border p-1">
      {periods.map((period) => (
        <Link key={period.days} href={`/admin/analytics?days=${period.days}`}>
          <Button
            variant={currentDays === period.days ? "default" : "ghost"}
            size="sm"
          >
            {period.label}
          </Button>
        </Link>
      ))}
    </div>
  );
}
