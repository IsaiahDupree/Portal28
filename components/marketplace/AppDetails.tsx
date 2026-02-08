"use client";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AppDetailsProps {
  app: {
    key: string;
    name: string;
    description: string;
    icon: string;
    author: string;
    version: string;
    category: string;
    changelog?: Array<{
      version: string;
      date: string;
      changes: string[];
    }>;
    screenshots?: string[];
  };
}

export function AppDetails({ app }: AppDetailsProps) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-6 mb-6">
        <div className="text-6xl">{app.icon}</div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">{app.name}</h1>
          <p className="text-muted-foreground mb-3">{app.description}</p>
          <div className="flex gap-2">
            <Badge variant="secondary">{app.category}</Badge>
            <Badge variant="outline">v{app.version}</Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {app.changelog && app.changelog.length > 0 && (
            <TabsTrigger value="changelog">Changelog</TabsTrigger>
          )}
          {app.screenshots && app.screenshots.length > 0 && (
            <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="prose dark:prose-invert max-w-none">
            <h2>About this app</h2>
            <p>{app.description}</p>

            <h3>Features</h3>
            <p>
              This app provides enhanced functionality to your Portal28
              experience.
            </p>
          </div>
        </TabsContent>

        {app.changelog && app.changelog.length > 0 && (
          <TabsContent value="changelog" className="mt-6">
            <div className="space-y-6">
              {app.changelog.map((release, idx) => (
                <div key={idx} className="border-l-2 pl-4">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">v{release.version}</h3>
                    <span className="text-sm text-muted-foreground">
                      {new Date(release.date).toLocaleDateString()}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {release.changes.map((change, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        • {change}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </TabsContent>
        )}

        {app.screenshots && app.screenshots.length > 0 && (
          <TabsContent value="screenshots" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {app.screenshots.map((screenshot, idx) => (
                <img
                  key={idx}
                  src={screenshot}
                  alt={`Screenshot ${idx + 1}`}
                  className="border rounded-lg"
                />
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
