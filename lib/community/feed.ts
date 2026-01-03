import { supabaseServer } from "@/lib/supabase/server";
import { getPortal28SpaceId } from "./community";

export type FeedItem = {
  id: string;
  type: "announcement" | "thread" | "resource";
  title: string;
  preview: string | null;
  created_at: string;
  is_pinned?: boolean;
  category_name?: string;
  folder_name?: string;
  resource_kind?: string;
};

export async function getCommunityFeed(limit = 20): Promise<FeedItem[]> {
  const supabase = supabaseServer();
  const spaceId = await getPortal28SpaceId();

  const [announcementsRes, threadsRes, resourcesRes] = await Promise.all([
    supabase
      .from("announcements")
      .select("id,title,body,is_pinned,created_at")
      .eq("space_id", spaceId)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(10),

    supabase
      .from("forum_threads")
      .select(`
        id,title,created_at,is_pinned,
        category:forum_categories(name)
      `)
      .eq("space_id", spaceId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(10),

    supabase
      .from("resource_items")
      .select(`
        id,title,kind,created_at,
        folder:resource_folders(name,space_id)
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const items: FeedItem[] = [];

  for (const a of announcementsRes.data ?? []) {
    items.push({
      id: a.id,
      type: "announcement",
      title: a.title,
      preview: a.body?.slice(0, 120) + (a.body?.length > 120 ? "..." : ""),
      created_at: a.created_at,
      is_pinned: a.is_pinned,
    });
  }

  for (const t of threadsRes.data ?? []) {
    items.push({
      id: t.id,
      type: "thread",
      title: t.title,
      preview: null,
      created_at: t.created_at,
      is_pinned: t.is_pinned,
      category_name: (t.category as any)?.name,
    });
  }

  for (const r of resourcesRes.data ?? []) {
    const folder = r.folder as any;
    if (folder?.space_id !== spaceId) continue;

    items.push({
      id: r.id,
      type: "resource",
      title: r.title,
      preview: null,
      created_at: r.created_at,
      folder_name: folder?.name,
      resource_kind: r.kind,
    });
  }

  items.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return items.slice(0, limit);
}

export async function getCommunityStats() {
  const supabase = supabaseServer();
  const spaceId = await getPortal28SpaceId();

  const [membersRes, threadsRes, announcementsRes] = await Promise.all([
    supabase.from("community_members").select("user_id", { count: "exact" }).eq("space_id", spaceId),
    supabase.from("forum_threads").select("id", { count: "exact" }).eq("space_id", spaceId),
    supabase.from("announcements").select("id", { count: "exact" }).eq("space_id", spaceId),
  ]);

  return {
    members: membersRes.count ?? 0,
    threads: threadsRes.count ?? 0,
    announcements: announcementsRes.count ?? 0,
  };
}
