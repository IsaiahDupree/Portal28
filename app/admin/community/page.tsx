import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getPortal28SpaceId } from "@/lib/community/community";

export default async function AdminCommunityPage() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) redirect("/login?next=/admin/community");

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") redirect("/app");

  const spaceId = await getPortal28SpaceId();

  const [categoriesRes, announcementsRes, foldersRes, channelsRes] = await Promise.all([
    supabase.from("forum_categories").select("id,name,slug").eq("space_id", spaceId).order("sort_order"),
    supabase.from("announcements").select("id,title,is_pinned,created_at").eq("space_id", spaceId).order("created_at", { ascending: false }).limit(10),
    supabase.from("resource_folders").select("id,name").eq("space_id", spaceId).is("parent_id", null).order("sort_order"),
    supabase.from("chat_channels").select("id,name,slug").eq("space_id", spaceId).order("sort_order"),
  ]);

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Community Admin</h1>
        <Link href="/admin" className="text-sm text-gray-600 hover:text-black">
          ← Back to Admin
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Forum Categories</h2>
            <Link
              href="/admin/community/categories/new"
              className="text-sm px-3 py-1 rounded bg-black text-white"
            >
              + Add
            </Link>
          </div>
          <div className="space-y-2">
            {(categoriesRes.data ?? []).map((c: any) => (
              <Link
                key={c.id}
                href={`/admin/community/categories/${c.id}`}
                className="block p-3 rounded border hover:bg-gray-50"
              >
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-gray-500">/{c.slug}</div>
              </Link>
            ))}
            {!categoriesRes.data?.length && (
              <p className="text-gray-500 text-sm">No categories yet</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Announcements</h2>
            <Link
              href="/admin/community/announcements/new"
              className="text-sm px-3 py-1 rounded bg-black text-white"
            >
              + Post
            </Link>
          </div>
          <div className="space-y-2">
            {(announcementsRes.data ?? []).map((a: any) => (
              <Link
                key={a.id}
                href={`/admin/community/announcements/${a.id}`}
                className="block p-3 rounded border hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <div className="font-medium">{a.title}</div>
                  {a.is_pinned && (
                    <span className="text-xs bg-black text-white px-2 py-0.5 rounded">
                      Pinned
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(a.created_at).toLocaleDateString()}
                </div>
              </Link>
            ))}
            {!announcementsRes.data?.length && (
              <p className="text-gray-500 text-sm">No announcements yet</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Resource Folders</h2>
            <Link
              href="/admin/community/resources/new"
              className="text-sm px-3 py-1 rounded bg-black text-white"
            >
              + Add
            </Link>
          </div>
          <div className="space-y-2">
            {(foldersRes.data ?? []).map((f: any) => (
              <Link
                key={f.id}
                href={`/admin/community/resources/${f.id}`}
                className="block p-3 rounded border hover:bg-gray-50"
              >
                <div className="font-medium">{f.name}</div>
              </Link>
            ))}
            {!foldersRes.data?.length && (
              <p className="text-gray-500 text-sm">No folders yet</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Chat Channels</h2>
            <Link
              href="/admin/community/channels/new"
              className="text-sm px-3 py-1 rounded bg-black text-white"
            >
              + Add
            </Link>
          </div>
          <div className="space-y-2">
            {(channelsRes.data ?? []).map((ch: any) => (
              <Link
                key={ch.id}
                href={`/admin/community/channels/${ch.id}`}
                className="block p-3 rounded border hover:bg-gray-50"
              >
                <div className="font-medium"># {ch.name}</div>
                <div className="text-xs text-gray-500">/{ch.slug}</div>
              </Link>
            ))}
            {!channelsRes.data?.length && (
              <p className="text-gray-500 text-sm">No channels yet</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
