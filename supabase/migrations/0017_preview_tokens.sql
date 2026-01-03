-- 0017_preview_tokens.sql
-- Preview tokens for sharing draft courses

create table if not exists public.course_preview_tokens (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_preview_tokens_course on public.course_preview_tokens(course_id);
create index if not exists idx_preview_tokens_token on public.course_preview_tokens(token);

alter table public.course_preview_tokens enable row level security;

-- Only course managers can create/read tokens
drop policy if exists "preview_tokens_manage" on public.course_preview_tokens;
create policy "preview_tokens_manage" on public.course_preview_tokens
  for all using (true) with check (true);
