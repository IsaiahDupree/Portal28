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
    .select(`
      *,
      thread_count:forum_threads(count)
    `)
    .eq("space_id", spaceId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return [];

  // Transform the thread_count from array format to number
  return (data ?? []).map((cat: any) => ({
    ...cat,
    thread_count: cat.thread_count?.[0]?.count ?? 0
  }));
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

// ============================================================================
// SPACE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Create a new community space
 * @param slug - Unique slug for the space
 * @param name - Display name
 * @param description - Optional description
 * @returns Created space or null on error
 */
export async function createCommunitySpace(
  slug: string,
  name: string,
  description?: string
) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("community_spaces")
    .insert({
      slug,
      name,
      description: description ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating community space:", error);
    return null;
  }
  return data;
}

/**
 * Get a community space by its slug
 * @param slug - Space slug
 * @returns Space data or null if not found
 */
export async function getSpaceBySlug(slug: string) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("community_spaces")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error) return null;
  return data;
}

/**
 * Get all active community spaces
 * @returns Array of active spaces
 */
export async function getAllSpaces() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("community_spaces")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) return [];
  return data ?? [];
}

/**
 * Get spaces accessible to a specific user
 * For now, returns all active spaces (can be extended with access control)
 * @param userId - User ID
 * @returns Array of accessible spaces
 */
export async function getUserAccessibleSpaces(userId: string) {
  const supabase = supabaseServer();

  // Get all spaces where user is a member OR all public spaces
  const { data, error } = await supabase
    .from("community_spaces")
    .select(`
      *,
      community_members!left(user_id, role)
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) return [];

  // For now, return all active spaces since there's no access restriction
  // In the future, this could filter based on membership or entitlements
  return data ?? [];
}

/**
 * Check if user has access to a specific space
 * @param userId - User ID
 * @param spaceId - Space ID
 * @returns true if user has access
 */
export async function userHasSpaceAccess(userId: string, spaceId: string): Promise<boolean> {
  const supabase = supabaseServer();

  // Check if space is active
  const { data: space } = await supabase
    .from("community_spaces")
    .select("is_active")
    .eq("id", spaceId)
    .single();

  if (!space || !space.is_active) return false;

  // For now, all authenticated users have access to active spaces
  // Future enhancement: Check community_members table or entitlements
  return true;
}

/**
 * Check if user is a member of a space
 * @param userId - User ID
 * @param spaceId - Space ID
 * @returns true if user is a member
 */
export async function isSpaceMember(userId: string, spaceId: string): Promise<boolean> {
  const member = await getCommunityMember(spaceId, userId);
  return member !== null && !member.is_banned;
}

// ============================================================================
// CHAT FUNCTIONS
// ============================================================================

/**
 * Get all chat channels for a space
 * @param spaceId - Community space ID
 * @returns Array of active chat channels
 */
export async function getChatChannels(spaceId: string) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("chat_channels")
    .select("*")
    .eq("space_id", spaceId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return [];
  return data ?? [];
}

/**
 * Get a chat channel by slug
 * @param spaceId - Community space ID
 * @param slug - Channel slug
 * @returns Channel data or null if not found
 */
export async function getChatChannelBySlug(spaceId: string, slug: string) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("chat_channels")
    .select("*")
    .eq("space_id", spaceId)
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data;
}

/**
 * Get messages for a channel with pagination
 * @param channelId - Channel ID
 * @param limit - Number of messages to load (default 50)
 * @param before - Load messages before this timestamp (for pagination)
 * @returns Array of messages with user info
 */
export async function getChatMessages(
  channelId: string,
  limit = 50,
  before?: string
) {
  const supabase = supabaseServer();

  let query = supabase
    .from("chat_messages")
    .select(`
      id,
      channel_id,
      user_id,
      body,
      is_edited,
      created_at,
      updated_at
    `)
    .eq("channel_id", channelId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;

  if (error) return [];

  // Return in ascending order (oldest first)
  return (data ?? []).reverse();
}

/**
 * Get reactions for a message
 * @param messageId - Message ID
 * @returns Array of reactions with counts
 */
export async function getChatReactions(messageId: string) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("chat_reactions")
    .select("emoji, user_id, created_at")
    .eq("message_id", messageId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return data ?? [];
}

/**
 * Get typing users for a channel
 * @param channelId - Channel ID
 * @returns Array of user IDs currently typing
 */
export async function getTypingUsers(channelId: string) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("chat_typing")
    .select("user_id")
    .eq("channel_id", channelId)
    .gt("started_at", new Date(Date.now() - 10000).toISOString()); // Last 10 seconds

  if (error) return [];
  return data?.map(d => d.user_id) ?? [];
}
