/**
 * App Marketplace - App Details Page
 * Shows detailed information about a specific app
 * Test ID: EXP-MKT-001, EXP-MKT-002
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppDetails } from "@/components/marketplace/AppDetails";
import { AppRatings } from "@/components/marketplace/AppRatings";
import { InstallButton } from "@/components/marketplace/InstallButton";

interface AppPageProps {
  params: Promise<{
    key: string;
  }>;
}

export async function generateMetadata({
  params,
}: AppPageProps): Promise<Metadata> {
  const { key } = await params;

  // Fetch app details for metadata
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/marketplace/apps/${key}`,
    {
      next: { revalidate: 300 }, // Cache for 5 minutes
    }
  );

  if (!res.ok) {
    return {
      title: "App Not Found | Portal28 Academy",
    };
  }

  const { app } = await res.json();

  return {
    title: `${app.name} | App Marketplace | Portal28 Academy`,
    description: app.description || `Install ${app.name} from the marketplace`,
  };
}

export default async function AppPage({ params }: AppPageProps) {
  const { key } = await params;

  // Fetch app details
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/marketplace/apps/${key}`,
    {
      cache: "no-store", // Always get fresh data for install status
    }
  );

  if (!res.ok) {
    notFound();
  }

  const { app, ratings, isInstalled, userRating } = await res.json();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <a
          href="/app/marketplace"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Marketplace
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <AppDetails app={app} />

          {/* Ratings Section */}
          <div className="mt-8">
            <AppRatings
              widgetKey={app.key}
              ratings={ratings}
              userRating={userRating}
              isInstalled={isInstalled}
            />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <div className="sticky top-8 space-y-6">
            {/* Install Card */}
            <div className="border rounded-lg p-6">
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    Version
                  </div>
                  <div className="font-medium">{app.version}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    Author
                  </div>
                  <div className="font-medium">{app.author}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    Installs
                  </div>
                  <div className="font-medium">
                    {app.install_count.toLocaleString()}
                  </div>
                </div>

                {app.rating_count > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Rating
                    </div>
                    <div className="font-medium">
                      {app.rating_avg} / 5.0 ({app.rating_count} reviews)
                    </div>
                  </div>
                )}

                <InstallButton
                  widgetKey={app.key}
                  isInstalled={isInstalled}
                  status={app.status}
                />
              </div>
            </div>

            {/* Metadata */}
            {app.metadata?.official && (
              <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950">
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 dark:text-blue-400">✓</span>
                  <span className="text-sm font-medium">Official App</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Developed and maintained by Portal28
                </p>
              </div>
            )}

            {app.dependencies?.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Dependencies</h3>
                <ul className="text-sm space-y-1">
                  {app.dependencies.map((dep: string) => (
                    <li key={dep} className="text-muted-foreground">
                      • {dep}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
