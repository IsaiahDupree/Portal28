import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getResourceFolders, getResourceItems } from "@/lib/community/community";

export default async function ResourceFolderPage({
  params,
}: {
  params: { widgetKey: string; folderId: string };
}) {
  const supabase = supabaseServer();

  const { data: widget } = await supabase
    .from("widgets")
    .select("key,name,nav_label")
    .eq("key", params.widgetKey)
    .single();

  if (!widget) notFound();

  const { data: folder } = await supabase
    .from("resource_folders")
    .select("id,name,description,space_id,parent_id")
    .eq("id", params.folderId)
    .single();

  if (!folder) notFound();

  const [subfolders, items] = await Promise.all([
    getResourceFolders(folder.space_id, folder.id),
    getResourceItems(folder.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/app/community/w/${params.widgetKey}`}
          className="text-sm text-gray-600 hover:text-black"
        >
          ← Back to Resources
        </Link>
        <h1 className="text-2xl font-semibold mt-1">{folder.name}</h1>
        {folder.description && (
          <p className="text-gray-600">{folder.description}</p>
        )}
      </div>

      {subfolders.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Folders</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {subfolders.map((f: any) => (
              <Link
                key={f.id}
                href={`/app/community/w/${params.widgetKey}/folder/${f.id}`}
                className="rounded-xl border p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{f.icon || "📁"}</span>
                  <div>
                    <div className="font-medium">{f.name}</div>
                    {f.description && (
                      <div className="text-sm text-gray-600">{f.description}</div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {items.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Items</h2>
          <div className="space-y-3">
            {items.map((item: any) => (
              <div key={item.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">{item.title}</div>
                    {item.description && (
                      <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                    )}
                  </div>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded shrink-0">
                    {item.kind}
                  </span>
                </div>

                {item.kind === "link" && item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-3 text-sm text-blue-600 hover:underline"
                  >
                    Open link →
                  </a>
                )}

                {item.kind === "note" && item.body && (
                  <div className="mt-3 text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                    {item.body}
                  </div>
                )}

                {item.kind === "file" && item.storage_path && (
                  <div className="mt-3 text-sm text-gray-600">
                    File: <code className="bg-gray-100 px-1 rounded">{item.storage_path}</code>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {subfolders.length === 0 && items.length === 0 && (
        <p className="text-gray-600">This folder is empty.</p>
      )}
    </div>
  );
}
