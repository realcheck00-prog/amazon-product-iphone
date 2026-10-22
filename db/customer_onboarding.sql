-- ============================================================================
--  Customer onboarding — one table, no payment data.
--
--  Run this in the Supabase Dashboard -> SQL Editor, as the project owner.
--  It is idempotent: running it again is safe, and section 1b upgrades a table
--  created from an earlier draft of this file (it drops the old
--  `connection_period` column and adds the four account-identifier columns).
--
--  What this file creates
--    1. public.customer_onboarding   the only table the storefront uses
--    2. CHECK constraints            the same rules the form applies
--    3. indexes                      for the team's admin queries
--    4. row level security + grants  the public role may only INSERT
--
--  What the browser may do
--    INSERT one row, with a browser-generated uuid, and nothing else.
--
--  What the browser may NOT do
--    SELECT, UPDATE or DELETE any row.
--
--  The username, user ID, confirmation code and connection expiry are the
--  values the customer already received from the team. They are identifiers,
--  not credentials: they are stored as text, they authenticate nothing, and
--  leading zeros / letter casing are preserved.
--
--  No card number, expiry, CVV, PIN, bank detail or password is stored here.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
--  1. The table
-- ----------------------------------------------------------------------------

create table if not exists public.customer_onboarding (
  id                     uuid        primary key default gen_random_uuid(),
  full_name              text        not null,
  email                  text        not null,
  phone                  text        not null,
  address_line_1         text        not null,
  address_line_2         text,
  city                   text        not null,
  state_region           text        not null,
  postal_code            text        not null,
  country                text        not null,
  username               text        not null,
  external_user_id       text        not null,  -- up to 20 letters or digits
  confirmation_code      text        not null,  -- exactly 3 digits, keeps "007"
  connection_valid_until text        not null,  -- MM/YYYY, stored as text
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table  public.customer_onboarding                        is 'Onboarding requests submitted from the storefront. No payment data.';
comment on column public.customer_onboarding.username               is 'Username issued by the team. An identifier, never a credential.';
comment on column public.customer_onboarding.external_user_id       is 'User ID issued by the team: up to 20 alphanumeric characters, case and leading zeros preserved.';
comment on column public.customer_onboarding.confirmation_code      is 'Confirmation code issued by the team: exactly 3 digits. Stored as text to keep leading zeros.';
comment on column public.customer_onboarding.connection_valid_until is 'Last valid month of the connection, as MM/YYYY. Text, never a timestamp.';

-- ----------------------------------------------------------------------------
--  1b. Upgrading a table created from an earlier draft
--
--  `create table if not exists` does nothing when the table is already there,
--  so add the columns this version needs. On a fresh table these are no-ops.
--  The old `connection_period` duration column is dropped: the expiry is now
--  an MM/YYYY date, and a duration cannot be converted into one.
-- ----------------------------------------------------------------------------

alter table public.customer_onboarding
  add column if not exists username               text,
  add column if not exists external_user_id       text,
  add column if not exists confirmation_code      text,
  add column if not exists connection_valid_until text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.customer_onboarding drop column if exists connection_period;

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

alter table public.customer_onboarding drop constraint if exists customer_onboarding_username_check;
alter table public.customer_onboarding add  constraint customer_onboarding_username_check
  check (char_length(username) between 1 and 64);

alter table public.customer_onboarding drop constraint if exists customer_onboarding_external_user_id_check;
alter table public.customer_onboarding add  constraint customer_onboarding_external_user_id_check
  check (external_user_id ~ '^[A-Za-z0-9]{1,20}$');

alter table public.customer_onboarding drop constraint if exists customer_onboarding_confirmation_code_check;
alter table public.customer_onboarding add  constraint customer_onboarding_confirmation_code_check
  check (confirmation_code ~ '^[0-9]{3}$');

alter table public.customer_onboarding drop constraint if exists customer_onboarding_connection_valid_until_check;
alter table public.customer_onboarding add  constraint customer_onboarding_connection_valid_until_check
  check (connection_valid_until ~ '^(0[1-9]|1[0-2])/[0-9]{4}$');

-- The customer always supplies these four values, so they are NOT NULL. If an
-- older table still holds rows without them, stop with a readable message
-- instead of failing halfway through with a generic constraint error.
do $$
declare
  incomplete bigint;
begin
  select count(*) into incomplete
  from public.customer_onboarding
  where username is null
     or external_user_id is null
     or confirmation_code is null
     or connection_valid_until is null;

  if incomplete > 0 then
    raise exception
      'customer_onboarding has % row(s) without account identifiers. Fill or delete them in the Table Editor, then run this file again.', incomplete;
  end if;
end;
$$;

alter table public.customer_onboarding alter column username               set not null;
alter table public.customer_onboarding alter column external_user_id       set not null;
alter table public.customer_onboarding alter column confirmation_code      set not null;
alter table public.customer_onboarding alter column connection_valid_until set not null;

-- ----------------------------------------------------------------------------
--  3. Indexes
-- ----------------------------------------------------------------------------

create index if not exists customer_onboarding_created_at_idx
  on public.customer_onboarding (created_at desc);

create index if not exists customer_onboarding_email_idx
  on public.customer_onboarding (lower(email));

create index if not exists customer_onboarding_phone_idx
  on public.customer_onboarding (phone);

-- One account per username / user ID. Usernames are matched case-insensitively;
-- user IDs are compared exactly, because their casing is meaningful.
create unique index if not exists customer_onboarding_username_key
  on public.customer_onboarding (lower(username));

create unique index if not exists customer_onboarding_external_user_id_key
  on public.customer_onboarding (external_user_id);

-- ----------------------------------------------------------------------------
--  4. updated_at
--
--  The browser never updates rows, so this only fires for Dashboard/service
--  edits (for example correcting a typo after a support call).
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
--    * `grant insert (...)` is the allow-list of the columns the form submits.
--    * The INSERT policy has no extra row condition: the CHECK constraints
--      above are what validate the data.
--
--  `force row level security` is NOT used: the table owner (postgres) and
--  service_role keep their read/update path for support work.
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
  username,
  external_user_id,
  confirmation_code,
  connection_valid_until
) on public.customer_onboarding to anon;

-- Older drafts used a policy that required the team columns to be NULL. Drop
-- every policy on this table (it is the only one) before installing the
-- current one, so a leftover policy cannot block valid inserts.
do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'customer_onboarding'
  loop
    execute format('drop policy if exists %I on public.customer_onboarding', policy_name);
  end loop;
end;
$$;

create policy "Anon may submit an onboarding request"
  on public.customer_onboarding
  for insert
  to anon
  with check (true);

-- There is deliberately no SELECT, UPDATE or DELETE policy for anon, and no
-- SELECT/UPDATE/DELETE grant, so the browser cannot read back any row.

grant select, update on table public.customer_onboarding to service_role;

-- The previous design assigned these values from the Dashboard. The customer
-- now supplies them, so that write path is gone; dropping it keeps re-runs
-- of this file in sync with older databases.
drop function if exists public.assign_customer_onboarding(uuid, text, text, text);

commit;
