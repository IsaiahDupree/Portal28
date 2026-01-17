import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getDefaultSpace, getForumCategories } from "@/lib/community/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, Plus, Users, ChevronRight } from "lucide-react";

export default async function ForumsPage() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login?next=/app/community/forums");
  }

  const space = await getDefaultSpace();
  if (!space) {
    return (
      <main className="container max-w-4xl mx-auto py-6 px-4">
        <Card className="text-center py-12">
          <CardContent>
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Forums</h1>
            <p className="text-muted-foreground mb-4">Community forums are being set up.</p>
            <Button asChild variant="outline">
              <Link href="/app/community">Back to Community</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const categories = await getForumCategories(space.id);

  const displayCategories = categories;

  return (
    <main className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href="/app/community">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Community
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Forums</h1>
          <p className="text-muted-foreground mt-1">
            Join discussions and connect with other members
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Thread
        </Button>
      </div>

      {/* Forum Categories */}
      <div className="grid gap-4">
        {displayCategories.map((category: any) => (
          <Link key={category.id} href={`/app/community/forums/${category.slug}`}>
            <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-2xl">
                      {category.icon || "💬"}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      {category.description && (
                        <CardDescription className="mt-1">{category.description}</CardDescription>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>{category.thread_count || 0} threads</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Community Guidelines */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5" />
            Community Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Be respectful and supportive of other members</p>
          <p>• Stay on topic and use appropriate categories</p>
          <p>• No spam, self-promotion, or inappropriate content</p>
          <p>• Search before posting to avoid duplicates</p>
        </CardContent>
      </Card>
    </main>
  );
}
