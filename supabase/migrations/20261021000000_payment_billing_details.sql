-- ============================================================================
-- Billing details captured by the payment-details form.
--
-- Stores ONLY the non-sensitive metadata the application actually needs:
--   * cardholder name
--   * billing ZIP code
--   * submission timestamp (created_at)
--
-- NEVER store card numbers, CVVs, PINs or any other payment credentials.
-- The browser validates those fields locally and never transmits them.
--
-- Security model — identical to public.orders, because this is a guest
-- checkout with no Supabase Auth session:
--   * RLS is enabled and NO policies are granted, so anon/authenticated have
--     no direct access to the table at all.
--   * The only writer is the `save-billing-details` Edge Function, which
--     authorises the caller with the per-order capability token and connects
--     with the service-role key (never exposed to the browser).
--
-- This migration is additive: it creates one new table and touches nothing
-- that already exists.
-- ============================================================================

create table if not exists public.payment_billing_details (
  id uuid primary key default gen_random_uuid(),
  -- One row per order. The unique constraint both enforces the 1:1 shape and
  -- makes repeated submissions idempotent (upsert on order_id).
  order_id uuid not null unique references public.orders (id) on delete cascade,
  cardholder_name text not null,
  billing_postal_code text not null,
  -- Server-side submission timestamp; the first one is kept on retries.
  created_at timestamptz not null default now(),

  constraint payment_billing_details_cardholder_len check (
    char_length(btrim(cardholder_name)) between 2 and 120
  ),
  constraint payment_billing_details_postal_shape check (
    btrim(billing_postal_code) ~ '^[0-9]{5}(-[0-9]{4})?$'
  )
);

comment on table public.payment_billing_details is
  'Non-sensitive billing metadata from the payment-details form. Card numbers, CVVs and PINs are never stored.';
comment on column public.payment_billing_details.order_id is
  'Links the billing metadata to its order. Unique, so one submission per order.';
comment on column public.payment_billing_details.cardholder_name is
  'Cardholder name as entered on the form. No card number is associated with it here.';
comment on column public.payment_billing_details.billing_postal_code is
  'US billing ZIP (5 digits, or ZIP+4).';
comment on column public.payment_billing_details.created_at is
  'When the form was submitted. Preserved across idempotent retries.';

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.payment_billing_details enable row level security;

-- Intentionally no policies: anon/authenticated get no direct table access.
-- The service role (used inside Edge Functions) bypasses RLS.

-- Defence in depth: strip the default Supabase table grants too, so even a
-- future policy mistake could not hand this table to anonymous clients.
revoke all on table public.payment_billing_details from anon, authenticated;
