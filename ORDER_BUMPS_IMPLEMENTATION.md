# Order Bumps Implementation (feat-056)

**Status:** Implementation Complete (Awaiting Database Migration)
**Date:** February 3, 2026
**Feature ID:** feat-056

## Overview

Order Bumps allow customers to add complementary products to their purchase at checkout with a single click. This implementation adds full order bump functionality to Portal28.

## Implementation Summary

### 1. Database Migration ✅

**File:** `supabase/migrations/20260203000000_order_bumps.sql`

Changes:
- Updated `offers.kind` constraint to include `'order_bump'`
- Added `parent_offer_key` column to link bumps to main offers
- Added `headline` and `description` columns for bump-specific copy
- Created index on `parent_offer_key` for faster lookups
- Inserted sample order bump offer

**Status:** Migration file created but NOT YET APPLIED due to Supabase storage issue.

### 2. API Routes ✅

**New Route:** `/app/api/offers/order-bumps/route.ts`
- GET endpoint to fetch order bump offers for a specific course or offer
- Filters by `kind='order_bump'` and `is_active=true`
- Supports query params: `courseId` (UUID) or `offerKey` (string)

**Updated Route:** `/app/api/stripe/checkout/route.ts`
- Added `bumpKeys` parameter to accept selected order bumps
- Fetches bump offers from database
- Adds bump products as Stripe line items
- Stores bump keys in Stripe session metadata

### 3. Checkout Page ✅

**New Files:**
- `/app/(public)/checkout/[courseId]/page.tsx` - Server component that fetches course and bumps
- `/app/(public)/checkout/[courseId]/CheckoutForm.tsx` - Client component with OrderBump integration

Features:
- Displays main course product
- Shows order bump offers below main product
- Uses existing `OrderBump` component from `/components/offers/OrderBump.tsx`
- Order summary sidebar with real-time total updates
- Tracks analytics events (ViewContent, AddToCart, InitiateCheckout)

### 4. Buy Button Updates ✅

**Updated:** `/app/(public)/courses/[slug]/BuyButton.tsx`
- Added `useCheckoutPage` prop (default: `true`)
- Redirects to `/checkout/{courseId}` instead of directly to Stripe
- Maintains backward compatibility with `useCheckoutPage={false}` for legacy flow

### 5. Admin UI ✅

**Updated:** `/components/admin/OfferForm.tsx`
- Added `order_bump` option to the "Kind" dropdown
- Existing admin flows already support creating/editing order bumps

**Existing Pages:**
- `/app/admin/offers` - List all offers including bumps
- `/app/admin/offers/new` - Create new order bump offer
- `/app/admin/offers/[key]` - Edit existing bump offer

## How to Complete the Implementation

### Step 1: Fix Supabase and Apply Migration

The local Supabase instance is currently failing to start due to a storage migration error:

```
Error: Migration buckets-objects-grants-postgres not found
```

**Resolution Options:**

**Option A: Update Supabase CLI (Recommended)**
```bash
brew upgrade supabase/tap/supabase
supabase stop
supabase start
npm run db:reset
```

**Option B: Manual Database Update**
```bash
# Connect to the database directly
psql postgresql://postgres:postgres@127.0.0.1:28322/postgres

# Run migration SQL manually
\i supabase/migrations/20260203000000_order_bumps.sql
```

**Option C: Fresh Start**
```bash
docker system prune -a --volumes  # WARNING: Removes ALL Docker data
supabase start
npm run db:reset
```

### Step 2: Create Sample Order Bump Offer

Once Supabase is running, create a test order bump via the admin UI:

1. Go to `http://localhost:2828/admin/offers/new`
2. Fill in:
   - **Key:** `bump-advanced-templates`
   - **Kind:** Order Bump
   - **Title:** Advanced Templates Pack
   - **Headline:** Yes! Add the Advanced Templates
   - **Description:** Get 50+ premium templates instantly
   - **Price Label:** `$47`
   - **Compare At Label:** `$97`
   - **Bullets:** `["50+ premium templates", "Lifetime updates", "Commercial license"]`
   - **Payload:** `{"stripe_price_id": "price_XXXXXX", "courseSlug": "advanced-pack"}`
3. Save

### Step 3: Configure Stripe Price IDs

Order bumps need Stripe Price IDs in their payload:

```json
{
  "stripe_price_id": "price_1234567890",
  "courseSlug": "your-course-slug"
}
```

Create these in your Stripe Dashboard or via CLI:
```bash
stripe prices create \
  --product prod_XXXXX \
  --unit-amount 4700 \
  --currency usd \
  --nickname "Advanced Templates Pack"
```

### Step 4: Run E2E Tests

```bash
npx playwright test order-bumps.spec.ts
```

Expected results:
- Database schema tests should pass
- Component rendering tests should pass
- Checkout integration tests should pass
- Order creation tests should pass

### Step 5: Update feature_list.json

Once tests pass, update `/feature_list.json`:

```json
{
  "id": "feat-056",
  "passes": true,
  "implemented_at": "2026-02-03"
}
```

## Architecture Decisions

### Why a Custom Checkout Page?

Portal28 previously used Stripe's hosted checkout exclusively. Order bumps require showing offers BEFORE the Stripe checkout, so we needed an intermediate page.

**Trade-offs:**
- ✅ Enables order bumps, upsells, and future checkout customizations
- ✅ Better tracking of user behavior before Stripe redirect
- ❌ Adds one more step in the checkout flow
- ❌ Additional page to maintain

### Why Store Bump Keys in Stripe Metadata?

The `checkout.session.completed` webhook needs to know which bumps were purchased to grant entitlements.

**Alternative Considered:** Querying Stripe line items
**Why Not:** Line items don't preserve the semantic difference between "main product" and "bump product"

### Why Use `offers` Table for Bumps?

Bumps are a special type of offer. Reusing the existing `offers` infrastructure:
- ✅ Leverages existing admin UI
- ✅ Consistent with product/bundle/membership patterns
- ✅ Easy to query and filter
- ❌ Schema is slightly overloaded (some fields not relevant to bumps)

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] Admin can create order bump offers
- [ ] Checkout page displays bumps correctly
- [ ] Selecting bump updates order summary
- [ ] Stripe checkout includes bump as line item
- [ ] Order confirmation grants entitlements for main product + bumps
- [ ] Analytics events tracked correctly
- [ ] E2E tests passing
- [ ] feature_list.json updated

## Known Limitations

1. **Pricing Calculation:** The checkout form shows individual prices but doesn't calculate the actual total (requires parsing price_label strings). Production version should fetch numeric prices from Stripe.

2. **Bump Targeting:** Currently shows all active order bumps on every checkout page. Future enhancement: filter bumps by `parent_offer_key` or course category.

3. **A/B Testing:** No built-in support for testing different bump copy or pricing. Would require separate offer keys and analytics aggregation.

4. **Discount Codes:** Order bumps don't inherit the main product's discount code. Stripe limitation.

## Related Files

### New Files
- `supabase/migrations/20260203000000_order_bumps.sql`
- `app/api/offers/order-bumps/route.ts`
- `app/(public)/checkout/[courseId]/page.tsx`
- `app/(public)/checkout/[courseId]/CheckoutForm.tsx`

### Modified Files
- `app/api/stripe/checkout/route.ts`
- `app/(public)/courses/[slug]/BuyButton.tsx`
- `components/admin/OfferForm.tsx`

### Existing (Reused)
- `components/offers/OrderBump.tsx`
- `app/admin/offers/**`

## Next Steps (Future Enhancements)

1. **Upsells (feat-058):** Post-purchase modal with one-click upsell
2. **Bump Analytics:** Dashboard showing bump conversion rates
3. **Smart Targeting:** ML-based bump recommendations
4. **Time-Limited Bumps:** Add `start_at`/`end_at` fields for seasonal offers
5. **Quantity Bumps:** Allow bumps with quantity selectors (e.g., "Add 3 more courses")

---

**Implementation Status:** ✅ Code Complete, ⏳ Awaiting Database Migration
**Next Action:** Fix Supabase and apply migration
