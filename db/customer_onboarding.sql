-- ============================================================================
--  Customer onboarding — one table, no payment data.
--
--  Run this once in the Supabase Dashboard -> SQL Editor, on a NEW project,
--  as the project owner. It is idempotent: running it again is safe.
--
--  What this file creates
--    1. public.customer_onboarding          the only table the storefront uses
--    2. CHECK constraints                   the same rules the form applies
--    3. indexes                             for the team's admin queries
--    4. row level security + column grants  the public role may only INSERT
--                                           the customer-supplied columns
--    5. public.assign_customer_onboarding() the team-only write path
--
--  What the browser may do
--    INSERT one row, with a browser-generated uuid, and nothing else.
--
--  What the browser may NOT do
--    SELECT, UPDATE or DELETE any row, and it may not set username,
--    external_user_id or confirmation_code. Those three columns are assigned
--    later by the support team over the phone.
--
--  No card number, expiry, CVV, PIN, bank detail or password is stored here.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
--  1. The table
-- ----------------------------------------------------------------------------

create table if not exists public.customer_onboarding (
  id                uuid        primary key default gen_random_uuid(),
  full_name         text        not null,
  email             text        not null,
  phone             text        not null,
  address_line_1    text        not null,
  address_line_2    text,
  city              text        not null,
  state_region      text        not null,
  postal_code       text        not null,
  country           text        not null,
  connection_period text        not null,
  -- Team-assigned, by phone. Deliberately NOT part of the insert grant.
  username          text,
  external_user_id  text,       -- 20-character alphanumeric ID
  confirmation_code text,       -- 3 digits, kept as text so "007" survives
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table  public.customer_onboarding                   is 'Onboarding requests submitted from the storefront. No payment data.';
comment on column public.customer_onboarding.username          is 'Assigned by the support team. Never writable from the public API.';
comment on column public.customer_onboarding.external_user_id  is 'Assigned by the support team: exactly 20 alphanumeric characters.';
comment on column public.customer_onboarding.confirmation_code is 'Assigned by the support team: exactly 3 digits. Stored as text to keep leading zeros.';

-- ----------------------------------------------------------------------------
--  2. Constraints — these mirror src/lib/validation.ts and onboarding.ts, so a
--     value that bypasses the browser is still rejected by Postgres.
-- ----------------------------------------------------------------------------

alter table public.customer_onboarding drop constraint if exists customer_onboarding_full_name_check;
alter table public.customer_onboarding add  constraint customer_onboarding_full_name_check
  check (char_length(full_name) between 2 and 120);

alter table public.customer_onboarding drop constraint if exists customer_onboarding_email_check;
alter table public.customer_onboarding add  constraint customer_onboarding_email_check
  check (
    char_length(email) <= 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'
  );

alter table public.customer_onboarding drop constraint if exists customer_onboarding_phone_check;
alter table public.customer_onboarding add  constraint customer_onboarding_phone_check
  check (
    char_length(phone) between 6 and 32
    and phone ~ '^\+?[0-9]([0-9 ().-]{4,30}[0-9])$'
  );

alter table public.customer_onboarding drop constraint if exists customer_onboarding_address_line_1_check;
alter table public.customer_onboarding add  constraint customer_onboarding_address_line_1_check
  check (char_length(address_line_1) between 2 and 200);

alter table public.customer_onboarding drop constraint if exists customer_onboarding_address_line_2_check;
alter table public.customer_onboarding add  constraint customer_onboarding_address_line_2_check
  check (address_line_2 is null or char_length(address_line_2) between 1 and 200);

alter table public.customer_onboarding drop constraint if exists customer_onboarding_city_check;
alter table public.customer_onboarding add  constraint customer_onboarding_city_check
  check (char_length(city) between 1 and 120);

alter table public.customer_onboarding drop constraint if exists customer_onboarding_state_region_check;
alter table public.customer_onboarding add  constraint customer_onboarding_state_region_check
  check (char_length(state_region) between 1 and 120);

alter table public.customer_onboarding drop constraint if exists customer_onboarding_postal_code_check;
alter table public.customer_onboarding add  constraint customer_onboarding_postal_code_check
  check (
    char_length(postal_code) between 1 and 20
    and postal_code ~ '^[A-Za-z0-9][A-Za-z0-9 -]{0,19}$'
  );

alter table public.customer_onboarding drop constraint if exists customer_onboarding_country_check;
alter table public.customer_onboarding add  constraint customer_onboarding_country_check
  check (
    char_length(country) between 1 and 80
    and country ~ '^[A-Za-z][A-Za-z .''-]{1,79}$'
  );

alter table public.customer_onboarding drop constraint if exists customer_onboarding_connection_period_check;
alter table public.customer_onboarding add  constraint customer_onboarding_connection_period_check
  check (connection_period ~ '^[1-9][0-9]{0,2} (month|months|year|years)$');

-- The team-assigned values have a fixed shape. A NULL means "not assigned yet".
alter table public.customer_onboarding drop constraint if exists customer_onboarding_username_check;
alter table public.customer_onboarding add  constraint customer_onboarding_username_check
  check (username is null or char_length(username) between 1 and 64);

alter table public.customer_onboarding drop constraint if exists customer_onboarding_external_user_id_check;
alter table public.customer_onboarding add  constraint customer_onboarding_external_user_id_check
  check (external_user_id is null or external_user_id ~ '^[A-Za-z0-9]{20}$');

alter table public.customer_onboarding drop constraint if exists customer_onboarding_confirmation_code_check;
alter table public.customer_onboarding add  constraint customer_onboarding_confirmation_code_check
  check (confirmation_code is null or confirmation_code ~ '^[0-9]{3}$');

-- ----------------------------------------------------------------------------
--  3. Indexes
-- ----------------------------------------------------------------------------

create index if not exists customer_onboarding_created_at_idx
  on public.customer_onboarding (created_at desc);

create index if not exists customer_onboarding_email_idx
  on public.customer_onboarding (lower(email));

create index if not exists customer_onboarding_phone_idx
  on public.customer_onboarding (phone);

-- One account per username / user ID once the team assigns them.
create unique index if not exists customer_onboarding_username_key
  on public.customer_onboarding (lower(username))
  where username is not null;

create unique index if not exists customer_onboarding_external_user_id_key
  on public.customer_onboarding (external_user_id)
  where external_user_id is not null;

-- ----------------------------------------------------------------------------
--  4. updated_at
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists customer_onboarding_set_updated_at on public.customer_onboarding;
create trigger customer_onboarding_set_updated_at
  before update on public.customer_onboarding
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
--  5. Row level security and grants
--
--  RLS decides WHICH rows a role may touch; grants decide WHICH columns it may
--  even mention. Both are needed here:
--
--    * `revoke all` removes the default Supabase grant that gives anon and
--      authenticated full access to every public table.
--    * `grant insert (...)` is the allow-list of customer columns. It does not
--      include username / external_user_id / confirmation_code, so an attempt
--      to write them fails with 42501 before RLS is even consulted.
--    * The INSERT policy additionally requires those three columns to be NULL.
--
--  `force row level security` is NOT used: the table owner (postgres) and
--  service_role must keep their UPDATE path for assigning the account details.
-- ----------------------------------------------------------------------------

alter table public.customer_onboarding enable row level security;

revoke all on table public.customer_onboarding from anon, authenticated;
revoke all on table public.customer_onboarding from public;

grant usage on schema public to anon;
grant insert (
  id,
  full_name,
  email,
  phone,
  address_line_1,
  address_line_2,
  city,
  state_region,
  postal_code,
  country,
  connection_period
) on public.customer_onboarding to anon;

drop policy if exists "Anon may submit an onboarding request" on public.customer_onboarding;
create policy "Anon may submit an onboarding request"
  on public.customer_onboarding
  for insert
  to anon
  with check (
    username is null
    and external_user_id is null
    and confirmation_code is null
  );

-- There is deliberately no SELECT, UPDATE or DELETE policy for anon.
-- The team reads and updates rows in the Dashboard, or through the
-- service-role key from a trusted server.

grant select, update on table public.customer_onboarding to service_role;

-- ----------------------------------------------------------------------------
--  6. Team-only write path: assign username, user ID and confirmation code
--
--  SECURITY DEFINER because the caller (postgres in the SQL Editor, or
--  service_role from a trusted server) should not need direct UPDATE rights on
--  every column; execute is granted to service_role only.
--
--  In the Dashboard SQL Editor:
--    select public.assign_customer_onboarding(
--      '<reference the customer quoted>',
--      'alexmorgan',
--      '4021998374AB12CD34EF',
--      '007'
--    );
-- ----------------------------------------------------------------------------

create or replace function public.assign_customer_onboarding(
  p_id                uuid,
  p_username          text,
  p_external_user_id  text,
  p_confirmation_code text
)
returns public.customer_onboarding
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  assigned public.customer_onboarding;
begin
  if p_id is null then
    raise exception 'an onboarding reference is required';
  end if;

  if p_username is null or btrim(p_username) = '' then
    raise exception 'a username is required';
  end if;

  if p_external_user_id is null or p_external_user_id !~ '^[A-Za-z0-9]{20}$' then
    raise exception 'the user ID must be exactly 20 letters or digits';
  end if;

  if p_confirmation_code is null or p_confirmation_code !~ '^[0-9]{3}$' then
    raise exception 'the confirmation code must be exactly 3 digits';
  end if;

  update public.customer_onboarding
     set username          = btrim(p_username),
         external_user_id  = p_external_user_id,
         confirmation_code = p_confirmation_code
   where id = p_id
  returning * into assigned;

  if not found then
    raise exception 'no onboarding request with reference %', p_id;
  end if;

  return assigned;
end;
$$;

revoke all on function public.assign_customer_onboarding(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.assign_customer_onboarding(uuid, text, text, text) to service_role;

commit;
