"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AppCardProps {
  app: {
    key: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    status: string;
    author: string;
    install_count: number;
    rating_avg: number;
    rating_count: number;
    metadata: Record<string, any>;
  };
}

export function AppCard({ app }: AppCardProps) {
  const isComingSoon = app.status === "coming_soon";
  const isOfficial = app.metadata?.official;

  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-4 mb-4">
        <div className="text-4xl">{app.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{app.name}</h3>
            {isOfficial && (
              <Badge variant="secondary" className="text-xs">
                Official
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{app.author}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {app.description}
      </p>

      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1">
          <span className="text-yellow-500">★</span>
          <span>
            {app.rating_count > 0
              ? `${app.rating_avg} (${app.rating_count})`
              : "No ratings"}
          </span>
        </div>
        <div className="text-muted-foreground">
          {app.install_count.toLocaleString()} installs
        </div>
      </div>

      {isComingSoon ? (
        <Button className="w-full" disabled>
          Coming Soon
        </Button>
      ) : (
        <Link href={`/app/marketplace/${app.key}`}>
          <Button className="w-full" variant="default">
            View Details
          </Button>
        </Link>
      )}
    </div>
  );
}
