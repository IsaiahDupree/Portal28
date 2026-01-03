-- Portal28 Academy - Email Scheduler Schema
-- Prompt-Editable Email Programs + Automations

-- Email Programs (scheduled newsletters, campaigns, etc.)
create table if not exists public.email_programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  type text not null check (type in ('broadcast', 'transactional')),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  
  -- Schedule configuration
  schedule_text text, -- Human-readable: "every Monday 9am ET"
  schedule_cron text, -- Optional canonical cron: "0 9 * * 1"
  timezone text not null default 'America/New_York',
  
  -- Audience targeting
  audience_type text not null default 'all' check (audience_type in ('all', 'leads', 'customers', 'segment')),
  audience_filter_json jsonb default '{}',
  
  -- Prompt configuration
  prompt_base text, -- System style prompt (Portal28/Sarah's voice)
  prompt_current text, -- Current editable instruction
  
  -- Version tracking
  current_version_id uuid,
  
  -- Scheduling state
  next_run_at timestamptz,
  last_run_at timestamptz,
  
  -- Metadata
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Email Versions (history of changes for rollback)
create table if not exists public.email_versions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.email_programs(id) on delete cascade,
  version_number integer not null default 1,
  
  -- Who made the change
  created_by uuid references public.users(id),
  change_reason text, -- The prompt that caused this change
  
  -- Content
  subject text not null,
  preview_text text,
  html_content text not null,
  plain_text text,
  
  -- Snapshot of config at this version
  config_snapshot jsonb not null default '{}',
  
  -- Approval workflow
  status text not null default 'draft' check (status in ('draft', 'approved', 'sent', 'archived')),
  approved_at timestamptz,
  approved_by uuid references public.users(id),
  
  created_at timestamptz not null default now()
);

-- Email Runs (execution log)
create table if not exists public.email_runs (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.email_programs(id) on delete cascade,
  version_id uuid not null references public.email_versions(id) on delete cascade,
  
  -- Execution state
  status text not null default 'queued' check (status in ('queued', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  scheduled_for timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  
  -- Resend integration
  resend_id text, -- Email ID or Broadcast ID
  resend_batch_id text,
  
  -- Audience snapshot
  recipient_count integer default 0,
  audience_snapshot jsonb,
  
  -- Metrics (populated via webhooks)
  delivered_count integer default 0,
  opened_count integer default 0,
  clicked_count integer default 0,
  bounced_count integer default 0,
  complained_count integer default 0,
  
  -- Error handling
  error_message text,
  retry_count integer default 0,
  
  created_at timestamptz not null default now()
);

-- Email Automations (event-triggered drip sequences)
create table if not exists public.email_automations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  
  -- Trigger configuration
  trigger_event text not null, -- 'lead_created', 'purchase_completed', 'course_started', etc.
  trigger_filter_json jsonb default '{}',
  
  -- Prompt configuration
  prompt_base text,
  
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Automation Steps (the emails in a drip sequence)
create table if not exists public.automation_steps (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.email_automations(id) on delete cascade,
  step_order integer not null default 0,
  
  -- Delay configuration
  delay_value integer not null default 0, -- Number of units
  delay_unit text not null default 'days' check (delay_unit in ('minutes', 'hours', 'days', 'weeks')),
  
  -- Content
  subject text not null,
  preview_text text,
  html_content text not null,
  plain_text text,
  
  -- Prompt for this step
  prompt_instruction text,
  
  -- Status
  status text not null default 'draft' check (status in ('draft', 'active')),
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Automation Enrollments (users in an automation)
create table if not exists public.automation_enrollments (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.email_automations(id) on delete cascade,
  email text not null,
  user_id uuid references public.users(id),
  
  -- Progress tracking
  current_step integer default 0,
  status text not null default 'active' check (status in ('active', 'completed', 'paused', 'cancelled')),
  
  -- Scheduling
  next_step_at timestamptz,
  
  -- Trigger context
  trigger_data jsonb default '{}',
  
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  
  unique(automation_id, email)
);

-- Enable RLS
alter table public.email_programs enable row level security;
alter table public.email_versions enable row level security;
alter table public.email_runs enable row level security;
alter table public.email_automations enable row level security;
alter table public.automation_steps enable row level security;
alter table public.automation_enrollments enable row level security;

-- Indexes for scheduler performance
create index if not exists idx_email_programs_next_run on public.email_programs(next_run_at) where status = 'active';
create index if not exists idx_email_programs_status on public.email_programs(status);
create index if not exists idx_email_runs_status on public.email_runs(status);
create index if not exists idx_email_runs_scheduled on public.email_runs(scheduled_for) where status in ('queued', 'scheduled');
create index if not exists idx_automation_enrollments_next on public.automation_enrollments(next_step_at) where status = 'active';

-- Add foreign key for current_version_id after email_versions exists
alter table public.email_programs 
  add constraint fk_current_version 
  foreign key (current_version_id) 
  references public.email_versions(id) 
  on delete set null;

-- Auto-update updated_at
create trigger email_programs_updated_at
  before update on public.email_programs
  for each row
  execute function update_updated_at_column();

create trigger email_automations_updated_at
  before update on public.email_automations
  for each row
  execute function update_updated_at_column();

create trigger automation_steps_updated_at
  before update on public.automation_steps
  for each row
  execute function update_updated_at_column();
