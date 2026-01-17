import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, MessageSquare, Flag, Trash2, Eye, ArrowLeft, AlertTriangle } from "lucide-react";
import { ModerationActions } from "@/components/admin/ModerationActions";

export default async function ModerationPage() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login?next=/admin/moderation");
  }

  const { data: userProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (userProfile?.role !== "admin") {
    redirect("/app");
  }

  // Fetch forum threads with author info
  const { data: threads } = await supabase
    .from("forum_threads")
    .select(`
      id,
      title,
      body,
      is_pinned,
      is_locked,
      is_hidden,
      created_at,
      author:users(id, email, full_name)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  // Fetch forum posts with author info
  const { data: replies } = await supabase
    .from("forum_posts")
    .select(`
      id,
      thread_id,
      body,
      is_hidden,
      created_at,
      author:users(id, email, full_name),
      thread:forum_threads(id, title)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  // Fetch flagged/reported content
  const { data: reports } = await supabase
    .from("content_reports")
    .select(`
      id,
      content_type,
      content_id,
      reason,
      status,
      created_at,
      reporter:users!content_reports_reporter_id_fkey(id, email, full_name)
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(20);

  // Get counts
  const { count: pendingReportsCount } = await supabase
    .from("content_reports")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: hiddenContentCount } = await supabase
    .from("forum_threads")
    .select("*", { count: "exact", head: true })
    .eq("is_hidden", true);

  const { count: totalThreads } = await supabase
    .from("forum_threads")
    .select("*", { count: "exact", head: true });

  const { count: totalReplies } = await supabase
    .from("forum_posts")
    .select("*", { count: "exact", head: true });

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Shield className="h-8 w-8" />
          Content Moderation
        </h1>
        <p className="text-muted-foreground">
          Review and moderate community posts, threads, and reported content
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingReportsCount || 0}</div>
            <p className="text-xs text-muted-foreground">Need review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hidden Content</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hiddenContentCount || 0}</div>
            <p className="text-xs text-muted-foreground">Currently hidden</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Threads</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalThreads || 0}</div>
            <p className="text-xs text-muted-foreground">Forum threads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Replies</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReplies || 0}</div>
            <p className="text-xs text-muted-foreground">Forum replies</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Reports Section */}
      {(pendingReportsCount || 0) > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-semibold">Pending Reports</h2>
          </div>

          <div className="rounded-xl border border-orange-200 overflow-hidden bg-orange-50/30">
            <table className="w-full text-sm">
              <thead className="bg-orange-100/50">
                <tr>
                  <th className="text-left p-4 font-medium">Content Type</th>
                  <th className="text-left p-4 font-medium">Reason</th>
                  <th className="text-left p-4 font-medium">Reported By</th>
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(reports || []).map((report) => {
                  const reporter = report.reporter as any;
                  return (
                    <tr key={report.id} className="border-t border-orange-200">
                      <td className="p-4">
                        <Badge variant="outline">{report.content_type}</Badge>
                      </td>
                      <td className="p-4">{report.reason}</td>
                      <td className="p-4">
                        <div className="text-sm">{reporter?.full_name || reporter?.email || "Anonymous"}</div>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <ModerationActions
                          type="report"
                          id={report.id}
                          contentType={report.content_type}
                          contentId={report.content_id}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent Threads */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Forum Threads</h2>

        {!threads || threads.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No forum threads yet.
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Thread</th>
                  <th className="text-left p-4 font-medium">Author</th>
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {threads.map((thread) => {
                  const author = thread.author as any;
                  return (
                    <tr key={thread.id} className={`border-t ${thread.is_hidden ? 'bg-red-50/50' : ''}`}>
                      <td className="p-4">
                        <div className="font-medium">{thread.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {thread.body?.substring(0, 100)}...
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">{author?.full_name || author?.email || "Unknown"}</div>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(thread.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1 flex-wrap">
                          {thread.is_pinned && <Badge variant="secondary">Pinned</Badge>}
                          {thread.is_locked && <Badge variant="outline">Locked</Badge>}
                          {thread.is_hidden && <Badge variant="destructive">Hidden</Badge>}
                          {!thread.is_pinned && !thread.is_locked && !thread.is_hidden && (
                            <Badge variant="success">Visible</Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <ModerationActions
                          type="thread"
                          id={thread.id}
                          isHidden={thread.is_hidden}
                          isPinned={thread.is_pinned}
                          isLocked={thread.is_locked}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Replies */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Forum Replies</h2>

        {!replies || replies.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No forum replies yet.
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Reply</th>
                  <th className="text-left p-4 font-medium">Thread</th>
                  <th className="text-left p-4 font-medium">Author</th>
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {replies.map((reply) => {
                  const author = reply.author as any;
                  const thread = reply.thread as any;
                  return (
                    <tr key={reply.id} className={`border-t ${reply.is_hidden ? 'bg-red-50/50' : ''}`}>
                      <td className="p-4">
                        <div className="text-sm line-clamp-2">
                          {reply.body?.substring(0, 150)}...
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium">{thread?.title || "Unknown Thread"}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">{author?.full_name || author?.email || "Unknown"}</div>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(reply.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <ModerationActions
                          type="reply"
                          id={reply.id}
                          isHidden={reply.is_hidden}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
