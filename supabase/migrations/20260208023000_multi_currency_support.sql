-- Multi-Currency Support
-- Feature: feat-224
-- Support multiple currencies for course pricing with real-time conversion

-- Currency exchange rates table (updated periodically)
create table if not exists public.currency_rates (
  id uuid primary key default gen_random_uuid(),
  currency_code text not null unique,  -- e.g., 'USD', 'EUR', 'GBP', 'JPY'
  rate_to_usd decimal(10, 6) not null,  -- Exchange rate to USD (base currency)
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Insert default rates (USD as base = 1.0)
insert into public.currency_rates (currency_code, rate_to_usd) values
  ('USD', 1.000000),
  ('EUR', 0.920000),  -- Approximate rates as of Feb 2026
  ('GBP', 0.790000),
  ('CAD', 1.350000),
  ('AUD', 1.520000),
  ('JPY', 148.000000),
  ('INR', 83.000000),
  ('BRL', 5.000000)
on conflict (currency_code) do nothing;

-- User currency preferences
create table if not exists public.user_currency_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  currency_code text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for faster lookups
create index if not exists idx_user_currency_prefs on public.user_currency_preferences(user_id);

-- RLS policies for currency_rates (public read)
alter table public.currency_rates enable row level security;

drop policy if exists "Anyone can view currency rates" on public.currency_rates;
create policy "Anyone can view currency rates" on public.currency_rates
  for select using (true);

drop policy if exists "Admins can manage currency rates" on public.currency_rates;
create policy "Admins can manage currency rates" on public.currency_rates
  for all using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS policies for user_currency_preferences
alter table public.user_currency_preferences enable row level security;

drop policy if exists "Users can view own currency preference" on public.user_currency_preferences;
create policy "Users can view own currency preference" on public.user_currency_preferences
  for select using (auth.uid() = user_id);

drop policy if exists "Users can update own currency preference" on public.user_currency_preferences;
create policy "Users can update own currency preference" on public.user_currency_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can upsert own currency preference" on public.user_currency_preferences;
create policy "Users can upsert own currency preference" on public.user_currency_preferences
  for update using (auth.uid() = user_id);

-- Function to get price in user's currency
create or replace function public.get_price_in_currency(
  price_cents_usd integer,
  target_currency text
) returns integer
language plpgsql
as $$
declare
  rate decimal(10, 6);
  converted_price integer;
begin
  -- Get exchange rate for target currency
  select rate_to_usd into rate
  from public.currency_rates
  where currency_code = target_currency;

  -- If rate not found, default to USD
  if rate is null then
    return price_cents_usd;
  end if;

  -- Convert USD to target currency
  -- Formula: price_usd / rate_to_usd = price_in_currency
  converted_price := floor(price_cents_usd / rate);

  return converted_price;
end;
$$;

-- Function to format price with currency symbol
create or replace function public.format_price(
  price_cents integer,
  currency_code text
) returns text
language plpgsql
as $$
declare
  symbol text;
  amount decimal;
begin
  -- Get currency symbol
  symbol := case currency_code
    when 'USD' then '$'
    when 'EUR' then '€'
    when 'GBP' then '£'
    when 'CAD' then 'CA$'
    when 'AUD' then 'A$'
    when 'JPY' then '¥'
    when 'INR' then '₹'
    when 'BRL' then 'R$'
    else currency_code || ' '
  end;

  -- Convert cents to decimal
  amount := price_cents / 100.0;

  -- Format based on currency
  if currency_code = 'JPY' then
    -- JPY doesn't use cents
    return symbol || floor(price_cents / 100)::text;
  else
    return symbol || amount::text;
  end if;
end;
$$;

-- Add currency column to orders table if it doesn't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'orders'
    and column_name = 'currency'
  ) then
    alter table public.orders add column currency text not null default 'USD';
  end if;
end $$;

-- Add display_currency column to course_prices if it doesn't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'course_prices'
    and column_name = 'display_currency'
  ) then
    alter table public.course_prices add column display_currency text;
  end if;
end $$;
