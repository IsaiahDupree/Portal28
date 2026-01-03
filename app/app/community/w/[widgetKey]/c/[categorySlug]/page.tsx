import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getPortal28SpaceId, getForumThreads } from "@/lib/community/community";
import NewThreadForm from "@/components/community/NewThreadForm";

export default async function ForumCategoryPage({
  params,
}: {
  params: { widgetKey: string; categorySlug: string };
}) {
  const supabase = supabaseServer();

  const { data: widget } = await supabase
    .from("widgets")
    .select("key,name,nav_label,community_space_id")
    .eq("key", params.widgetKey)
    .single();

  if (!widget) notFound();

  const spaceId = widget.community_space_id ?? (await getPortal28SpaceId());

  const { data: category } = await supabase
    .from("forum_categories")
    .select("id,name,description,icon")
    .eq("space_id", spaceId)
    .eq("slug", params.categorySlug)
    .single();

  if (!category) notFound();

  const threads = await getForumThreads(category.id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/app/community/w/${params.widgetKey}`}
          className="text-sm text-gray-600 hover:text-black"
        >
          ← Back to Forums
        </Link>
        <h1 className="text-2xl font-semibold mt-1 flex items-center gap-2">
          <span>{category.icon || "💬"}</span>
          {category.name}
        </h1>
        {category.description && (
          <p className="text-gray-600">{category.description}</p>
        )}
      </div>

      <NewThreadForm
        widgetKey={params.widgetKey}
        categorySlug={params.categorySlug}
      />

      {threads.length === 0 ? (
        <p className="text-gray-600">No threads yet. Start one above!</p>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <div className="p-3 border-b font-medium bg-gray-50">Threads</div>
          <div>
            {threads.map((t: any) => (
              <Link
                key={t.id}
                href={`/app/community/w/${params.widgetKey}/t/${t.id}`}
                className="block p-4 border-b hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {t.is_pinned && (
                        <span className="text-xs bg-black text-white px-2 py-0.5 rounded">
                          Pinned
                        </span>
                      )}
                      {t.title}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {t.reply_count ?? 0} replies
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 shrink-0">
                    {new Date(t.last_activity_at ?? t.created_at).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
