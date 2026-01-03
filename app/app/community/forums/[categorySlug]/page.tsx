import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import {
  getDefaultSpace,
  getForumCategoryBySlug,
  getThreadsByCategory,
} from "@/lib/community/queries";

export default async function CategoryPage({
  params,
}: {
  params: { categorySlug: string };
}) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect(`/login?next=/app/community/forums/${params.categorySlug}`);
  }

  const space = await getDefaultSpace();
  if (!space) notFound();

  const category = await getForumCategoryBySlug(space.id, params.categorySlug);
  if (!category) notFound();

  const threads = await getThreadsByCategory(category.id);

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/app/community/forums"
            className="text-sm text-gray-600 hover:text-black"
          >
            ← Forums
          </Link>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl">{category.icon || "💬"}</span>
            <h1 className="text-2xl font-semibold">{category.name}</h1>
          </div>
          {category.description && (
            <p className="text-gray-600 mt-1">{category.description}</p>
          )}
        </div>
        <Link
          href={`/app/community/forums/${params.categorySlug}/new`}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
        >
          New Thread
        </Link>
      </div>

      {threads.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <p>No threads yet. Be the first to start a discussion!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t: any) => (
            <Link
              key={t.id}
              href={`/app/community/forums/${params.categorySlug}/${t.id}`}
              className="block rounded-xl border p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {t.is_pinned && (
                      <span className="text-xs bg-black text-white px-2 py-0.5 rounded">
                        Pinned
                      </span>
                    )}
                    {t.is_locked && (
                      <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                        🔒 Locked
                      </span>
                    )}
                    <span className="font-medium">{t.title}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {t.reply_count} {t.reply_count === 1 ? "reply" : "replies"}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(t.last_activity_at).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
