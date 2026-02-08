-- Portal28 Academy - Onboarding Email Automation
-- Feature: feat-079 - Onboarding Email Sequence

-- Create the onboarding automation
INSERT INTO public.email_automations (
  id,
  name,
  description,
  status,
  trigger_event,
  trigger_filter_json,
  prompt_base,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'Customer Onboarding Sequence',
  'Automated email sequence sent to new customers after purchase',
  'active',
  'purchase_completed',
  '{}',
  'You are Sarah from Portal28 Academy. Keep emails warm, friendly, and encouraging. Focus on helping students get started and stay engaged with their purchase.',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Step 1: Welcome email (immediate - 0 minutes delay)
INSERT INTO public.automation_steps (
  id,
  automation_id,
  step_order,
  delay_value,
  delay_unit,
  subject,
  preview_text,
  html_content,
  plain_text,
  prompt_instruction,
  status,
  created_at,
  updated_at
) VALUES (
  'b0000000-0000-0000-0000-000000000001'::uuid,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  0,
  0,
  'minutes',
  'Welcome to Portal28 Academy! 🎉',
  'Your journey starts now - here''s how to get started',
  '<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #2563eb; }
    .button { background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h1>Welcome to Portal28 Academy! 🎉</h1>

  <p>Hey there!</p>

  <p>I''m so excited to have you here! Your purchase just went through, and you now have full access to everything you signed up for.</p>

  <h2>🚀 Ready to get started?</h2>

  <p>Here''s what to do next:</p>

  <ol>
    <li><strong>Log in to your account</strong> - All your courses and content are waiting for you</li>
    <li><strong>Start with the first lesson</strong> - Don''t overthink it, just dive in!</li>
    <li><strong>Join the community</strong> - Connect with other students inside the platform</li>
  </ol>

  <a href="https://portal28.com/app" class="button">Access Your Content →</a>

  <p>I''ll be checking in with you in a few days to see how you''re doing. If you have any questions before then, just hit reply to this email.</p>

  <p>Let''s do this!</p>

  <p>Sarah<br>
  Portal28 Academy</p>

  <div class="footer">
    <p>Portal28 Academy | Building better creators</p>
  </div>
</body>
</html>',
  'Welcome to Portal28 Academy!

Hey there!

I''m so excited to have you here! Your purchase just went through, and you now have full access to everything you signed up for.

Ready to get started?

Here''s what to do next:

1. Log in to your account - All your courses and content are waiting for you
2. Start with the first lesson - Don''t overthink it, just dive in!
3. Join the community - Connect with other students inside the platform

Visit: https://portal28.com/app

I''ll be checking in with you in a few days to see how you''re doing. If you have any questions before then, just hit reply to this email.

Let''s do this!

Sarah
Portal28 Academy',
  'Welcome email with immediate access instructions and getting started guidance',
  'active',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Step 2: Progress check-in (3 days after purchase)
INSERT INTO public.automation_steps (
  id,
  automation_id,
  step_order,
  delay_value,
  delay_unit,
  subject,
  preview_text,
  html_content,
  plain_text,
  prompt_instruction,
  status,
  created_at,
  updated_at
) VALUES (
  'b0000000-0000-0000-0000-000000000002'::uuid,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  1,
  3,
  'days',
  'How''s it going? Quick check-in 👋',
  'Just wanted to see how your first few days have been',
  '<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #2563eb; }
    .button { background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
    .tip-box { background: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h1>Quick check-in! 👋</h1>

  <p>Hey!</p>

  <p>It''s been a few days since you joined, and I wanted to check in - how''s everything going?</p>

  <p>Here are a few things that might help if you''re just getting started:</p>

  <div class="tip-box">
    <strong>💡 Pro tip:</strong> Most students see the best results when they dedicate 20-30 minutes each day to working through the content. Consistency beats intensity!
  </div>

  <h2>Need help?</h2>

  <p>If you''re stuck on anything or have questions, here''s how to get support:</p>

  <ul>
    <li>Reply to this email and I''ll personally get back to you</li>
    <li>Post in the community - other students love to help!</li>
    <li>Check the FAQ section in your dashboard</li>
  </ul>

  <a href="https://portal28.com/app" class="button">Continue Learning →</a>

  <p>Keep going - you''ve got this!</p>

  <p>Sarah<br>
  Portal28 Academy</p>

  <div class="footer">
    <p>Portal28 Academy | Building better creators</p>
  </div>
</body>
</html>',
  'Quick check-in!

Hey!

It''s been a few days since you joined, and I wanted to check in - how''s everything going?

Here are a few things that might help if you''re just getting started:

Pro tip: Most students see the best results when they dedicate 20-30 minutes each day to working through the content. Consistency beats intensity!

Need help?

If you''re stuck on anything or have questions, here''s how to get support:
- Reply to this email and I''ll personally get back to you
- Post in the community - other students love to help!
- Check the FAQ section in your dashboard

Visit: https://portal28.com/app

Keep going - you''ve got this!

Sarah
Portal28 Academy',
  'Progress check-in email with encouragement and tips for success',
  'active',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Step 3: Completion nudge (7 days after purchase)
INSERT INTO public.automation_steps (
  id,
  automation_id,
  step_order,
  delay_value,
  delay_unit,
  subject,
  preview_text,
  html_content,
  plain_text,
  prompt_instruction,
  status,
  created_at,
  updated_at
) VALUES (
  'b0000000-0000-0000-0000-000000000003'::uuid,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  2,
  7,
  'days',
  'You''re one week in - let''s keep the momentum! 🚀',
  'Small consistent steps lead to big results',
  '<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #2563eb; }
    .button { background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
    .stats-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h1>You''re one week in! 🎉</h1>

  <p>Hey!</p>

  <p>Can you believe it''s been a week already? Time flies when you''re learning new things!</p>

  <div class="stats-box">
    <p><strong>📊 Did you know?</strong></p>
    <p>Students who complete at least one lesson per week are 5x more likely to finish the entire course. You''re already on the right track!</p>
  </div>

  <h2>What''s next?</h2>

  <p>Here''s my challenge for you this week:</p>

  <ol>
    <li><strong>Set a specific time</strong> - Block out 30 minutes on your calendar</li>
    <li><strong>Turn off distractions</strong> - Close other tabs, put your phone away</li>
    <li><strong>Complete one full module</strong> - Start to finish, no jumping around</li>
  </ol>

  <p>Small consistent steps lead to big results. You''ve got this!</p>

  <a href="https://portal28.com/app" class="button">Pick Up Where You Left Off →</a>

  <p>Rooting for you!</p>

  <p>Sarah<br>
  Portal28 Academy</p>

  <div class="footer">
    <p>Portal28 Academy | Building better creators</p>
  </div>
</body>
</html>',
  'You''re one week in!

Hey!

Can you believe it''s been a week already? Time flies when you''re learning new things!

Did you know?
Students who complete at least one lesson per week are 5x more likely to finish the entire course. You''re already on the right track!

What''s next?

Here''s my challenge for you this week:

1. Set a specific time - Block out 30 minutes on your calendar
2. Turn off distractions - Close other tabs, put your phone away
3. Complete one full module - Start to finish, no jumping around

Small consistent steps lead to big results. You''ve got this!

Visit: https://portal28.com/app

Rooting for you!

Sarah
Portal28 Academy',
  'One week completion nudge with actionable challenge and encouragement',
  'active',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Step 4: Final completion nudge (14 days after purchase)
INSERT INTO public.automation_steps (
  id,
  automation_id,
  step_order,
  delay_value,
  delay_unit,
  subject,
  preview_text,
  html_content,
  plain_text,
  prompt_instruction,
  status,
  created_at,
  updated_at
) VALUES (
  'b0000000-0000-0000-0000-000000000004'::uuid,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  3,
  14,
  'days',
  'Two weeks in - finish what you started! 💪',
  'The finish line is closer than you think',
  '<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #2563eb; }
    .button { background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
    .quote-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; font-style: italic; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h1>Two weeks in! 💪</h1>

  <p>Hey!</p>

  <p>It''s been two weeks since you joined Portal28 Academy, and I wanted to reach out one more time.</p>

  <p>Here''s the truth: starting is easy, but <strong>finishing is what separates the doers from the dreamers</strong>.</p>

  <div class="quote-box">
    "The difference between who you are and who you want to be is what you do."
  </div>

  <h2>Let''s finish strong</h2>

  <p>Whether you''re halfway through or just getting started, now is the perfect time to recommit:</p>

  <ul>
    <li>📅 <strong>Schedule it</strong> - Put it on your calendar like a meeting you can''t miss</li>
    <li>🎯 <strong>Set a deadline</strong> - When will you finish? Pick a date and stick to it</li>
    <li>💬 <strong>Tell someone</strong> - Accountability makes all the difference</li>
  </ul>

  <p>The content you purchased is valuable, but only if you use it. Don''t let this be another thing you started but never finished.</p>

  <a href="https://portal28.com/app" class="button">Finish What You Started →</a>

  <p>I believe in you. Now go prove me right.</p>

  <p>Sarah<br>
  Portal28 Academy</p>

  <div class="footer">
    <p>Portal28 Academy | Building better creators</p>
    <p><small>This is the last automated email in this sequence. If you need help, just reply!</small></p>
  </div>
</body>
</html>',
  'Two weeks in!

Hey!

It''s been two weeks since you joined Portal28 Academy, and I wanted to reach out one more time.

Here''s the truth: starting is easy, but finishing is what separates the doers from the dreamers.

"The difference between who you are and who you want to be is what you do."

Let''s finish strong

Whether you''re halfway through or just getting started, now is the perfect time to recommit:

- Schedule it - Put it on your calendar like a meeting you can''t miss
- Set a deadline - When will you finish? Pick a date and stick to it
- Tell someone - Accountability makes all the difference

The content you purchased is valuable, but only if you use it. Don''t let this be another thing you started but never finished.

Visit: https://portal28.com/app

I believe in you. Now go prove me right.

Sarah
Portal28 Academy

This is the last automated email in this sequence. If you need help, just reply!',
  'Final completion nudge with strong call to action and accountability focus',
  'active',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;
