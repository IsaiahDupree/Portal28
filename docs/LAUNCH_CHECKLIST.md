# Portal28 Academy — Launch Checklist

## Pre-Launch Setup

### 1. Environment Variables
Ensure all environment variables are set in your hosting platform (Vercel):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://owcutgdfteomvfqhfwce.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Meta Pixel + CAPI
NEXT_PUBLIC_META_PIXEL_ID=your_pixel_id
META_CAPI_ACCESS_TOKEN=your_access_token
META_API_VERSION=v20.0

# Resend Email
RESEND_API_KEY=re_xxx
RESEND_FROM="Portal28 Academy <hello@updates.portal28.academy>"
RESEND_WEBHOOK_SECRET=whsec_xxx

# Site
NEXT_PUBLIC_SITE_URL=https://portal28.io
```

### 2. Database Setup

```bash
# Apply all migrations
npx supabase db push

# Seed community data
npx supabase db execute --file supabase/seed_community.sql

# Set yourself as admin
# Run in Supabase SQL Editor:
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

### 3. Stripe Setup

- [ ] Create Products in Stripe Dashboard:
  - Member Monthly ($29/mo)
  - Member Yearly ($290/yr)
  - VIP Monthly ($99/mo)
  - Course products (one-time)
  - Bundle products

- [ ] Copy Price IDs to:
  - Course records in Supabase
  - Offers in Supabase (update payload)

- [ ] Configure Stripe Webhook:
  - Endpoint: `https://portal28.io/api/stripe/webhook`
  - Events to listen for:
    - `checkout.session.completed`
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.paid`
    - `invoice.payment_failed`
    - `charge.refunded`

- [ ] Test locally:
  ```bash
  stripe listen --forward-to localhost:3000/api/stripe/webhook
  ```

### 4. Meta Pixel Setup

- [ ] Create Pixel in Meta Events Manager
- [ ] Set up Conversions API:
  - Generate access token
  - Verify domain
  - Test events using Events Manager → Test Events

- [ ] Priority events:
  1. `PageView` (automatic via MetaPixel component)
  2. `ViewContent` (course page view)
  3. `Lead` (newsletter subscribe)
  4. `InitiateCheckout` (buy button click)
  5. `Purchase` (Stripe webhook → CAPI)

### 5. Resend Email Setup

- [ ] Verify sending domain:
  - Add SPF record
  - Add DKIM records
  - Recommended subdomain: `updates.portal28.academy`

- [ ] Configure webhook:
  - Endpoint: `https://portal28.io/api/resend/webhook`
  - Events: `email.bounced`, `email.complained`, `email.delivered`

- [ ] Test emails:
  - Lead welcome
  - Course access

### 6. DNS & Domain

- [ ] Point `portal28.io` to Vercel
- [ ] Configure email subdomain for Resend
- [ ] SSL certificate (automatic via Vercel)

---

## Launch Day

### 7. Content Setup

- [ ] Create at least one course:
  - Admin → Courses → New
  - Add modules and lessons
  - Attach Stripe price ID
  - Set status to `published`

- [ ] Seed community:
  - Run seed script
  - Create welcome announcement
  - Add initial resources

- [ ] Test purchase flow:
  - Use Stripe test mode first
  - Complete a test purchase
  - Verify entitlement granted
  - Verify email sent
  - Verify Meta CAPI event

### 8. Final Checks

- [ ] Test login flow (magic link)
- [ ] Test course access after purchase
- [ ] Test lesson player (video, downloads)
- [ ] Test community access
- [ ] Test admin dashboard
- [ ] Mobile responsiveness check
- [ ] Page speed check (< 2s load)

---

## Post-Launch

### 9. Monitoring

- [ ] Set up Stripe Dashboard alerts
- [ ] Monitor Meta Events Manager for event quality
- [ ] Check Resend dashboard for bounces
- [ ] Monitor Supabase usage

### 10. Analytics

- [ ] Verify Facebook Pixel firing correctly
- [ ] Check CAPI event match quality
- [ ] Set up conversion tracking in Ads Manager
- [ ] Monitor:
  - Checkout conversion rate
  - Email open/click rates
  - Lesson completion rates

---

## Quick Commands

```bash
# Development
npm run dev

# Stripe webhook (local)
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Apply migrations
npx supabase db push

# Seed data
npx supabase db execute --file supabase/seed_community.sql

# Build for production
npm run build
```

---

## Support Contacts

- **Supabase**: support@supabase.io
- **Stripe**: support@stripe.com
- **Vercel**: support@vercel.com
- **Resend**: support@resend.com

---

*Last updated: January 2, 2026*
