import Link from "next/link";
import { getPortal28SpaceId, getForumCategories } from "@/lib/community/community";

type Widget = {
  key: string;
  name: string;
  nav_label: string | null;
  community_space_id: string | null;
};

export default async function ForumApp({ widget }: { widget: Widget }) {
  const spaceId = widget.community_space_id ?? (await getPortal28SpaceId());
  const categories = await getForumCategories(spaceId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{widget.nav_label ?? widget.name}</h1>
        <p className="text-gray-600">Pick a category to start discussing.</p>
      </div>

      {categories.length === 0 ? (
        <p className="text-gray-600">No forum categories yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {categories.map((c: any) => (
            <Link
              key={c.slug}
              href={`/app/community/w/${widget.key}/c/${c.slug}`}
              className="rounded-xl border p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{c.icon || "💬"}</span>
                <div>
                  <div className="font-semibold">{c.name}</div>
                  {c.description && (
                    <div className="text-sm text-gray-600">{c.description}</div>
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
