import Link from "next/link";
import { getPortal28SpaceId, getResourceFolders } from "@/lib/community/community";

type Widget = {
  key: string;
  name: string;
  nav_label: string | null;
  community_space_id: string | null;
};

export default async function ResourcesApp({ widget }: { widget: Widget }) {
  const spaceId = widget.community_space_id ?? (await getPortal28SpaceId());
  const folders = await getResourceFolders(spaceId, null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{widget.nav_label ?? widget.name}</h1>
        <p className="text-gray-600">Templates, links, files, and guides.</p>
      </div>

      {folders.length === 0 ? (
        <p className="text-gray-600">No resources yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {folders.map((f: any) => (
            <Link
              key={f.id}
              href={`/app/community/w/${widget.key}/folder/${f.id}`}
              className="rounded-xl border p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{f.icon || "📁"}</span>
                <div>
                  <div className="font-semibold">{f.name}</div>
                  {f.description && (
                    <div className="text-sm text-gray-600">{f.description}</div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
