import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import {
  getDefaultSpace,
  getThreadById,
  getPostsByThread,
} from "@/lib/community/queries";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Lock, Pin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ReplyForm from "./ReplyForm";
import PostCard from "./PostCard";

export default async function ThreadDetailPage({
  params,
}: {
  params: { categorySlug: string; threadId: string };
}) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect(
      `/login?next=/app/community/forums/${params.categorySlug}/${params.threadId}`
    );
  }

  const space = await getDefaultSpace();
  if (!space) notFound();

  const thread = await getThreadById(params.threadId);
  if (!thread || thread.is_hidden) notFound();

  // Verify category slug matches
  if (thread.forum_categories?.slug !== params.categorySlug) {
    notFound();
  }

  const posts = await getPostsByThread(params.threadId);

  // Get user profiles for all authors
  const authorIds = [
    thread.author_user_id,
    ...posts.map((p: any) => p.author_user_id),
  ];
  const uniqueAuthorIds = Array.from(new Set(authorIds));

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", uniqueAuthorIds);

  const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) ?? []);

  function getAuthorEmail(userId: string) {
    return profileMap.get(userId)?.email ?? "Unknown";
  }

  return (
    <main className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/app/community" className="hover:text-foreground">
          Community
        </Link>
        <span>/</span>
        <Link href="/app/community/forums" className="hover:text-foreground">
          Forums
        </Link>
        <span>/</span>
        <Link
          href={`/app/community/forums/${params.categorySlug}`}
          className="hover:text-foreground"
        >
          {thread.forum_categories?.name}
        </Link>
      </div>

      {/* Thread Header */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {thread.is_pinned && (
                  <Badge variant="default" className="gap-1">
                    <Pin className="h-3 w-3" />
                    Pinned
                  </Badge>
                )}
                {thread.is_locked && (
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Locked
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold">{thread.title}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>by {getAuthorEmail(thread.author_user_id)}</span>
                <span>•</span>
                <span>
                  {formatDistanceToNow(new Date(thread.created_at), {
                    addSuffix: true,
                  })}
                </span>
                <span>•</span>
                <span>{thread.reply_count} replies</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/app/community/forums/${params.categorySlug}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Posts */}
      <div className="space-y-4">
        {posts.map((post: any, index: number) => (
          <PostCard
            key={post.id}
            post={post}
            authorEmail={getAuthorEmail(post.author_user_id)}
            currentUserId={auth.user.id}
            isOriginalPost={index === 0}
          />
        ))}
      </div>

      {/* Reply Section */}
      {!thread.is_locked && (
        <ReplyForm threadId={params.threadId} categorySlug={params.categorySlug} />
      )}
    </main>
  );
}
