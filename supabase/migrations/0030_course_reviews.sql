-- Course Reviews and Ratings (feat-221)
-- Enables students to leave reviews and ratings for courses they've completed

-- Create course_reviews table
create table if not exists public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  review_text text,
  is_published boolean default false,
  moderation_status text default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  moderator_id uuid references auth.users(id) on delete set null,
  moderation_notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  -- Ensure one review per user per course
  unique(user_id, course_id)
);

-- Create indexes
create index if not exists idx_course_reviews_course_id on public.course_reviews(course_id);
create index if not exists idx_course_reviews_user_id on public.course_reviews(user_id);
create index if not exists idx_course_reviews_published on public.course_reviews(is_published) where is_published = true;
create index if not exists idx_course_reviews_moderation on public.course_reviews(moderation_status);

-- RLS Policies
alter table public.course_reviews enable row level security;

-- Users can view published reviews
create policy "Anyone can view published reviews"
  on public.course_reviews
  for select
  using (is_published = true);

-- Users can view their own reviews (published or not)
create policy "Users can view their own reviews"
  on public.course_reviews
  for select
  using (auth.uid() = user_id);

-- Users can create reviews for courses they have access to
create policy "Users can create reviews for courses they have entitlements for"
  on public.course_reviews
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.entitlements
      where entitlements.user_id = auth.uid()
      and entitlements.course_id = course_reviews.course_id
      and entitlements.status = 'active'
    )
  );

-- Users can update their own unpublished reviews
create policy "Users can update their own unpublished reviews"
  on public.course_reviews
  for update
  using (auth.uid() = user_id and moderation_status = 'pending')
  with check (auth.uid() = user_id);

-- Users can delete their own reviews
create policy "Users can delete their own reviews"
  on public.course_reviews
  for delete
  using (auth.uid() = user_id);

-- Admins can view all reviews
create policy "Admins can view all reviews"
  on public.course_reviews
  for select
  using (
    exists (
      select 1 from public.user_metadata
      where user_metadata.user_id = auth.uid()
      and user_metadata.role = 'admin'
    )
  );

-- Admins can moderate reviews
create policy "Admins can moderate reviews"
  on public.course_reviews
  for update
  using (
    exists (
      select 1 from public.user_metadata
      where user_metadata.user_id = auth.uid()
      and user_metadata.role = 'admin'
    )
  );

-- Create a function to calculate average rating for a course
create or replace function public.get_course_average_rating(p_course_id uuid)
returns table (
  average_rating numeric,
  total_reviews bigint
) as $$
begin
  return query
  select
    round(avg(rating)::numeric, 2) as average_rating,
    count(*) as total_reviews
  from public.course_reviews
  where course_id = p_course_id
  and is_published = true;
end;
$$ language plpgsql security definer;

-- Create a trigger to update the updated_at timestamp
create or replace function public.update_course_reviews_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_course_reviews_updated_at
  before update on public.course_reviews
  for each row
  execute function public.update_course_reviews_updated_at();

-- Grant necessary permissions
grant usage on schema public to authenticated;
grant all on public.course_reviews to authenticated;
grant execute on function public.get_course_average_rating to authenticated;
grant execute on function public.get_course_average_rating to anon;
