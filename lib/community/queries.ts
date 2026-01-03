import { supabaseServer } from "@/lib/supabase/server";

export async function getDefaultSpace() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("community_spaces")
    .select("*")
    .eq("slug", "portal28")
    .single();

  if (error) return null;
  return data;
}

export async function getForumCategories(spaceId: string) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("forum_categories")
    .select("*")
    .eq("space_id", spaceId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return [];
  return data ?? [];
}

export async function getForumCategoryBySlug(spaceId: string, slug: string) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("forum_categories")
    .select("*")
    .eq("space_id", spaceId)
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data;
}

export async function getThreadsByCategory(categoryId: string) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("forum_threads")
    .select(`
      id,
      title,
      author_user_id,
      is_pinned,
      is_locked,
      reply_count,
      last_activity_at,
      created_at
    `)
    .eq("category_id", categoryId)
    .eq("is_hidden", false)
    .order("is_pinned", { ascending: false })
    .order("last_activity_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function getThreadById(threadId: string) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("forum_threads")
    .select(`
      *,
      forum_categories (
        id,
        slug,
        name
      )
    `)
    .eq("id", threadId)
    .single();

  if (error) return null;
  return data;
}

export async function getPostsByThread(threadId: string) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("forum_posts")
    .select(`
      id,
      author_user_id,
      body,
      created_at,
      updated_at
    `)
    .eq("thread_id", threadId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: true });

  if (error) return [];
  return data ?? [];
}

export async function getAnnouncements(spaceId: string, limit = 20) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("space_id", spaceId)
    .eq("is_published", true)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}

export async function getResourceFolders(spaceId: string, parentId: string | null = null) {
  const supabase = supabaseServer();
  
  let query = supabase
    .from("resource_folders")
    .select("*")
    .eq("space_id", spaceId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (parentId) {
    query = query.eq("parent_id", parentId);
  } else {
    query = query.is("parent_id", null);
  }

  const { data, error } = await query;
  if (error) return [];
  return data ?? [];
}

export async function getResourceItems(folderId: string) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("resource_items")
    .select("*")
    .eq("folder_id", folderId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return [];
  return data ?? [];
}

export async function getCommunityMember(spaceId: string, userId: string) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("community_members")
    .select("*")
    .eq("space_id", spaceId)
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data;
}

export async function ensureCommunityMember(spaceId: string, userId: string) {
  const supabase = supabaseServer();
  
  const existing = await getCommunityMember(spaceId, userId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("community_members")
    .insert({ space_id: spaceId, user_id: userId, role: "member" })
    .select()
    .single();

  if (error) return null;
  return data;
}
