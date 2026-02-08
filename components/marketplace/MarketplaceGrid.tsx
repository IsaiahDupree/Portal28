"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppCard } from "./AppCard";
import { Skeleton } from "@/components/ui/skeleton";

interface App {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  status: string;
  author: string;
  version: string;
  install_count: number;
  rating_avg: number;
  rating_count: number;
  metadata: Record<string, any>;
}

export function MarketplaceGrid() {
  const searchParams = useSearchParams();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchApps() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        const category = searchParams.get("category");
        const search = searchParams.get("search");
        const sort = searchParams.get("sort");

        if (category) params.set("category", category);
        if (search) params.set("search", search);
        if (sort) params.set("sort", sort);

        const res = await fetch(`/api/marketplace/apps?${params.toString()}`);

        if (!res.ok) {
          throw new Error("Failed to fetch apps");
        }

        const data = await res.json();
        setApps(data.apps || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchApps();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Error: {error}</p>
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No apps found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {apps.map((app) => (
        <AppCard key={app.key} app={app} />
      ))}
    </div>
  );
}
