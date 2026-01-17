# Portal28 Academy - Deployment Guide

Complete guide for deploying Portal28 Academy to production.

## Prerequisites

Before deploying, ensure you have:

1. **Vercel Account** - [Sign up](https://vercel.com/signup)
2. **Supabase Project** - [Create project](https://supabase.com/dashboard)
3. **Stripe Account** - [Sign up](https://dashboard.stripe.com/register)
4. **Resend Account** - [Sign up](https://resend.com/signup)
5. **Meta/Facebook Business Account** (optional) - For Meta Pixel and CAPI
6. **Mux Account** (optional) - For video hosting
7. **Cloudflare R2** (optional) - For file storage

## Step 1: Set Up Supabase

### 1.1 Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization and set project name
4. Generate strong database password
5. Select region closest to your users
6. Wait for project to be provisioned

### 1.2 Run Migrations

```bash
# Link your local project to Supabase
supabase link --project-ref your-project-ref

# Push migrations to production
supabase db push
```

Alternatively, you can run migrations manually in the Supabase SQL Editor:
1. Go to SQL Editor in Supabase Dashboard
2. Copy contents of each migration file from `supabase/migrations/`
3. Run in order (0001, 0002, etc.)

### 1.3 Get Supabase Credentials

From your Supabase project settings:
1. Go to Settings → API
2. Copy `Project URL` (NEXT_PUBLIC_SUPABASE_URL)
3. Copy `anon public` key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
4. Copy `service_role` key (SUPABASE_SERVICE_ROLE_KEY) - **Keep this secret!**

### 1.4 Configure Auth Settings

1. Go to Authentication → Providers
2. Enable Email provider
3. Disable "Confirm email" if you want instant access
4. Set Site URL to your production domain (e.g., https://portal28.academy)
5. Add redirect URLs:
   - `https://yourdomain.com/login`
   - `https://yourdomain.com/app`

## Step 2: Set Up Stripe

### 2.1 Get API Keys

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Switch to **Test Mode** for testing
3. Go to Developers → API keys
4. Copy `Secret key` (STRIPE_SECRET_KEY)

### 2.2 Create Products and Prices

1. Go to Products → Add Product
2. Create a product for each course
3. Set one-time payment price
4. Copy the `price_id` (starts with `price_`)
5. Store price_id in your courses table

### 2.3 Set Up Webhook

**For Production:**
1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy webhook signing secret (STRIPE_WEBHOOK_SECRET)

**For Local Testing:**
```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Forward webhooks to local server
stripe listen --forward-to localhost:2828/api/stripe/webhook

# Copy webhook secret from output
```

## Step 3: Set Up Resend

### 3.1 Create Resend Account

1. Sign up at [resend.com](https://resend.com/signup)
2. Verify your email
3. Go to API Keys
4. Create new API key (RESEND_API_KEY)

### 3.2 Add Domain (Production)

1. Go to Domains → Add Domain
2. Enter your domain (e.g., `updates.portal28.academy`)
3. Add DNS records (CNAME, MX, TXT)
4. Wait for verification

### 3.3 Set From Address

Use format: `Portal28 Academy <hello@updates.yourdomain.com>`

## Step 4: Configure Meta Pixel (Optional)

### 4.1 Create Meta Pixel

1. Go to [Meta Events Manager](https://business.facebook.com/events_manager)
2. Click "Connect Data Sources" → "Web"
3. Select "Meta Pixel" → "Connect"
4. Copy Pixel ID (NEXT_PUBLIC_META_PIXEL_ID)

### 4.2 Set Up Conversions API

1. In Events Manager, go to your Pixel
2. Settings → Conversions API
3. Generate Access Token (META_CAPI_ACCESS_TOKEN)
4. Copy the token - **Keep this secret!**

## Step 5: Deploy to Vercel

### 5.1 Connect Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Select the repository
4. Click "Import"

### 5.2 Configure Environment Variables

Add these environment variables in Vercel:

```bash
# Site URL
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend
RESEND_API_KEY=re_...
RESEND_FROM=Portal28 Academy <hello@updates.yourdomain.com>
RESEND_WEBHOOK_SECRET=your-resend-webhook-secret

# Meta (Facebook)
NEXT_PUBLIC_META_PIXEL_ID=123456789
META_CAPI_ACCESS_TOKEN=your-capi-token
META_API_VERSION=v20.0

# Cron Secret (generate random string)
CRON_SECRET=your-random-cron-secret

# Mux (Optional)
MUX_TOKEN_ID=your-token-id
MUX_TOKEN_SECRET=your-token-secret
MUX_WEBHOOK_SECRET=your-webhook-secret
MUX_SIGNING_KEY_ID=your-signing-key-id
MUX_SIGNING_PRIVATE_KEY=your-private-key

# Cloudflare R2 (Optional)
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=portal28-files
S3_ENDPOINT=https://account-id.r2.cloudflarestorage.com
S3_REGION=auto
```

### 5.3 Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Vercel will provide a production URL

### 5.4 Add Custom Domain

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Wait for DNS propagation

## Step 6: Configure Cron Jobs

Vercel automatically configures cron jobs from `vercel.json`:

1. Email automation scheduler: Runs every hour
2. Certificate emails: Runs daily at 9 AM

Monitor cron job executions in Vercel Dashboard → Logs.

## Step 7: Seed Initial Data

### 7.1 Create Admin User

1. Sign up through your production site
2. Go to Supabase Dashboard → SQL Editor
3. Run:
```sql
UPDATE users
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

### 7.2 Create First Course

1. Log in as admin
2. Go to `/admin`
3. Create a course
4. Add modules and lessons
5. Publish the course

## Step 8: Test Production

### 8.1 Test Checkout Flow

1. Browse to a course page
2. Click "Enroll" or purchase button
3. Complete Stripe checkout (use test card)
4. Verify you receive access email
5. Verify course appears in dashboard

### 8.2 Test Magic Link Auth

1. Log out
2. Go to `/login`
3. Enter your email
4. Check email for magic link
5. Click link and verify login

### 8.3 Verify Webhooks

1. Complete a test purchase
2. Check Vercel logs for webhook processing
3. Check Stripe Dashboard → Webhooks for success/failure

## Step 9: Go Live

### 9.1 Switch Stripe to Live Mode

1. Go to Stripe Dashboard
2. Toggle from Test Mode to Live Mode
3. Update STRIPE_SECRET_KEY in Vercel with live key
4. Update webhook endpoint with live webhook secret
5. Redeploy

### 9.2 Update Course Prices

1. Update courses table with live Stripe price IDs
2. Verify prices display correctly on site

### 9.3 Monitor

- Vercel Analytics for traffic
- Vercel Logs for errors
- Stripe Dashboard for payments
- Supabase Dashboard for database

## Troubleshooting

### Build Errors

**"Module not found"**
- Ensure all dependencies are in `package.json`
- Run `npm install` locally
- Commit `package-lock.json`

**"Environment variable not defined"**
- Check all required env vars are set in Vercel
- Redeploy after adding env vars

### Runtime Errors

**"Webhook signature verification failed"**
- Ensure STRIPE_WEBHOOK_SECRET is correct
- Check webhook endpoint URL in Stripe Dashboard
- Verify webhook is sending to correct endpoint

**"Supabase connection failed"**
- Verify NEXT_PUBLIC_SUPABASE_URL is correct
- Check Supabase project is running
- Verify API keys are correct

**"Email not sending"**
- Check RESEND_API_KEY is valid
- Verify domain is verified in Resend
- Check Resend logs for errors

### Performance Issues

**"Pages loading slowly"**
- Enable Vercel Edge Caching
- Check database query performance in Supabase
- Review Vercel Analytics for bottlenecks

## Maintenance

### Database Backups

Supabase automatically backs up your database. To create manual backup:

1. Go to Supabase Dashboard → Database → Backups
2. Click "Create Backup"

### Monitoring

- Set up Vercel notifications for deployment failures
- Monitor Stripe webhook delivery
- Check Supabase logs regularly
- Review error tracking (Sentry recommended)

### Updates

```bash
# Pull latest changes
git pull origin main

# Test locally
npm run dev
npm run test
npm run test:e2e

# Deploy
git push origin main  # Auto-deploys on Vercel
```

## Security Checklist

- [ ] All secret keys stored in Vercel environment variables
- [ ] SUPABASE_SERVICE_ROLE_KEY never exposed to client
- [ ] Row Level Security (RLS) enabled on all tables
- [ ] Webhook signature verification enabled
- [ ] HTTPS enforced (Vercel does this automatically)
- [ ] CORS configured correctly
- [ ] Rate limiting enabled on sensitive endpoints
- [ ] Admin routes protected with authentication

## Support

- **Vercel:** [vercel.com/support](https://vercel.com/support)
- **Supabase:** [supabase.com/support](https://supabase.com/support)
- **Stripe:** [support.stripe.com](https://support.stripe.com)
- **Resend:** [resend.com/docs](https://resend.com/docs)

---

**Production Checklist:**

- [ ] Supabase project created and migrations applied
- [ ] Stripe products and prices created
- [ ] Stripe webhook configured
- [ ] Resend domain verified
- [ ] Meta Pixel installed (if using)
- [ ] Environment variables set in Vercel
- [ ] Custom domain configured
- [ ] Admin user created
- [ ] Test purchase completed successfully
- [ ] Magic link auth tested
- [ ] Webhooks verified
- [ ] Monitoring set up

Once all items are checked, you're ready to launch! 🚀
