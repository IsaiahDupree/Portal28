-- Portal28 Academy - Seed Data for Local Development
-- This file runs after migrations when using `supabase db reset`

-- Create a test admin user (password: password123)
-- Note: In local dev, Supabase uses fake auth. Use Studio to create users.

-- Insert a sample course
INSERT INTO public.courses (id, title, slug, description, status, stripe_price_id)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Facebook Ads Mastery',
  'facebook-ads-mastery',
  'Learn how to run profitable Facebook ad campaigns from scratch.',
  'published',
  'price_test_123' -- Replace with real Stripe price ID
) ON CONFLICT (slug) DO NOTHING;

-- Insert modules for the course
INSERT INTO public.modules (id, course_id, title, sort_order)
VALUES
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'Getting Started', 0),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'Campaign Setup', 1),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', 'Creative Strategy', 2),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'Scaling & Optimization', 3)
ON CONFLICT DO NOTHING;

-- Insert lessons for Module 1: Getting Started
INSERT INTO public.lessons (id, module_id, title, sort_order, video_url, content_html)
VALUES
  (
    '33333333-3333-3333-3333-333333333301',
    '22222222-2222-2222-2222-222222222201',
    'Welcome & Course Overview',
    0,
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    '<p>Welcome to Facebook Ads Mastery! In this course, you will learn everything you need to run profitable campaigns.</p>'
  ),
  (
    '33333333-3333-3333-3333-333333333302',
    '22222222-2222-2222-2222-222222222201',
    'Setting Up Your Business Manager',
    1,
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    '<p>Learn how to properly set up your Meta Business Manager and ad accounts.</p>'
  )
ON CONFLICT DO NOTHING;

-- Insert lessons for Module 2: Campaign Setup
INSERT INTO public.lessons (id, module_id, title, sort_order, video_url, content_html)
VALUES
  (
    '33333333-3333-3333-3333-333333333303',
    '22222222-2222-2222-2222-222222222202',
    'Understanding Campaign Objectives',
    0,
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    '<p>Learn which campaign objective to choose for your specific goals.</p>'
  ),
  (
    '33333333-3333-3333-3333-333333333304',
    '22222222-2222-2222-2222-222222222202',
    'Audience Targeting Deep Dive',
    1,
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    '<p>Master the art of targeting the right audience for your offers.</p>'
  ),
  (
    '33333333-3333-3333-3333-333333333305',
    '22222222-2222-2222-2222-222222222202',
    'Budget & Bidding Strategies',
    2,
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    '<p>Learn how to set budgets and bidding strategies that maximize your ROI.</p>'
  )
ON CONFLICT DO NOTHING;

-- Insert lessons for Module 3: Creative Strategy
INSERT INTO public.lessons (id, module_id, title, sort_order, video_url, content_html, downloads)
VALUES
  (
    '33333333-3333-3333-3333-333333333306',
    '22222222-2222-2222-2222-222222222203',
    'Ad Creative Fundamentals',
    0,
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    '<p>The psychology behind high-converting ad creatives.</p>',
    '[{"label": "Creative Swipe File", "url": "https://example.com/swipe-file.pdf"}]'
  ),
  (
    '33333333-3333-3333-3333-333333333307',
    '22222222-2222-2222-2222-222222222203',
    'Copy That Converts',
    1,
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    '<p>Write ad copy that stops the scroll and drives action.</p>',
    '[{"label": "Copy Templates", "url": "https://example.com/copy-templates.pdf"}]'
  )
ON CONFLICT DO NOTHING;

-- Insert lessons for Module 4: Scaling
INSERT INTO public.lessons (id, module_id, title, sort_order, video_url, content_html)
VALUES
  (
    '33333333-3333-3333-3333-333333333308',
    '22222222-2222-2222-2222-222222222204',
    'When to Scale Your Campaigns',
    0,
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    '<p>Know exactly when your campaigns are ready to scale.</p>'
  ),
  (
    '33333333-3333-3333-3333-333333333309',
    '22222222-2222-2222-2222-222222222204',
    'Horizontal vs Vertical Scaling',
    1,
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    '<p>Two powerful scaling strategies and when to use each.</p>'
  )
ON CONFLICT DO NOTHING;

-- Insert a sample email contact
INSERT INTO public.email_contacts (email, first_name, source, is_customer)
VALUES
  ('test@example.com', 'Test', 'site_form', false)
ON CONFLICT DO NOTHING;

-- Note: To test purchases locally:
-- 1. Create a user via Supabase Studio (localhost:54323)
-- 2. Use Stripe CLI to forward webhooks: stripe listen --forward-to localhost:3000/api/stripe/webhook
-- 3. Use Stripe test mode cards to complete purchases
