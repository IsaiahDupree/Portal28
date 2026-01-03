import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getDefaultSpace, getResourceFolders } from "@/lib/community/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  FolderOpen, 
  FileText, 
  Download, 
  Image as ImageIcon, 
  Video,
  ChevronRight,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";

export default async function ResourcesPage() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login?next=/app/community/resources");
  }

  const space = await getDefaultSpace();
  
  let folders: any[] = [];
  if (space) {
    folders = await getResourceFolders(space.id, null);
  }

  // Default resource folders if none exist
  const defaultFolders = [
    { 
      id: "templates", 
      name: "Templates & Swipe Files", 
      description: "Ready-to-use templates for your campaigns",
      icon: "📄",
      itemCount: 5
    },
    { 
      id: "guides", 
      name: "Step-by-Step Guides", 
      description: "Detailed guides and tutorials",
      icon: "📚",
      itemCount: 3
    },
    { 
      id: "checklists", 
      name: "Checklists & Worksheets", 
      description: "Actionable checklists to keep you on track",
      icon: "✅",
      itemCount: 4
    },
    { 
      id: "bonuses", 
      name: "Bonus Materials", 
      description: "Exclusive bonus content for members",
      icon: "🎁",
      itemCount: 2
    },
  ];

  const displayFolders = folders.length > 0 ? folders : defaultFolders;

  return (
    <main className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/app/community">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Community
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500 text-white">
            <FolderOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Resources</h1>
            <p className="text-muted-foreground">Templates, guides, and downloadable files</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search resources..." className="pl-10" />
      </div>

      {/* Resource Folders */}
      <div className="grid md:grid-cols-2 gap-4">
        {displayFolders.map((folder: any) => (
          <Link key={folder.id} href={`/app/community/resources/${folder.id}`}>
            <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30 text-2xl">
                      {folder.icon || "📁"}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{folder.name}</CardTitle>
                      {folder.description && (
                        <CardDescription className="mt-1">{folder.description}</CardDescription>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{folder.itemCount || 0} files</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Access Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Recently Added</h2>
        <div className="space-y-3">
          {[
            { name: "Facebook Ads Checklist.pdf", type: "pdf", size: "245 KB", date: "2 days ago" },
            { name: "Campaign Budget Template.xlsx", type: "excel", size: "128 KB", date: "1 week ago" },
            { name: "Ad Creative Guidelines.pdf", type: "pdf", size: "1.2 MB", date: "1 week ago" },
          ].map((file, i) => (
            <Card key={i} className="hover:bg-muted/50 transition-colors">
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{file.size} • {file.date}</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost">
                  <Download className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {displayFolders.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No resources available yet. Check back soon!</p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
