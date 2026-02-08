-- Workspace/Experiences System (feat-078)
-- Enables creators to organize multiple products/offerings into separate branded experiences
-- Similar to Whop's "products" - one account can have multiple product experiences

-- Workspaces table already exists from 0015_course_studio.sql
-- Add missing columns to workspaces table
alter table public.workspaces add column if not exists description text;
alter table public.workspaces add column if not exists brand_color text;
alter table public.workspaces add column if not exists status text not null default 'active';
alter table public.workspaces add column if not exists is_default boolean not null default false;
alter table public.workspaces add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.workspaces add column if not exists created_by uuid references auth.users(id) on delete set null;

-- Rename owner_user_id to created_by if it exists (migration compatibility)
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public'
             and table_name = 'workspaces'
             and column_name = 'owner_user_id') then
    -- Copy data from owner_user_id to created_by
    update public.workspaces set created_by = owner_user_id where created_by is null;
  end if;
end $$;

-- Add validation constraints (if not already exists)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'valid_status') then
    alter table public.workspaces add constraint valid_status check (status in ('active', 'archived'));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'valid_slug') then
    alter table public.workspaces add constraint valid_slug check (slug ~ '^[a-z0-9-]+$');
  end if;
end $$;

-- Products table (generalized concept for courses, memberships, digital products, etc.)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_type text not null default 'course', -- course|membership|template|digital_product|event|coaching
  reference_id uuid, -- ID of the actual product (course_id, membership_id, etc.)
  name text not null,
  description text,
  price_cents int,
  currency text default 'usd',
  status text not null default 'draft', -- draft|published|archived
  sort_order int not null default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Validation
  constraint valid_product_type check (product_type in ('course', 'membership', 'template', 'digital_product', 'event', 'coaching')),
  constraint valid_status check (status in ('draft', 'published', 'archived')),
  constraint valid_price check (price_cents is null or price_cents >= 0)
);

-- Workspace members (for access control)
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member', -- admin|editor|member
  created_at timestamptz not null default now(),

  -- Validation
  constraint valid_role check (role in ('admin', 'editor', 'member')),
  constraint unique_workspace_member unique (workspace_id, user_id)
);

-- Enable Row Level Security
alter table public.workspaces enable row level security;
alter table public.products enable row level security;
alter table public.workspace_members enable row level security;

-- RLS Policies

-- workspaces: active workspaces are publicly readable
create policy "workspaces_public_read_active" on public.workspaces
for select using (status = 'active');

-- workspaces: creators can manage their own workspaces
create policy "workspaces_creators_all" on public.workspaces
for all using (created_by = auth.uid());

-- products: published products in active workspaces are publicly readable
create policy "products_public_read_published" on public.products
for select using (
  status = 'published' and
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.status = 'active'
  )
);

-- products: workspace admins/editors can manage products
create policy "products_workspace_admins_all" on public.products
for all using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = products.workspace_id
    and wm.user_id = auth.uid()
    and wm.role in ('admin', 'editor')
  )
);

-- workspace_members: users can read their own memberships
create policy "workspace_members_select_own" on public.workspace_members
for select using (user_id = auth.uid());

-- workspace_members: workspace admins can manage members
create policy "workspace_members_admins_all" on public.workspace_members
for all using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
    and wm.user_id = auth.uid()
    and wm.role = 'admin'
  )
);

-- Indexes for performance
create index if not exists idx_workspaces_slug on public.workspaces(slug);
create index if not exists idx_workspaces_status on public.workspaces(status);
create index if not exists idx_workspaces_created_by on public.workspaces(created_by);
create index if not exists idx_products_workspace_id on public.products(workspace_id);
create index if not exists idx_products_product_type on public.products(product_type);
create index if not exists idx_products_reference_id on public.products(reference_id);
create index if not exists idx_products_status on public.products(status);
create index if not exists idx_workspace_members_workspace_id on public.workspace_members(workspace_id);
create index if not exists idx_workspace_members_user_id on public.workspace_members(user_id);

-- Migration: Create default workspace for existing courses
-- This ensures backward compatibility
do $$
declare
  v_default_workspace_id uuid;
  v_admin_user_id uuid;
begin
  -- Get first admin user (if any)
  select id into v_admin_user_id
  from auth.users
  limit 1;

  -- Create default workspace
  insert into public.workspaces (
    name,
    slug,
    description,
    is_default,
    status,
    created_by
  ) values (
    'Portal28 Academy',
    'portal28-academy',
    'Default workspace for Portal28 Academy',
    true,
    'active',
    v_admin_user_id
  )
  returning id into v_default_workspace_id;

  -- Migrate existing courses to products in default workspace
  insert into public.products (
    workspace_id,
    product_type,
    reference_id,
    name,
    description,
    status,
    created_at,
    updated_at
  )
  select
    v_default_workspace_id,
    'course',
    c.id,
    c.title,
    c.description,
    c.status, -- draft or published
    c.created_at,
    c.created_at
  from public.courses c;

  -- Add admin user as workspace admin (if exists)
  if v_admin_user_id is not null then
    insert into public.workspace_members (
      workspace_id,
      user_id,
      role
    ) values (
      v_default_workspace_id,
      v_admin_user_id,
      'admin'
    );
  end if;
end $$;

-- Function to automatically set updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger workspaces_updated_at
  before update on public.workspaces
  for each row
  execute function public.handle_updated_at();

create trigger products_updated_at
  before update on public.products
  for each row
  execute function public.handle_updated_at();

-- Comments for documentation
comment on table public.workspaces is 'Workspaces (aka Experiences/Products) - allows creators to organize multiple products into separate branded experiences';
comment on table public.products is 'Generalized products table - links to specific product types (courses, memberships, etc.) and organizes them within workspaces';
comment on table public.workspace_members is 'Access control for workspaces - determines who can manage products within a workspace';
