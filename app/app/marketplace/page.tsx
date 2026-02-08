/**
 * App Marketplace - Browse and Install Apps
 * Displays available apps with filtering, search, and installation
 * Test ID: EXP-MKT-001
 */

import { Metadata } from "next";
import { MarketplaceGrid } from "@/components/marketplace/MarketplaceGrid";
import { MarketplaceFilters } from "@/components/marketplace/MarketplaceFilters";

export const metadata: Metadata = {
  title: "App Marketplace | Portal28 Academy",
  description: "Browse and install apps to extend your Portal28 experience",
};

export default function MarketplacePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">App Marketplace</h1>
        <p className="text-muted-foreground">
          Discover apps to enhance your learning experience
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1">
          <MarketplaceFilters />
        </aside>

        {/* Apps Grid */}
        <main className="lg:col-span-3">
          <MarketplaceGrid />
        </main>
      </div>
    </div>
  );
}
