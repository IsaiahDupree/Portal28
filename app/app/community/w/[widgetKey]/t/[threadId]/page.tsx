import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getThreadWithPosts } from "@/lib/community/community";
import ReplyForm from "@/components/community/ReplyForm";

export default async function ThreadPage({
  params,
}: {
  params: { widgetKey: string; threadId: string };
}) {
  const supabase = supabaseServer();

  const { data: widget } = await supabase
    .from("widgets")
    .select("key,name,nav_label")
    .eq("key", params.widgetKey)
    .single();

  if (!widget) notFound();

  const { thread, posts } = await getThreadWithPosts(params.threadId);
  if (!thread) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/app/community/w/${params.widgetKey}`}
          className="text-sm text-gray-600 hover:text-black"
        >
          ← Back to Forums
        </Link>
      </div>

      <article className="rounded-xl border p-5">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-semibold">{thread.title}</h1>
          <div className="flex items-center gap-2 shrink-0">
            {thread.is_pinned && (
              <span className="text-xs bg-black text-white px-2 py-0.5 rounded">
                Pinned
              </span>
            )}
            {thread.is_locked && (
              <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                Locked
              </span>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Started {new Date(thread.created_at).toLocaleString()}
        </div>
      </article>

      <div className="space-y-4">
        {posts.map((p: any) => (
          <div key={p.id} className="rounded-xl border p-5">
            <div className="text-xs text-gray-500">
              {new Date(p.created_at).toLocaleString()}
            </div>
            <div className="mt-2 whitespace-pre-wrap">{p.body}</div>
          </div>
        ))}
      </div>

      {!thread.is_locked && (
        <ReplyForm widgetKey={params.widgetKey} threadId={params.threadId} />
      )}

      {thread.is_locked && (
        <div className="rounded-xl border p-4 text-center text-gray-600">
          This thread is locked and no longer accepting replies.
        </div>
      )}
    </div>
  );
}
