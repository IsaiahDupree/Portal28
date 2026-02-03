-- Portal28 Academy - Order Bumps Feature
-- Adds support for order bump offers (post-selection upsells)

-- =============================================================================
-- UPDATE OFFERS TABLE - Add 'order_bump' kind
-- =============================================================================

-- Drop existing check constraint
alter table public.offers
  drop constraint if exists offers_kind_check;

-- Add new check constraint including 'order_bump'
alter table public.offers
  add constraint offers_kind_check
  check (kind in ('membership', 'course', 'bundle', 'order_bump'));

-- Add order bump specific fields to offers table
alter table public.offers
  add column if not exists parent_offer_key text references public.offers(key) on delete cascade,
  add column if not exists headline text,
  add column if not exists description text;

-- Add index for faster lookups of bumps by parent offer
create index if not exists idx_offers_parent_offer_key
  on public.offers(parent_offer_key)
  where parent_offer_key is not null;

-- Add comment
comment on column public.offers.parent_offer_key is 'For order_bump kind: the offer this bump should appear with';
comment on column public.offers.headline is 'For order_bump kind: bold headline text (e.g., "Add the Advanced Module")';
comment on column public.offers.description is 'For order_bump kind: supporting description text';

-- =============================================================================
-- INSERT SAMPLE ORDER BUMP OFFERS
-- =============================================================================

-- Sample order bump for a course offer
-- This is a template that can be customized via admin UI
insert into public.offers (key, kind, title, headline, description, badge, cta_text, price_label, compare_at_label, bullets, payload, parent_offer_key, is_active)
values
  (
    'bump-advanced-module',
    'order_bump',
    'Advanced Module Add-On',
    'Yes! Add the Advanced Module',
    'Get instant access to 10+ advanced lessons and bonus templates',
    'Limited Time',
    'Add to Order',
    '$47',
    '$97',
    '["10 advanced video lessons", "Bonus templates pack", "Private Slack access", "Lifetime updates"]'::jsonb,
    '{"courseSlug": "advanced-module"}'::jsonb,
    null, -- Will be set when linking to specific parent offers
    true
  )
on conflict (key) do update set
  kind = excluded.kind,
  title = excluded.title,
  headline = excluded.headline,
  description = excluded.description,
  badge = excluded.badge,
  price_label = excluded.price_label,
  compare_at_label = excluded.compare_at_label,
  bullets = excluded.bullets,
  payload = excluded.payload,
  is_active = excluded.is_active,
  updated_at = now();

-- =============================================================================
-- ANALYTICS - Add order bump event types to paywall_events
-- =============================================================================

-- The paywall_events table already exists and accepts any event_type text
-- We'll just document the expected event types for order bumps:
-- 'order_bump_viewed' - User saw the bump offer
-- 'order_bump_added' - User checked the bump checkbox
-- 'order_bump_removed' - User unchecked the bump checkbox
-- 'order_bump_purchased' - Order completed with bump included

comment on table public.paywall_events is
  'Tracks paywall and offer interactions including order bumps. Event types: checkout_started, checkout_completed, order_bump_viewed, order_bump_added, order_bump_removed, order_bump_purchased';

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- RLS policies already exist for offers table
-- No additional permissions needed - order_bump follows same pattern as other offer kinds
