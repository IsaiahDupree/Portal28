-- Migration: Add promo code tracking to orders table
-- Feature: feat-023 (Coupons & Promo Codes)
-- Purpose: Store promo code usage data from Stripe checkout sessions

-- Add promo code columns to orders table
alter table public.orders add column if not exists promo_code text;
alter table public.orders add column if not exists discount_amount int; -- cents
alter table public.orders add column if not exists discount_percent numeric(5,2); -- percentage (e.g., 25.00 for 25%)
alter table public.orders add column if not exists amount_before_discount int; -- original amount in cents

-- Add index for promo code analytics
create index if not exists idx_orders_promo_code on public.orders(promo_code) where promo_code is not null;

-- Add comment
comment on column public.orders.promo_code is 'Stripe promotion code used during checkout';
comment on column public.orders.discount_amount is 'Discount amount in cents (fixed discounts)';
comment on column public.orders.discount_percent is 'Discount percentage (percentage discounts)';
comment on column public.orders.amount_before_discount is 'Original price before discount in cents';
