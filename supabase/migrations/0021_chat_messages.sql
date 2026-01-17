-- Portal28 Academy - Realtime Chat
-- Chat messages for community spaces

-- =============================================================================
-- CHAT CHANNELS (within community spaces)
-- =============================================================================

create table if not exists public.chat_channels (
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

-- Add missing columns if table already exists from previous migration
alter table public.chat_channels add column if not exists description text;
alter table public.chat_channels add column if not exists icon text;
alter table public.chat_channels add column if not exists is_active boolean not null default true;
alter table public.chat_channels add column if not exists created_at timestamptz not null default now();

create index if not exists idx_chat_channels_space on public.chat_channels(space_id, sort_order);

-- Seed default channels (only if table was just created)
do $$
begin
  if exists (select 1 from public.community_spaces where slug = 'portal28') then
    insert into public.chat_channels (space_id, slug, name, description, icon, sort_order)
    select
      cs.id,
      chan.slug,
      chan.name,
      chan.description,
      chan.icon,
      chan.sort_order
    from public.community_spaces cs
    cross join (values
      ('general', 'General', 'Main chat for everyone', '💬', 0),
      ('wins', 'Wins & Celebrations', 'Share your wins!', '🎉', 1),
      ('questions', 'Questions & Help', 'Ask questions', '❓', 2)
    ) as chan(slug, name, description, icon, sort_order)
    where cs.slug = 'portal28'
    on conflict (space_id, slug) do nothing;
  end if;
end $$;

-- =============================================================================
-- CHAT MESSAGES
-- =============================================================================

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  user_id uuid not null,
  body text not null,
  is_edited boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add missing columns if table already exists from previous migration
alter table public.chat_messages add column if not exists is_edited boolean not null default false;
alter table public.chat_messages add column if not exists is_deleted boolean not null default false;
alter table public.chat_messages add column if not exists updated_at timestamptz not null default now();

-- Rename author_user_id to user_id for consistency (if old column exists)
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='chat_messages' and column_name='author_user_id') then
    alter table public.chat_messages rename column author_user_id to user_id;
  end if;
end $$;

create index if not exists idx_chat_messages_channel on public.chat_messages(channel_id, created_at desc);
create index if not exists idx_chat_messages_user on public.chat_messages(user_id);

-- =============================================================================
-- CHAT REACTIONS
-- =============================================================================

create table if not exists public.chat_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id uuid not null,
  emoji text not null, -- '👍', '❤️', '🔥', etc.
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

create index if not exists idx_chat_reactions_message on public.chat_reactions(message_id);

-- =============================================================================
-- TYPING INDICATORS (ephemeral, short-lived)
-- =============================================================================

create table if not exists public.chat_typing (
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  user_id uuid not null,
  started_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

-- Auto-expire old typing indicators (older than 10 seconds)
create index if not exists idx_chat_typing_expire on public.chat_typing(started_at);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

alter table public.chat_channels enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_reactions enable row level security;
alter table public.chat_typing enable row level security;

-- Chat channels: authenticated users can view active channels in their space
create policy "Authenticated users can view active chat channels"
  on public.chat_channels for select
  using (
    is_active = true
    and auth.uid() is not null
    and exists (
      select 1 from public.community_members cm
      where cm.space_id = chat_channels.space_id
        and cm.user_id = auth.uid()
        and cm.is_banned = false
    )
  );

-- Chat messages: members can view messages in their space channels
create policy "Community members can view chat messages"
  on public.chat_messages for select
  using (
    auth.uid() is not null
    and not is_deleted
    and exists (
      select 1 from public.chat_channels cc
      join public.community_members cm on cm.space_id = cc.space_id
      where cc.id = chat_messages.channel_id
        and cm.user_id = auth.uid()
        and cm.is_banned = false
    )
  );

-- Chat messages: authenticated users can create messages
create policy "Community members can create chat messages"
  on public.chat_messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.chat_channels cc
      join public.community_members cm on cm.space_id = cc.space_id
      where cc.id = chat_messages.channel_id
        and cm.user_id = auth.uid()
        and cm.is_banned = false
    )
  );

-- Chat messages: authors can update/delete own messages
create policy "Authors can update own chat messages"
  on public.chat_messages for update
  using (auth.uid() = user_id);

create policy "Authors can delete own chat messages"
  on public.chat_messages for delete
  using (auth.uid() = user_id);

-- Chat reactions: members can view all reactions
create policy "Community members can view chat reactions"
  on public.chat_reactions for select
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.chat_messages cm
      join public.chat_channels cc on cc.id = cm.channel_id
      join public.community_members cmem on cmem.space_id = cc.space_id
      where cm.id = chat_reactions.message_id
        and cmem.user_id = auth.uid()
        and cmem.is_banned = false
    )
  );

-- Chat reactions: authenticated users can add reactions
create policy "Community members can add chat reactions"
  on public.chat_reactions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.chat_messages cm
      join public.chat_channels cc on cc.id = cm.channel_id
      join public.community_members cmem on cmem.space_id = cc.space_id
      where cm.id = chat_reactions.message_id
        and cmem.user_id = auth.uid()
        and cmem.is_banned = false
    )
  );

-- Chat reactions: users can remove own reactions
create policy "Users can remove own chat reactions"
  on public.chat_reactions for delete
  using (auth.uid() = user_id);

-- Typing indicators: members can view typing status
create policy "Community members can view typing indicators"
  on public.chat_typing for select
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.chat_channels cc
      join public.community_members cm on cm.space_id = cc.space_id
      where cc.id = chat_typing.channel_id
        and cm.user_id = auth.uid()
        and cm.is_banned = false
    )
  );

-- Typing indicators: users can insert/update/delete own status
create policy "Users can manage own typing status"
  on public.chat_typing for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Trigger for updated_at
create trigger chat_messages_updated_at
  before update on public.chat_messages
  for each row
  execute function update_updated_at_column();

-- Function to clean up old typing indicators
create or replace function cleanup_old_typing_indicators()
returns void as $$
begin
  delete from public.chat_typing
  where started_at < now() - interval '10 seconds';
end;
$$ language plpgsql security definer;

-- =============================================================================
-- REALTIME PUBLICATION
-- =============================================================================

-- Enable realtime for chat messages (for subscriptions)
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.chat_reactions;
alter publication supabase_realtime add table public.chat_typing;
