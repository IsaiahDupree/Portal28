# Portal28 Academy (MVP)

Courses by Sarah Ashley — built for results.

## What you get

- Next.js App Router
- Supabase magic-link auth
- Courses → Modules → Lessons
- Stripe Checkout + webhook entitlements
- Meta Pixel + CAPI Purchase (dedup via event_id)
- Resend email (welcome + course access emails)

## Prerequisites

- Node.js 18+
- Docker Desktop (for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)
- [Stripe CLI](https://stripe.com/docs/stripe-cli) (for webhook testing)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Copy env file:**
   ```bash
   cp .env.example .env.local
   ```
   The `.env.example` already has local Supabase values pre-filled.

3. **Start local Supabase:**
   ```bash
   npm run db:start
   ```
   This starts Postgres, Auth, Storage, and Studio locally via Docker.

4. **Run migrations and seed data:**
   ```bash
   npm run db:reset
   ```
   This runs all migrations in `supabase/migrations/` and seeds test data.

5. **Start the dev server:**
   ```bash
   npm run dev
   ```

6. **Open the app:** http://localhost:2828

## Local Supabase

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (checks port first) |
| `npm run dev:force` | Kill port 2828 and start dev server |
| `npm run port:check` | Check if port 2828 is available |
| `npm run port:kill` | Kill process on port 2828 |
| `npm run port:status` | Full port status report |
| `npm run db:start` | Start local Supabase (Docker required) |
| `npm run db:stop` | Stop local Supabase |
| `npm run db:reset` | Reset database, run migrations, seed data |
| `npm run db:studio` | Open Supabase Studio (http://localhost:54323) |
| `npm run db:migration:new` | Create a new migration |
| `npm run db:diff` | Generate migration from schema changes |
| `npm run db:push` | Push migrations to remote Supabase |

### Local URLs

| Service | URL |
|---------|-----|
| **App** | http://localhost:2828 |
| **Supabase API** | http://127.0.0.1:54321 |
| **Supabase Studio** | http://localhost:54323 |
| **Inbucket (Email)** | http://localhost:54324 |

### Creating Test Users

1. Open Studio: `npm run db:studio`
2. Go to Authentication → Users
3. Create a new user with email/password
4. Magic links appear in Inbucket (http://localhost:54324)

## Stripe Webhook (Local Development)

1. Start webhook forwarding:
   ```bash
   npm run stripe:listen
   ```

2. Copy the printed webhook signing secret into `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

3. Create a Stripe Product + Price in test mode, copy the `price_id` to a course record

## Admin Access

Manually set your user as admin in Supabase SQL:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@domain.com';
```

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (Stripe, attribution)
│   ├── app/               # Student dashboard (protected)
│   ├── admin/             # Admin CMS (protected)
│   ├── courses/           # Public course pages
│   └── login/             # Auth pages
├── lib/                   # Shared utilities
│   ├── supabase/          # Supabase clients
│   ├── meta/              # Meta Pixel + CAPI
│   ├── db/                # Database queries
│   └── entitlements/      # Access control
├── supabase/
│   └── migrations/        # SQL migrations
└── docs/
    └── PRD.md             # Product requirements
```

## Key Features

- **Facebook Ads Ready**: Meta Pixel + Conversions API with proper dedup
- **Stripe Integration**: One-time purchases with webhook-based fulfillment
- **Access Control**: Entitlement-based course access
- **Attribution Tracking**: UTM + fbclid capture and persistence
- **Performance Optimized**: Next.js caching with ISR, query caching, cache invalidation
- **SEO Ready**: Dynamic sitemap, robots.txt, structured data (JSON-LD)
- **Mobile Responsive**: Touch-friendly UI, tested on multiple devices
- **CI/CD**: GitHub Actions pipeline with automated testing and deployment

## Testing

```bash
# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Run specific test file
npm run test -- __tests__/path/to/test.test.ts

# Run with coverage
npm run test -- --coverage
```

**Test Coverage:**
- 50+ unit and integration tests
- 40+ E2E tests with Playwright
- Mobile responsiveness tests
- Database migration tests
- SEO and performance tests

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

**Quick Deploy to Vercel:**

1. Connect repository to Vercel
2. Set environment variables (see `.env.example`)
3. Deploy

The project includes:
- `vercel.json` configuration
- GitHub Actions CI/CD pipeline
- Automated testing on pull requests
- Cron jobs for email automation and certificates

## Feature Status

51/55 features implemented (93% complete). See `feature_list.json` for details.

**Completed:**
- Phase 0 (MVP): 15/15 ✅
- Phase 1 (Growth): 9/9 ✅
- Phase 2 (Platform): 27/31 ✅

**Recent Additions:**
- Performance caching with Next.js unstable_cache
- SEO optimization (sitemap, robots.txt, structured data)
- Mobile responsiveness testing
- CI/CD pipeline with GitHub Actions
- Database migration verification
