-- Portal28 Academy - Community Seed Data
-- Run after migrations to populate default community widgets

-- =============================================================================
-- GET OR CREATE SPACE (Portal28 default space)
-- =============================================================================

insert into public.community_spaces (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Portal28 Community', 'portal28')
on conflict (id) do nothing;

-- =============================================================================
-- SEED WIDGETS
-- =============================================================================

-- Forums widget
insert into public.widgets (id, slug, title, kind, status, config, sort_order)
values (
  'w-forum-001',
  'forums',
  'Forums',
  'forum',
  'active',
  '{"description": "Discuss strategies, ask questions, and connect with the community"}'::jsonb,
  1
) on conflict (id) do nothing;

-- Announcements widget
insert into public.widgets (id, slug, title, kind, status, config, sort_order)
values (
  'w-announce-001',
  'announcements',
  'Announcements',
  'announcements',
  'active',
  '{"description": "Important updates from Sarah and the team"}'::jsonb,
  0
) on conflict (id) do nothing;

-- Resources widget
insert into public.widgets (id, slug, title, kind, status, config, sort_order)
values (
  'w-resources-001',
  'resources',
  'Resources',
  'resources',
  'active',
  '{"description": "Templates, guides, and downloadable assets"}'::jsonb,
  2
) on conflict (id) do nothing;

-- Chat widget
insert into public.widgets (id, slug, title, kind, status, config, sort_order)
values (
  'w-chat-001',
  'chat',
  'Chat',
  'chat',
  'active',
  '{"description": "Real-time chat with community members"}'::jsonb,
  3
) on conflict (id) do nothing;

-- =============================================================================
-- SEED FORUM CATEGORIES
-- =============================================================================

insert into public.forum_categories (id, space_id, name, slug, description, sort_order)
values
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'General Discussion', 'general', 'Open conversation about anything', 0),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Facebook Ads', 'fb-ads', 'Questions and strategies for Facebook advertising', 1),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Wins & Results', 'wins', 'Share your wins and celebrate with the community', 2),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Tech & Tools', 'tech-tools', 'Discussion about marketing tools and technology', 3),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Introductions', 'intros', 'Introduce yourself to the community', 4)
on conflict do nothing;

-- =============================================================================
-- SEED RESOURCE FOLDERS
-- =============================================================================

insert into public.resource_folders (id, space_id, name, description, sort_order)
values
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Templates', 'Ready-to-use templates for your campaigns', 0),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Guides', 'Step-by-step guides and tutorials', 1),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Scripts', 'Copy and scripts for ads and content', 2),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Swipe Files', 'Examples and inspiration', 3)
on conflict do nothing;

-- =============================================================================
-- SEED CHAT CHANNELS
-- =============================================================================

insert into public.chat_channels (id, space_id, name, slug, description, sort_order)
values
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'general', 'general', 'General chat for the community', 0),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'wins', 'wins', 'Share your wins in real-time', 1),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'help', 'help', 'Get quick help from the community', 2)
on conflict do nothing;

-- =============================================================================
-- SEED SAMPLE ANNOUNCEMENT
-- =============================================================================

insert into public.announcements (id, space_id, title, body, is_pinned, is_published, tags)
values (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'Welcome to Portal28 Community!',
  'Hey everyone! 👋

Welcome to the Portal28 community. This is your space to connect, learn, and grow together.

Here''s how to get started:
1. **Introduce yourself** in the Introductions forum
2. **Check out the Resources** for templates and guides
3. **Join the chat** to connect in real-time
4. **Ask questions** - we''re here to help!

Looking forward to seeing you thrive 🚀

— Sarah',
  true,
  true,
  '["welcome", "getting-started"]'::jsonb
) on conflict do nothing;

-- =============================================================================
-- SEED BUNDLE OFFER
-- =============================================================================

insert into public.offers (key, kind, title, subtitle, badge, cta_text, price_label, compare_at_label, bullets, payload)
values (
  'ultimate-bundle',
  'bundle',
  'Ultimate Facebook Ads Bundle',
  'Everything you need to master Facebook advertising',
  'Best Value',
  'Get the Bundle',
  '$497',
  '$697',
  '[
    "Complete FB Ads Mastery Course",
    "Advanced Targeting Strategies",
    "Creative Templates Pack",
    "Private Community Access (1 year)",
    "Monthly Q&A Calls",
    "Lifetime course updates"
  ]'::jsonb,
  '{
    "courseIds": [],
    "tier": "member",
    "interval": "yearly",
    "trialDays": 0
  }'::jsonb
) on conflict (key) do nothing;

-- Add bundle to pricing page placement
insert into public.offer_placements (placement_key, offer_key, sort_order)
values ('pricing-page', 'ultimate-bundle', 3)
on conflict (placement_key, offer_key) do nothing;

-- =============================================================================
-- SEED ORDER BUMPS
-- =============================================================================

insert into public.order_bumps (trigger_offer_key, bump_offer_key, headline, description, discount_percent)
values
  ('member-monthly', 'vip-monthly', 'Upgrade to VIP', 'Add 1:1 coaching calls and priority support for just $70 more/month', 30),
  ('member-yearly', 'vip-monthly', 'Add VIP Coaching', 'Get personal coaching calls at 30% off', 30)
on conflict (trigger_offer_key, bump_offer_key) do nothing;

-- =============================================================================
-- SEED UPSELLS
-- =============================================================================

insert into public.upsells (trigger_offer_key, upsell_offer_key, headline, description, discount_percent, expires_minutes)
values
  ('member-monthly', 'ultimate-bundle', 'Wait! One-time offer', 'Upgrade to the Ultimate Bundle and save $200 - this offer expires in 30 minutes!', 30, 30)
on conflict (trigger_offer_key, upsell_offer_key) do nothing;
