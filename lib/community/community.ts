import { supabaseServer } from "@/lib/supabase/server";

export type CommunityWidget = {
  key: string;
  widget_kind: "forum" | "announcements" | "resources" | "chat";
  name: string;
  nav_label: string | null;
  nav_icon: string | null;
  nav_order: number;
  saleswall_type: string | null;
  saleswall_config: Record<string, any> | null;
  community_space_id: string | null;
  is_active: boolean;
};

export async function getPortal28SpaceId(): Promise<string> {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("community_spaces")
    .select("id")
    .eq("slug", "portal28")
    .single();
  return data?.id ?? "";
}

export async function getCommunityWidgets(): Promise<CommunityWidget[]> {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("widgets")
    .select("key,widget_kind,name,nav_label,nav_icon,nav_order,saleswall_type,saleswall_config,community_space_id,is_active")
    .in("widget_kind", ["forum", "announcements", "resources", "chat"])
    .eq("is_active", true)
    .order("nav_order", { ascending: true });

  return (data ?? []) as CommunityWidget[];
}

export async function getWidgetByKey(key: string): Promise<CommunityWidget | null> {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("widgets")
    .select("key,widget_kind,name,nav_label,nav_icon,nav_order,saleswall_type,saleswall_config,community_space_id,is_active")
    .eq("key", key)
    .single();

  return data as CommunityWidget | null;
}

export async function userHasEntitlement(
  userId: string,
  scopeType: string,
  scopeKey: string
): Promise<boolean> {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("entitlements")
    .select("status")
    .eq("user_id", userId)
    .eq("scope_type", scopeType)
    .eq("scope_key", scopeKey)
    .eq("status", "active")
    .limit(1);

  return !!(data && data.length);
}

export async function canAccessCommunityWidget(
  userId: string,
  widget: CommunityWidget
): Promise<boolean> {
  const type = widget.saleswall_type ?? "none";
  const cfg = widget.saleswall_config ?? {};

  if (type === "none") return true;

  const tiers: string[] = cfg.tiers ?? ["member", "vip", "pro"];
  const courseSlugs: string[] = cfg.courseSlugs ?? [];

  const hasTier = async () => {
    for (const t of tiers) {
      if (await userHasEntitlement(userId, "membership_tier", t)) return true;
    }
    return false;
  };

  const hasCourse = async () => {
    for (const c of courseSlugs) {
      if (await userHasEntitlement(userId, "course", c)) return true;
    }
    return false;
  };

  if (type === "membership") return await hasTier();
  if (type === "course") return await hasCourse();
  if (type === "hybrid") return (await hasTier()) || (await hasCourse());

  return true;
}

export async function getForumCategories(spaceId: string) {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("forum_categories")
    .select("id,slug,name,description,icon,sort_order")
    .eq("space_id", spaceId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return data ?? [];
}

export async function getForumThreads(categoryId: string, limit = 50) {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("forum_threads")
    .select("id,title,author_user_id,is_pinned,is_locked,reply_count,last_activity_at,created_at")
    .eq("category_id", categoryId)
    .eq("is_hidden", false)
    .order("is_pinned", { ascending: false })
    .order("last_activity_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function getThreadWithPosts(threadId: string) {
  const supabase = supabaseServer();

  const { data: thread } = await supabase
    .from("forum_threads")
    .select("id,title,author_user_id,is_pinned,is_locked,created_at,category_id")
    .eq("id", threadId)
    .single();

  const { data: posts } = await supabase
    .from("forum_posts")
    .select("id,body,author_user_id,created_at")
    .eq("thread_id", threadId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: true });

  return { thread, posts: posts ?? [] };
}

export async function getAnnouncements(spaceId: string, limit = 50) {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("announcements")
    .select("id,title,body,tags,is_pinned,created_at")
    .eq("space_id", spaceId)
    .eq("is_published", true)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function getResourceFolders(spaceId: string, parentId: string | null = null) {
  const supabase = supabaseServer();

  let query = supabase
    .from("resource_folders")
    .select("id,name,icon,description,sort_order,parent_id")
    .eq("space_id", spaceId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (parentId) {
    query = query.eq("parent_id", parentId);
  } else {
    query = query.is("parent_id", null);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getResourceItems(folderId: string) {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("resource_items")
    .select("id,kind,title,description,url,storage_path,body,created_at")
    .eq("folder_id", folderId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return data ?? [];
}

export async function getChatChannels(spaceId: string) {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("chat_channels")
    .select("id,slug,name,sort_order")
    .eq("space_id", spaceId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return data ?? [];
}
