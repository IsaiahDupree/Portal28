-- Portal28 Academy - Community Features (Whop-style)
-- Forums, Announcements, Resources

-- =============================================================================
-- COMMUNITY SPACES (container for all community features)
-- =============================================================================

create table if not exists public.community_spaces (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null default 'portal28',
  name text not null default 'Portal28 Community',
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Seed default space
insert into public.community_spaces (slug, name, description)
values ('portal28', 'Portal28 Community', 'Connect with other Portal28 members')
on conflict (slug) do nothing;

-- =============================================================================
-- COMMUNITY MEMBERS (roles within community)
-- =============================================================================

create table if not exists public.community_members (
  space_id uuid not null references public.community_spaces(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member' check (role in ('member', 'moderator', 'admin')),
  display_name text,
  bio text,
  avatar_url text,
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create index idx_community_members_user on public.community_members(user_id);

-- =============================================================================
-- FORUM CATEGORIES
-- =============================================================================

create table if not exists public.forum_categories (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.community_spaces(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  icon text, -- emoji or icon name
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(space_id, slug)
);

create index idx_forum_categories_space on public.forum_categories(space_id, sort_order);

-- Seed default categories
insert into public.forum_categories (space_id, slug, name, description, icon, sort_order)
select 
  cs.id,
  cat.slug,
  cat.name,
  cat.description,
  cat.icon,
  cat.sort_order
from public.community_spaces cs
cross join (values
  ('general', 'General Discussion', 'Chat about anything', '💬', 0),
  ('wins', 'Wins & Celebrations', 'Share your wins!', '🎉', 1),
  ('questions', 'Questions & Help', 'Get help from the community', '❓', 2),
  ('resources', 'Resource Sharing', 'Share helpful resources', '📚', 3),
  ('feedback', 'Feedback & Ideas', 'Suggest improvements', '💡', 4)
) as cat(slug, name, description, icon, sort_order)
where cs.slug = 'portal28'
on conflict (space_id, slug) do nothing;

-- =============================================================================
-- FORUM THREADS
-- =============================================================================

create table if not exists public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.community_spaces(id) on delete cascade,
  category_id uuid references public.forum_categories(id) on delete set null,
  title text not null,
  author_user_id uuid not null,
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  is_hidden boolean not null default false,
  reply_count int not null default 0,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_forum_threads_category on public.forum_threads(category_id, is_pinned desc, last_activity_at desc);
create index idx_forum_threads_author on public.forum_threads(author_user_id);

-- =============================================================================
-- FORUM POSTS (replies to threads)
-- =============================================================================

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads(id) on delete cascade,
  author_user_id uuid not null,
  body text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_forum_posts_thread on public.forum_posts(thread_id, created_at);
create index idx_forum_posts_author on public.forum_posts(author_user_id);

-- =============================================================================
-- FORUM REACTIONS
-- =============================================================================

create table if not exists public.forum_reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  thread_id uuid references public.forum_threads(id) on delete cascade,
  post_id uuid references public.forum_posts(id) on delete cascade,
  emoji text not null, -- '👍', '❤️', '🔥', etc.
  created_at timestamptz not null default now(),
  check (thread_id is not null or post_id is not null),
  unique (user_id, thread_id, emoji),
  unique (user_id, post_id, emoji)
);

create index idx_forum_reactions_thread on public.forum_reactions(thread_id) where thread_id is not null;
create index idx_forum_reactions_post on public.forum_reactions(post_id) where post_id is not null;

-- =============================================================================
-- ANNOUNCEMENTS
-- =============================================================================

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.community_spaces(id) on delete cascade,
  title text not null,
  body text not null,
  author_user_id uuid not null,
  tags jsonb not null default '[]'::jsonb, -- ["update", "important"]
  is_pinned boolean not null default false,
  is_published boolean not null default true,
  send_email boolean not null default false,
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_announcements_space on public.announcements(space_id, is_published, created_at desc);

-- =============================================================================
-- RESOURCE FOLDERS
-- =============================================================================

create table if not exists public.resource_folders (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.community_spaces(id) on delete cascade,
  parent_id uuid references public.resource_folders(id) on delete cascade,
  name text not null,
  description text,
  icon text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_resource_folders_parent on public.resource_folders(space_id, parent_id, sort_order);

-- Seed default folders
insert into public.resource_folders (space_id, name, description, icon, sort_order)
select 
  cs.id,
  folder.name,
  folder.description,
  folder.icon,
  folder.sort_order
from public.community_spaces cs
cross join (values
  ('Getting Started', 'Guides for new members', '🚀', 0),
  ('Templates', 'Ad templates and frameworks', '📝', 1),
  ('Swipe Files', 'Proven ad examples', '📂', 2),
  ('Checklists', 'Launch and optimization checklists', '✅', 3)
) as folder(name, description, icon, sort_order)
where cs.slug = 'portal28'
on conflict do nothing;

-- =============================================================================
-- RESOURCE ITEMS
-- =============================================================================

create table if not exists public.resource_items (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.resource_folders(id) on delete cascade,
  kind text not null check (kind in ('link', 'file', 'note')),
  title text not null,
  description text,
  url text, -- for links
  storage_path text, -- for files in Supabase Storage
  body text, -- for notes (markdown)
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_resource_items_folder on public.resource_items(folder_id, sort_order);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

alter table public.community_spaces enable row level security;
alter table public.community_members enable row level security;
alter table public.forum_categories enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_reactions enable row level security;
alter table public.announcements enable row level security;
alter table public.resource_folders enable row level security;
alter table public.resource_items enable row level security;

-- Community spaces: public read for active
create policy "Anyone can view active community spaces"
  on public.community_spaces for select
  using (is_active = true);

-- Community members: users can view all members, update own
create policy "Anyone can view community members"
  on public.community_members for select
  using (true);

create policy "Users can update own community profile"
  on public.community_members for update
  using (auth.uid() = user_id);

-- Forum categories: public read for active
create policy "Anyone can view active forum categories"
  on public.forum_categories for select
  using (is_active = true);

-- Forum threads: public read for non-hidden
create policy "Anyone can view visible forum threads"
  on public.forum_threads for select
  using (is_hidden = false);

create policy "Authenticated users can create threads"
  on public.forum_threads for insert
  with check (auth.uid() = author_user_id);

create policy "Authors can update own threads"
  on public.forum_threads for update
  using (auth.uid() = author_user_id);

-- Forum posts: public read for non-hidden
create policy "Anyone can view visible forum posts"
  on public.forum_posts for select
  using (is_hidden = false);

create policy "Authenticated users can create posts"
  on public.forum_posts for insert
  with check (auth.uid() = author_user_id);

create policy "Authors can update own posts"
  on public.forum_posts for update
  using (auth.uid() = author_user_id);

-- Forum reactions: authenticated users
create policy "Anyone can view reactions"
  on public.forum_reactions for select
  using (true);

create policy "Authenticated users can add reactions"
  on public.forum_reactions for insert
  with check (auth.uid() = user_id);

create policy "Users can remove own reactions"
  on public.forum_reactions for delete
  using (auth.uid() = user_id);

-- Announcements: public read for published
create policy "Anyone can view published announcements"
  on public.announcements for select
  using (is_published = true);

-- Resource folders: public read for active
create policy "Anyone can view active resource folders"
  on public.resource_folders for select
  using (is_active = true);

-- Resource items: public read for active
create policy "Anyone can view active resource items"
  on public.resource_items for select
  using (is_active = true);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Update thread reply count and last activity
create or replace function update_thread_stats()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.forum_threads
    set reply_count = reply_count + 1,
        last_activity_at = now()
    where id = NEW.thread_id;
  elsif TG_OP = 'DELETE' then
    update public.forum_threads
    set reply_count = greatest(0, reply_count - 1)
    where id = OLD.thread_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger forum_posts_stats
  after insert or delete on public.forum_posts
  for each row
  execute function update_thread_stats();

-- Triggers for updated_at
create trigger forum_threads_updated_at
  before update on public.forum_threads
  for each row
  execute function update_updated_at_column();

create trigger forum_posts_updated_at
  before update on public.forum_posts
  for each row
  execute function update_updated_at_column();

create trigger announcements_updated_at
  before update on public.announcements
  for each row
  execute function update_updated_at_column();

create trigger resource_items_updated_at
  before update on public.resource_items
  for each row
  execute function update_updated_at_column();
