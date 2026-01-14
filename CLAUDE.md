# Portal28 Academy - Claude Agent Instructions

> **Project:** Portal28 Academy Course Platform
> **Version:** 1.0
> **Created:** January 13, 2026
> **Purpose:** Instructions for autonomous coding agents

---

## Quick Start

### Running the Project

```bash
# Use the startup script (recommended)
./init.sh

# Or manually:
npm run db:start    # Start Supabase
npm run dev         # Start Next.js
```

### Running Tests

```bash
npm run test        # Unit tests
npm run test:e2e    # End-to-end tests
npm run test:coverage  # Coverage report
```

### Access URLs

- **App:** http://localhost:2828
- **Supabase Studio:** http://localhost:28323
- **Email Inbox (Inbucket):** http://localhost:28324

---

## Project Architecture

### Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL + Auth + Realtime)
- **Payments:** Stripe (checkout + webhooks)
- **Email:** Resend
- **Video:** Mux
- **Storage:** Cloudflare R2 (S3-compatible)
- **Tracking:** Meta Pixel + CAPI
- **Styling:** Tailwind CSS + Radix UI + shadcn/ui

### Key Architecture Decisions

1. **Port Configuration:** Uses port `2828` (not 3000) to avoid conflicts
2. **Authentication:** Magic link only (no password auth)
3. **Access Control:** Entitlement-based system (not role-based for courses)
4. **Database:** Supabase with Row Level Security (RLS) policies
5. **Testing:** Jest for unit/integration, Playwright for E2E
6. **Deployment:** Designed for Vercel with cron jobs

---

## Important Files & Their Purpose

### Configuration Files
- `middleware.ts` - Route protection and authentication
- `next.config.js` - Next.js configuration
- `supabase/config.toml` - Local Supabase configuration
- `.env.local` - Environment variables (DO NOT COMMIT)

### Database
- `supabase/migrations/*.sql` - Database migrations (18 total)
- `supabase/seed.sql` - Test data seeding

### Core Business Logic
- `lib/entitlements/hasAccess.ts` - Access control logic
- `lib/stripe.ts` - Stripe client initialization
- `lib/supabase/*.ts` - Database clients (client, server, middleware)
- `lib/meta/` - Meta Pixel and CAPI tracking

### API Routes
- `app/api/stripe/webhook/route.ts` - Stripe event handling (CRITICAL)
- `app/api/stripe/*-checkout/route.ts` - Checkout sessions
- `app/api/admin/**/*` - Admin CRUD operations
- `app/api/attribution/route.ts` - UTM tracking

### Key Components
- `components/layout/` - Layout components (nav, footer, etc.)
- `components/courses/` - Course display components
- `components/admin/` - Admin forms and UI
- `components/community/` - Community feature widgets

---

## Feature List System

### Location
`feature_list.json` - 55 features across 3 phases (MVP, Growth, Platform)

### Feature Structure
```json
{
  "id": "feat-XXX",
  "epic": "Phase X: Name",
  "category": "critical|high|medium|low",
  "priority": 1-55,
  "description": "What this feature does",
  "test_ids": ["TEST-001", "TEST-002"],
  "steps": ["Step 1", "Step 2"],
  "acceptance_criteria": ["Criterion 1", "Criterion 2"],
  "passes": false
}
```

### Test IDs Reference
Test specifications are documented in `docs/TDD_TEST_SUITE.md`

### How to Mark Features Complete
1. Implement the feature following acceptance criteria
2. Ensure all test_ids pass
3. Update `feature_list.json` → `"passes": true`
4. Add `"implemented_at": "2026-01-XX"` timestamp

---

## Testing Requirements

### Unit/Integration Tests (Jest)
- **Location:** `__tests__/`
- **Run:** `npm run test`
- **Coverage:** Minimum 50% (configured in jest.config.js)
- **Focus:** API routes, database queries, utility functions

### E2E Tests (Playwright)
- **Location:** `e2e/`
- **Run:** `npm run test:e2e`
- **Focus:** User flows (auth, purchase, course access, admin operations)

### Test Files Naming
- Unit tests: `__tests__/path/to/file.test.ts`
- E2E tests: `e2e/feature-name.spec.ts`

### When to Write Tests
- ALWAYS write tests for:
  - API route changes
  - Payment/entitlement logic
  - Access control functions
  - Database queries with RLS

---

## Coding Conventions

### TypeScript
- **Strict mode:** Enabled
- **Type everything:** No implicit `any`
- **Use Zod:** For API input validation

### File Naming
- Components: PascalCase (`CourseCard.tsx`)
- Utilities: camelCase (`hasAccess.ts`)
- Routes: kebab-case folders (`course-checkout/route.ts`)

### Import Order
1. React/Next imports
2. Third-party libraries
3. Local utilities
4. Components
5. Types
6. Styles

### React Patterns
- **Server Components:** Default (use `'use client'` only when needed)
- **Data Fetching:** Server-side in page.tsx, not client-side unless necessary
- **Forms:** Use Server Actions when possible

### Database Queries
- **Direct queries:** Use Supabase client in lib/db/
- **RLS:** Always rely on RLS policies, don't bypass with service key unless necessary
- **Transactions:** Use Supabase transactions for multi-step operations

### Error Handling
- API routes: Return proper status codes (400, 401, 403, 404, 500)
- Log errors: Use `console.error()` (production: use error tracking service)
- Never expose sensitive data in error messages

---

## Security Considerations

### Critical Security Rules
1. **NEVER** commit secrets to git
2. **ALWAYS** validate webhook signatures (Stripe, Resend, Mux)
3. **ALWAYS** use RLS policies for data access
4. **NEVER** trust client input - validate with Zod
5. **ALWAYS** hash sensitive data (emails for Meta CAPI)

### Webhook Signature Validation
```typescript
// REQUIRED for all webhooks
const signature = headers().get('stripe-signature');
const event = stripe.webhooks.constructEvent(body, signature, secret);
```

### Environment Variables
- Public vars: `NEXT_PUBLIC_*` (exposed to browser)
- Private vars: No prefix (server-only)
- **Never** log or expose private vars

---

## Common Tasks

### Creating a New API Route
1. Create file in `app/api/[name]/route.ts`
2. Add Zod schema for input validation
3. Add authentication check if needed
4. Use proper HTTP methods (GET, POST, PUT, DELETE)
5. Return proper status codes
6. Write tests in `__tests__/api/`

### Creating a New Database Table
1. Create migration: `npm run db:migration:new table_name`
2. Write SQL in `supabase/migrations/XXXX_table_name.sql`
3. Add RLS policies
4. Apply: `npm run db:reset` (local) or `npm run db:push` (prod)
5. Update TypeScript types

### Adding a New Course Feature
1. Check if requires new database columns
2. Update admin UI (`app/admin/courses/`)
3. Update course display (`app/app/courses/`)
4. Update API routes
5. Write tests
6. Mark feature as passing in `feature_list.json`

### Debugging Authentication Issues
1. Check Supabase is running: http://localhost:28323
2. Check middleware.ts for route protection
3. Check magic links in Inbucket: http://localhost:28324
4. Verify RLS policies in Supabase Studio

### Debugging Stripe Webhooks
1. Start listener: `npm run stripe:listen`
2. Copy webhook secret to `.env.local`
3. Test: `stripe trigger checkout.session.completed`
4. Check logs in terminal

---

## Do's and Don'ts

### DO ✅
- Read the PRD (`docs/PRD.md`) before implementing features
- Follow acceptance criteria from `feature_list.json`
- Write tests for all critical functionality
- Use existing patterns from similar features
- Update documentation when adding major features
- Check RLS policies when adding database queries
- Validate all external inputs with Zod

### DON'T ❌
- Don't bypass RLS with service key unnecessarily
- Don't skip webhook signature validation
- Don't expose private environment variables
- Don't commit `.env.local` or secrets
- Don't use `any` type in TypeScript
- Don't create new patterns - follow existing conventions
- Don't skip tests for payment/auth logic
- Don't hardcode URLs - use `NEXT_PUBLIC_SITE_URL`

---

## Troubleshooting

### Port Conflicts
```bash
npm run port:kill    # Kill process on 2828
npm run dev:force    # Kill and restart
```

### Supabase Issues
```bash
npm run db:stop
npm run db:start
npm run db:reset     # Resets DB, applies migrations, seeds data
```

### Build Errors
```bash
npm run build        # Check for TypeScript/build errors
npm run lint         # Check for linting issues
```

### Test Failures
```bash
npm run test -- --verbose          # Detailed test output
npm run test -- --testNamePattern="test name"  # Run specific test
```

---

## Getting Help

### Documentation
- **PRD:** `docs/PRD.md` - Product requirements
- **Handoff:** `docs/DEVELOPER_HANDOFF.md` - Complete technical docs
- **Tests:** `docs/TDD_TEST_SUITE.md` - Test specifications
- **Assessment:** `docs/PRD_ASSESSMENT.md` - Implementation status

### External Resources
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Stripe: https://stripe.com/docs
- Tailwind: https://tailwindcss.com/docs

---

## Autonomous Agent Guidelines

### Session Flow
1. Read `feature_list.json` to find next unimplemented feature
2. Read acceptance criteria and test IDs
3. Read test specifications in `docs/TDD_TEST_SUITE.md`
4. Implement the feature
5. Write/update tests
6. Verify tests pass
7. Update `feature_list.json` with `"passes": true`
8. Update `claude-progress.txt` with progress

### Priority Order
1. **Phase 0 (MVP):** Features 1-15 - Core functionality
2. **Phase 1 (Growth):** Features 16-24 - Growth features
3. **Phase 2 (Platform):** Features 25-55 - Platform features

### Feature Implementation Checklist
- [ ] Read feature acceptance criteria
- [ ] Understand related test IDs
- [ ] Review similar existing features for patterns
- [ ] Implement backend (API routes, DB queries)
- [ ] Implement frontend (components, pages)
- [ ] Write/update tests
- [ ] Run tests and verify passing
- [ ] Manual testing in browser
- [ ] Update feature_list.json
- [ ] Update claude-progress.txt

---

## Notes

- This project is designed for autonomous development
- Each feature should be completed fully before moving to the next
- Always prioritize testing and security
- Follow existing patterns - consistency is key
- Document any architectural decisions

---

*Last Updated: January 13, 2026*
