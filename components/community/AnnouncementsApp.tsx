import { getPortal28SpaceId, getAnnouncements } from "@/lib/community/community";

type Widget = {
  key: string;
  name: string;
  nav_label: string | null;
  community_space_id: string | null;
};

export default async function AnnouncementsApp({ widget }: { widget: Widget }) {
  const spaceId = widget.community_space_id ?? (await getPortal28SpaceId());
  const announcements = await getAnnouncements(spaceId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{widget.nav_label ?? widget.name}</h1>
        <p className="text-gray-600">Pinned updates + latest drops from Sarah.</p>
      </div>

      {announcements.length === 0 ? (
        <p className="text-gray-600">No announcements yet.</p>
      ) : (
        <div className="space-y-4">
          {announcements.map((a: any) => (
            <article key={a.id} className="rounded-xl border p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-lg font-semibold">{a.title}</h2>
                <div className="flex items-center gap-2 shrink-0">
                  {a.is_pinned && (
                    <span className="text-xs bg-black text-white px-2 py-0.5 rounded">
                      Pinned
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {Array.isArray(a.tags) && a.tags.length > 0 && (
                <div className="flex gap-2">
                  {a.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="text-xs bg-gray-100 px-2 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="text-gray-700 whitespace-pre-wrap">{a.body}</div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
