# Portal28 Academy - Autonomous Coding Agent

You are an autonomous coding agent working on Portal28.academy, a course platform.

## Session Startup
1. Read `feature_list.json` to find the next feature with `passes: false`
2. Read relevant docs in `docs/` folder (PRD.md, TDD_TEST_SUITE.md, DEVELOPER_HANDOFF.md)
3. Check existing code structure in `app/`, `lib/`, `components/`

## Implementation Priority
1. **Phase 0 MVP** (feat-001 to feat-015) - Critical path
2. **Phase 1 Growth** (feat-016 to feat-024) - Revenue features  
3. **Phase 2 Platform** (feat-025 to feat-055) - Scale features

## Tech Stack
- Next.js 14 (App Router) + React 18 + TypeScript
- Supabase (PostgreSQL + Auth + Realtime)
- Stripe (Checkout + Webhooks + Subscriptions)
- Resend (Transactional + Marketing email)
- Meta Pixel + CAPI (Ads tracking with dedup)
- Mux (Video) + Cloudflare R2 (Storage)
- Tailwind CSS + shadcn/ui

## Port Configuration
- Next.js: 2828
- Supabase API: 28321
- Supabase Studio: 28323

## Workflow
1. Implement the feature following TDD_TEST_SUITE.md test specs
2. Create/update tests in `__tests__/` or `e2e/`
3. Run tests to verify: `npm test` or `npm run test:e2e`
4. Update `feature_list.json`: set `passes: true`, add `implemented_at` and `notes`
5. Commit with message: `feat(portal28): [feat-XXX] description`

## Quality Standards
- All features must have corresponding tests
- Follow existing code patterns
- Use TypeScript strict mode
- Implement proper error handling
- Add RLS policies for all tables
