-- Templates Vault App (feat-075)
-- Enables users to browse, download, and copy templates organized by category

-- Templates table
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'general', -- general|design|code|business|marketing|other
  file_url text, -- storage URL for downloadable file
  file_name text, -- original filename
  file_size_bytes bigint, -- file size in bytes
  file_type text, -- file MIME type
  preview_url text, -- preview image URL
  content text, -- text content for copy functionality
  tags text[] default '{}', -- searchable tags
  download_count int not null default 0,
  copy_count int not null default 0,
  is_published boolean not null default true,
  is_premium boolean not null default false, -- require entitlement
  required_product_id uuid, -- references products table (not enforced by FK)
  sort_order int not null default 0,
  metadata jsonb default '{}'::jsonb, -- for extensibility
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Validation
  constraint valid_category check (category in ('general', 'design', 'code', 'business', 'marketing', 'other')),
  constraint valid_file_size check (file_size_bytes is null or file_size_bytes >= 0),
  constraint valid_download_count check (download_count >= 0),
  constraint valid_copy_count check (copy_count >= 0),
  constraint has_content check (file_url is not null or content is not null)
);

-- Template downloads tracking table
create table if not exists public.template_downloads (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  download_type text not null default 'download', -- download|copy
  user_agent text,
  ip_address inet,
  created_at timestamptz not null default now(),

  -- Validation
  constraint valid_download_type check (download_type in ('download', 'copy'))
);

-- Indexes for performance
create index if not exists idx_templates_category on public.templates(category);
create index if not exists idx_templates_published on public.templates(is_published) where is_published = true;
create index if not exists idx_templates_premium on public.templates(is_premium);
create index if not exists idx_templates_sort_order on public.templates(sort_order);
create index if not exists idx_templates_created_at on public.templates(created_at desc);
create index if not exists idx_templates_tags on public.templates using gin(tags);
create index if not exists idx_template_downloads_template_id on public.template_downloads(template_id);
create index if not exists idx_template_downloads_user_id on public.template_downloads(user_id);
create index if not exists idx_template_downloads_created_at on public.template_downloads(created_at desc);

-- RLS Policies

-- Templates: Anyone can view published templates
alter table public.templates enable row level security;

create policy "Anyone can view published free templates"
  on public.templates for select
  using (is_published = true and is_premium = false);

create policy "Users can view premium templates if they have entitlement"
  on public.templates for select
  using (
    is_published = true and
    is_premium = true and
    (
      required_product_id is null or
      exists (
        select 1 from public.entitlements e
        where e.user_id = auth.uid()
        and e.course_id = required_product_id
        and e.status = 'active'
      )
    )
  );

create policy "Admin users can view all templates"
  on public.templates for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

create policy "Admin users can create templates"
  on public.templates for insert
  with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

create policy "Admin users can update templates"
  on public.templates for update
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

create policy "Admin users can delete templates"
  on public.templates for delete
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

-- Template Downloads: Users can see their own downloads
alter table public.template_downloads enable row level security;

create policy "Users can view their own downloads"
  on public.template_downloads for select
  using (auth.uid() = user_id);

create policy "Admin users can view all downloads"
  on public.template_downloads for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

create policy "Authenticated users can create download records"
  on public.template_downloads for insert
  with check (auth.uid() = user_id);

-- Function: Increment download/copy count
create or replace function public.increment_template_counter()
returns trigger as $$
begin
  if NEW.download_type = 'download' then
    update public.templates
    set download_count = download_count + 1
    where id = NEW.template_id;
  elsif NEW.download_type = 'copy' then
    update public.templates
    set copy_count = copy_count + 1
    where id = NEW.template_id;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger: Update download/copy count on new download
create trigger increment_template_counter_trigger
  after insert on public.template_downloads
  for each row
  execute function public.increment_template_counter();

-- Function: Get published templates with access check
create or replace function public.get_published_templates(
  filter_category text default null,
  limit_count int default 100,
  offset_count int default 0
)
returns table (
  id uuid,
  title text,
  description text,
  category text,
  file_url text,
  file_name text,
  file_size_bytes bigint,
  file_type text,
  preview_url text,
  content text,
  tags text[],
  download_count int,
  copy_count int,
  is_premium boolean,
  has_access boolean,
  sort_order int,
  created_at timestamptz
) as $$
begin
  return query
  select
    t.id,
    t.title,
    t.description,
    t.category,
    t.file_url,
    t.file_name,
    t.file_size_bytes,
    t.file_type,
    t.preview_url,
    t.content,
    t.tags,
    t.download_count,
    t.copy_count,
    t.is_premium,
    case
      when t.is_premium = false then true
      when t.required_product_id is null then true
      when exists (
        select 1 from public.entitlements e
        where e.user_id = auth.uid()
        and e.product_id = t.required_product_id
        and e.status = 'active'
      ) then true
      else false
    end as has_access,
    t.sort_order,
    t.created_at
  from public.templates t
  where t.is_published = true
  and (filter_category is null or t.category = filter_category)
  order by t.sort_order asc, t.created_at desc
  limit limit_count
  offset offset_count;
end;
$$ language plpgsql security definer;

-- Function: Record template download
create or replace function public.record_template_download(
  p_template_id uuid,
  p_download_type text,
  p_user_agent text default null
)
returns uuid as $$
declare
  v_download_id uuid;
  v_has_access boolean;
  v_is_premium boolean;
  v_required_product_id uuid;
begin
  -- Check if template exists and get access info
  select is_premium, required_product_id
  into v_is_premium, v_required_product_id
  from public.templates
  where id = p_template_id and is_published = true;

  if not found then
    raise exception 'Template not found or not published';
  end if;

  -- Check access for premium templates
  if v_is_premium = true and v_required_product_id is not null then
    select exists (
      select 1 from public.entitlements e
      where e.user_id = auth.uid()
      and e.product_id = v_required_product_id
      and e.status = 'active'
    ) into v_has_access;

    if not v_has_access then
      raise exception 'Access denied: Premium template requires entitlement';
    end if;
  end if;

  -- Record the download
  insert into public.template_downloads (template_id, user_id, download_type, user_agent)
  values (p_template_id, auth.uid(), p_download_type, p_user_agent)
  returning id into v_download_id;

  return v_download_id;
end;
$$ language plpgsql security definer;

-- Updated_at trigger
create trigger update_templates_updated_at
  before update on public.templates
  for each row
  execute function public.update_updated_at_column();
