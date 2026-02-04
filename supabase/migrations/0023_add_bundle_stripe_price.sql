-- Add stripe_price_id to offers table for bundles
-- Bundles need their own Stripe product/price for checkout

ALTER TABLE public.offers
ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- Add index for quick lookup
CREATE INDEX IF NOT EXISTS idx_offers_stripe_price ON public.offers(stripe_price_id);

-- Update bundle payload comment to reflect new model
COMMENT ON COLUMN public.offers.payload IS
'Kind-specific payload:
- membership: { "tier": "member", "interval": "monthly" }
- course: { "courseSlug": "fb-ads-101" }
- bundle: { "courseIds": ["uuid1", "uuid2", "uuid3"] }';

-- For existing bundles using old courseSlug model, we can keep backwards compatibility
-- New bundles should use courseIds array and have stripe_price_id set
