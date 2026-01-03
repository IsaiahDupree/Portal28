import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getResourceFolders, getResourceItems } from "@/lib/community/queries";

export default async function FolderPage({
  params,
}: {
  params: { folderId: string };
}) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect(`/login?next=/app/community/resources/${params.folderId}`);
  }

  const { data: folder } = await supabase
    .from("resource_folders")
    .select("*, community_spaces(name)")
    .eq("id", params.folderId)
    .single();

  if (!folder) notFound();

  const [subfolders, items] = await Promise.all([
    getResourceFolders(folder.space_id, folder.id),
    getResourceItems(folder.id),
  ]);

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/app/community/resources"
          className="text-sm text-gray-600 hover:text-black"
        >
          ← Resources
        </Link>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xl">{folder.icon || "📁"}</span>
          <h1 className="text-2xl font-semibold">{folder.name}</h1>
        </div>
        {folder.description && (
          <p className="text-gray-600 mt-1">{folder.description}</p>
        )}
      </div>

      {subfolders.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Subfolders</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {subfolders.map((sf: any) => (
              <Link
                key={sf.id}
                href={`/app/community/resources/${sf.id}`}
                className="rounded-xl border p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-2">
                  <span>{sf.icon || "📁"}</span>
                  <span className="font-medium">{sf.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {items.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Items</h2>
          <div className="space-y-2">
            {items.map((item: any) => (
              <div key={item.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span>
                      {item.kind === "link" ? "🔗" : item.kind === "file" ? "📄" : "📝"}
                    </span>
                    <div>
                      {item.kind === "link" && item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:underline"
                        >
                          {item.title}
                        </a>
                      ) : (
                        <span className="font-medium">{item.title}</span>
                      )}
                      {item.description && (
                        <div className="text-sm text-gray-600">{item.description}</div>
                      )}
                    </div>
                  </div>
                  {item.kind === "file" && item.storage_path && (
                    <a
                      href={`/api/resources/download?path=${encodeURIComponent(item.storage_path)}`}
                      className="text-sm text-gray-600 hover:text-black"
                    >
                      Download
                    </a>
                  )}
                </div>
                {item.kind === "note" && item.body && (
                  <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
                    {item.body}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {subfolders.length === 0 && items.length === 0 && (
        <p className="text-gray-600 text-center py-12">This folder is empty.</p>
      )}
    </main>
  );
}
