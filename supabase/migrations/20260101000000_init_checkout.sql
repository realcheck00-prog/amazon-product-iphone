-- ============================================================================
-- Checkout schema: orders + order_items
--
-- Monetary values are stored as integer cents. The product price is $100.00,
-- represented as 10000 cents.
--
-- Security model:
--   * RLS is enabled on both tables and NO policies are granted to anon or
--     authenticated roles, so anonymous users cannot read, edit or delete
--     orders directly.
--   * All reads/writes happen through Edge Functions using the service-role
--     key, which bypasses RLS. Guest checkout therefore works without a
--     Supabase Auth account.
--   * The order-creation RPC is executable only by the service_role.
--   * No payment card data is ever stored.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- orders
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  -- Client-supplied key that makes order creation idempotent.
  idempotency_key uuid not null unique,
  -- Opaque capability token; required to look up the order later.
  access_token uuid not null default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  shipping_address_line1 text not null,
  shipping_address_line2 text not null default '',
  shipping_city text not null,
  shipping_region text not null,
  shipping_postal_code text not null,
  shipping_country text not null,
  subtotal_cents integer not null,
  shipping_cents integer not null default 0,
  total_cents integer not null,
  currency char(3) not null default 'USD',
  order_status text not null default 'pending_payment',
  payment_status text not null default 'pending',
  payment_provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint orders_customer_name_len check (char_length(btrim(customer_name)) between 2 and 120),
  constraint orders_customer_email_shape check (
    customer_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint orders_customer_phone_len check (
    char_length(btrim(customer_phone)) between 5 and 40
  ),
  constraint orders_address_line1_len check (char_length(btrim(shipping_address_line1)) between 1 and 200),
  constraint orders_city_len check (char_length(btrim(shipping_city)) between 1 and 120),
  constraint orders_region_len check (char_length(btrim(shipping_region)) between 1 and 120),
  constraint orders_postal_len check (char_length(btrim(shipping_postal_code)) between 1 and 20),
  constraint orders_country_len check (char_length(btrim(shipping_country)) between 2 and 64),
  constraint orders_amounts_nonnegative check (
    subtotal_cents >= 0 and shipping_cents >= 0 and total_cents >= 0
  ),
  constraint orders_total_matches check (total_cents = subtotal_cents + shipping_cents),
  constraint orders_order_status_valid check (
    order_status in ('pending_payment', 'confirmed', 'cancelled')
  ),
  constraint orders_payment_status_valid check (
    payment_status in ('pending', 'paid', 'failed')
  ),
  -- Payment must be paid exactly when the order is confirmed.
  constraint orders_paid_implies_confirmed check (
    payment_status <> 'paid' or order_status = 'confirmed'
  )
);

comment on table public.orders is
  'Guest checkout orders. Read/write only via Edge Functions (service role).';
comment on column public.orders.idempotency_key is
  'Prevents duplicate orders from repeated submissions of the same checkout.';
comment on column public.orders.access_token is
  'Capability token required for order lookup/confirmation.';

-- ----------------------------------------------------------------------------
-- order_items
-- ----------------------------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id text not null,
  product_title text not null,
  product_image text not null,
  selected_variant text not null,
  quantity integer not null,
  unit_price_cents integer not null,
  line_total_cents integer not null,
  created_at timestamptz not null default now(),

  constraint order_items_quantity_range check (quantity between 1 and 100),
  constraint order_items_price_nonnegative check (
    unit_price_cents >= 0 and line_total_cents >= 0
  ),
  constraint order_items_line_total_matches check (
    line_total_cents = quantity * unit_price_cents
  )
);

comment on table public.order_items is
  'Line items for an order. Cascades on order deletion.';

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------
create index if not exists orders_order_number_idx on public.orders (order_number);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists order_items_order_id_idx on public.order_items (order_id);

-- ----------------------------------------------------------------------------
-- updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Intentionally no policies: anon/authenticated get no direct table access.
-- The service role (used inside Edge Functions) bypasses RLS.

-- ----------------------------------------------------------------------------
-- Atomic order creation RPC
--
-- Persists an order + its items in a single transaction, enforces idempotency
-- on idempotency_key, and generates a unique order number server-side.
-- Executable ONLY by the service_role.
-- ----------------------------------------------------------------------------
create or replace function public.create_order_with_items(
  p_idempotency_key uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_address_line1 text,
  p_address_line2 text,
  p_city text,
  p_region text,
  p_postal_code text,
  p_country text,
  p_subtotal_cents integer,
  p_shipping_cents integer,
  p_total_cents integer,
  p_currency text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
  v_existing public.orders;
  v_number text;
  v_attempt integer := 0;
  v_item jsonb;
begin
  -- Idempotency: return the previously created order for the same key.
  select * into v_existing from public.orders where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'order_id', v_existing.id,
      'order_number', v_existing.order_number,
      'access_token', v_existing.access_token,
      'currency', v_existing.currency,
      'subtotal_cents', v_existing.subtotal_cents,
      'shipping_cents', v_existing.shipping_cents,
      'total_cents', v_existing.total_cents,
      'order_status', v_existing.order_status,
      'payment_status', v_existing.payment_status,
      'created_at', v_existing.created_at
    );
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_number := 'SF-' || to_char(now(), 'YYYYMMDD') || '-' ||
      upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

    begin
      insert into public.orders (
        order_number,
        idempotency_key,
        customer_name,
        customer_email,
        customer_phone,
        shipping_address_line1,
        shipping_address_line2,
        shipping_city,
        shipping_region,
        shipping_postal_code,
        shipping_country,
        subtotal_cents,
        shipping_cents,
        total_cents,
        currency
      ) values (
        v_number,
        p_idempotency_key,
        p_customer_name,
        lower(p_customer_email),
        p_customer_phone,
        p_address_line1,
        coalesce(p_address_line2, ''),
        p_city,
        p_region,
        p_postal_code,
        p_country,
        p_subtotal_cents,
        p_shipping_cents,
        p_total_cents,
        p_currency
      )
      returning * into v_order;
      exit;
    exception when unique_violation then
      -- Concurrent insert with the same idempotency key: return the winner.
      select * into v_existing from public.orders where idempotency_key = p_idempotency_key;
      if found then
        return jsonb_build_object(
          'order_id', v_existing.id,
          'order_number', v_existing.order_number,
          'access_token', v_existing.access_token,
          'currency', v_existing.currency,
          'subtotal_cents', v_existing.subtotal_cents,
          'shipping_cents', v_existing.shipping_cents,
          'total_cents', v_existing.total_cents,
          'order_status', v_existing.order_status,
          'payment_status', v_existing.payment_status,
          'created_at', v_existing.created_at
        );
      end if;
      if v_attempt >= 5 then
        raise;
      end if;
    end;
  end loop;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.order_items (
      order_id,
      product_id,
      product_title,
      product_image,
      selected_variant,
      quantity,
      unit_price_cents,
      line_total_cents
    ) values (
      v_order.id,
      v_item ->> 'product_id',
      v_item ->> 'product_title',
      v_item ->> 'product_image',
      v_item ->> 'selected_variant',
      (v_item ->> 'quantity')::integer,
      (v_item ->> 'unit_price_cents')::integer,
      (v_item ->> 'line_total_cents')::integer
    );
  end loop;

  return jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'access_token', v_order.access_token,
    'currency', v_order.currency,
    'subtotal_cents', v_order.subtotal_cents,
    'shipping_cents', v_order.shipping_cents,
    'total_cents', v_order.total_cents,
    'order_status', v_order.order_status,
    'payment_status', v_order.payment_status,
    'created_at', v_order.created_at
  );
end;
$$;

-- Least privilege: only the service role may create orders.
revoke all on function public.create_order_with_items(
  uuid, text, text, text, text, text, text, text, text, text,
  integer, integer, integer, text, jsonb
) from public;
revoke all on function public.create_order_with_items(
  uuid, text, text, text, text, text, text, text, text, text,
  integer, integer, integer, text, jsonb
) from anon, authenticated;
grant execute on function public.create_order_with_items(
  uuid, text, text, text, text, text, text, text, text, text,
  integer, integer, integer, text, jsonb
) to service_role;
