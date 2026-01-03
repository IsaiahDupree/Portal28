-- Portal28 Academy - Whop-style Community System
-- Extends widgets for community apps, adds chat tables, enhanced RLS

-- =============================================================================
-- 0) Extend widgets to support "community apps" (instances)
-- =============================================================================

alter table widgets
  add column if not exists widget_kind text,
  add column if not exists nav_label text,
  add column if not exists nav_icon text,
  add column if not exists nav_order int not null default 0,
  add column if not exists community_space_id uuid;

-- =============================================================================
-- 1) Chat tables (Phase 2-ready)
-- =============================================================================

create table if not exists chat_channels (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references community_spaces(id) on delete cascade,
  slug text not null,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(space_id, slug)
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references chat_channels(id) on delete cascade,
  author_user_id uuid not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_channel on chat_messages(channel_id, created_at desc);

-- =============================================================================
-- 2) RLS helper functions
-- =============================================================================

create or replace function public.has_active_entitlement(scope_type_in text, scope_key_in text)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from entitlements e
    where e.user_id = auth.uid()
      and e.scope_type = scope_type_in
      and e.scope_key = scope_key_in
      and e.status = 'active'
  );
$$;

create or replace function public.is_space_staff(space_id_in uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from community_members m
    where m.space_id = space_id_in
      and m.user_id = auth.uid()
      and m.role in ('admin','mod')
  );
$$;

-- =============================================================================
-- 3) Enable RLS on chat tables
-- =============================================================================

alter table chat_channels enable row level security;
alter table chat_messages enable row level security;

-- Reads: any authenticated
create policy "read_chat_channels_authed" on chat_channels
for select using (auth.role() = 'authenticated');

create policy "read_chat_messages_authed" on chat_messages
for select using (auth.role() = 'authenticated');

-- Writes: require membership entitlement
create policy "write_chat_messages_members" on chat_messages
for insert with check (
  auth.role() = 'authenticated'
  and (public.has_active_entitlement('membership_tier','member')
       or public.has_active_entitlement('membership_tier','vip')
       or public.has_active_entitlement('membership_tier','pro'))
);

-- =============================================================================
-- 4) Enhanced forum policies for membership tiers
-- =============================================================================

drop policy if exists "Authenticated users can create threads" on forum_threads;
drop policy if exists "Authenticated users can create posts" on forum_posts;

create policy "write_forum_threads_members" on forum_threads
for insert with check (
  auth.role() = 'authenticated'
  and (public.has_active_entitlement('membership_tier','member')
       or public.has_active_entitlement('membership_tier','vip')
       or public.has_active_entitlement('membership_tier','pro'))
);

create policy "write_forum_posts_members" on forum_posts
for insert with check (
  auth.role() = 'authenticated'
  and (public.has_active_entitlement('membership_tier','member')
       or public.has_active_entitlement('membership_tier','vip')
       or public.has_active_entitlement('membership_tier','pro'))
);

-- Staff write policies for announcements/resources
create policy "write_announcements_staff" on announcements
for insert with check (auth.role() = 'authenticated' and public.is_space_staff(space_id));

create policy "update_announcements_staff" on announcements
for update using (auth.role() = 'authenticated' and public.is_space_staff(space_id));

create policy "write_resource_folders_staff" on resource_folders
for insert with check (auth.role() = 'authenticated' and public.is_space_staff(space_id));

create policy "write_resource_items_staff" on resource_items
for insert with check (
  auth.role() = 'authenticated'
  and public.is_space_staff((select f.space_id from resource_folders f where f.id = folder_id))
);

-- =============================================================================
-- 5) Seed default chat channels
-- =============================================================================

do $$
declare sid uuid;
begin
  select id into sid from community_spaces where slug = 'portal28';

  if sid is not null then
    insert into chat_channels (space_id, slug, name, sort_order)
    values
      (sid, 'general', 'General', 0),
      (sid, 'fb-ads', 'FB Ads', 1),
      (sid, 'wins', 'Wins', 2)
    on conflict (space_id, slug) do nothing;
  end if;
end$$;

-- =============================================================================
-- 6) Seed community widgets
-- =============================================================================

insert into widgets (key, name, route, widget_kind, nav_label, nav_icon, nav_order, saleswall_type, status)
values
  ('community-forum', 'Forums', '/app/community/forums', 'forum', 'Forums', '💬', 0, 'none', 'active'),
  ('community-announcements', 'Announcements', '/app/community/announcements', 'announcements', 'Announcements', '📢', 1, 'none', 'active'),
  ('community-resources', 'Resources', '/app/community/resources', 'resources', 'Resources', '📚', 2, 'none', 'active'),
  ('community-chat', 'Chat', '/app/community/chat', 'chat', 'Chat', '💭', 3, 'membership', 'active')
on conflict (key) do update set
  widget_kind = excluded.widget_kind,
  nav_label = excluded.nav_label,
  nav_icon = excluded.nav_icon,
  nav_order = excluded.nav_order;
