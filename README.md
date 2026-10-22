# amazon — iPhone Pro Max demo storefront

A React + Vite + TypeScript + Tailwind CSS demo storefront with a guest
checkout that doubles as a **customer onboarding** form. The submitted details
are stored in a single **Supabase** table, `public.customer_onboarding`.

- **Product:** Apple iPhone 17 Pro Max 256 GB (Cosmic Orange)
- **Price:** **$100.00 USD** (stored everywhere as `10000` integer cents)
- **Payment:** none — the form takes no payment and no card data
- **Checkout:** `/checkout` (guest, no account, no card details)
- **Confirmation:** `/order-success?ref=<reference>` (no server read)

> This is an unaffiliated demo interface. It does not use, embed, or redirect to
> Amazon checkout. The reference URL was used for visual inspiration only.

---

## 1. What is in the repository

### Frontend

| File | Purpose |
| --- | --- |
| `src/lib/supabase.ts` | Supabase browser client (publishable key, no session persistence) |
| `src/lib/onboarding.ts` | Account-identifier rules, row builder, error mapping, session helpers |
| `src/lib/validation.ts` | Contact + address validation (the nine customer fields) |
| `src/lib/csvExport.ts` | Local CSV copy — RFC 4180 escaping + formula-injection guard |
| `src/lib/buyNow.ts` | Separate Buy Now checkout payload (sessionStorage) |
| `src/lib/format.ts` | `formatCents()` for integer-cent money |
| `src/lib/catalog.ts` | Client mirror of the product (display only) |
| `src/data/product.ts` | Product copy, price and storefront identity |
| `src/data/media.ts` | Single source of truth for uploaded image priority order |
| `src/state/cart.ts`, `src/state/CartProvider.tsx` | localStorage-backed cart |
| `src/pages/ProductPage.tsx` | Product page |
| `src/pages/CheckoutPage.tsx` | Checkout + onboarding, two-column responsive layout |
| `src/pages/OrderSuccessPage.tsx` | Confirmation screen (reads only `?ref=`) |
| `src/components/cart/CartDrawer.tsx` | Slide-over cart with qty + remove |
| `src/components/checkout/*` | Header, form field, order summary, onboarding form |
| `src/App.tsx` | Router (`/`, `/checkout`, `/order-success`) |

### Database and scripts

| File | Purpose |
| --- | --- |
| `db/customer_onboarding.sql` | **The whole backend**: table, constraints, indexes, RLS, grants |
| `scripts/verify-onboarding.mjs` | Post-deploy check of the table and its permissions (no dependencies, no writes) |
| `scripts/test-csv-export.mjs` | Tests for the CSV escaping and the formula-injection guard |
| `scripts/test-onboarding.mjs` | Tests for the onboarding rules and the row that is inserted |
| `vercel.json` | SPA rewrites so `/checkout` and `/order-success` deep-link correctly |
| `.env.example` | Environment variable placeholders (no secrets) |

There is **no `supabase/` directory** in this repository: no migrations, no Edge
Functions. The database is one SQL file you paste into the Dashboard.

---

## 2. Supabase setup

### 2.1 Create the project

1. Create a project at <https://supabase.com/dashboard>.
2. Copy the **Project URL** (Project Settings → API) and the
   **publishable key** — the `sb_publishable_…` value. It is designed to be
   shipped in a browser.
3. Do **not** copy the `service_role` / secret key into the frontend, into
   `.env`, or into anything Vite compiles. It bypasses RLS.

### 2.2 Run the SQL

Open **SQL Editor → New query**, paste the whole of
`db/customer_onboarding.sql`, and click **Run**. The file is idempotent, so
running it twice is safe. If the project already has an older
`customer_onboarding` table from an earlier draft, the same file upgrades it in
place: it adds `external_user_id` / `connection_valid_until` / `updated_at`,
drops the obsolete `connection_period` column, and rewrites the constraints,
grants and policy. If older rows have no account identifiers, the script stops
with a message naming the row count: fill or delete those rows in the Table
Editor, then run it again.

It creates:

- `public.customer_onboarding` — one row per onboarding request. It stores the
  nine contact/address fields plus the four account details the customer
  already holds: `username`, `external_user_id`, `confirmation_code` and
  `connection_valid_until`.
- CHECK constraints that mirror the browser rules, so a hand-crafted request
  cannot store a shape the form would not produce. The identifiers are `text`,
  not numbers, so `007` keeps its leading zeros and letter casing survives.
- RLS **enabled**, all table privileges **revoked** from `anon` and
  `authenticated`, and a narrow `INSERT` grant for `anon` covering exactly the
  columns the form submits.
- No `SELECT`, `UPDATE` or `DELETE` policy for `anon`, so the browser cannot
  read back anyone's data — not even its own row.
- No assignment function and no team-only columns: the values are entered by
  the customer, not filled in later.

### 2.3 Environment variables

```bash
cp .env.example .env
```

Fill in:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-publishable-key
```

A legacy **anon JWT** works too — put it in `VITE_SUPABASE_PUBLISHABLE_KEY`, or
add `VITE_SUPABASE_ANON_KEY` and the client falls back to it. Both carry only
the `anon` role, which the SQL below restricts to a single `INSERT`.

Vite inlines these at build time. `.env` is git-ignored; only `.env.example`
is committed. Restart `npm run dev` after changing them.

### 2.4 Verify the deployment

```bash
node scripts/verify-onboarding.mjs
# or: npm run verify:onboarding
```

It reads `.env`, uses only the **publishable** key (exactly like the browser)
and checks, without creating a row:

1. `public.customer_onboarding` exists;
2. every column the application uses is present;
3. `anon` **cannot** read names, emails or phone numbers;
4. `anon` **can** insert a customer row, and the database rejects an invalid
   expiry (`13/2030`), a two-digit confirmation code, a user ID containing a
   symbol, and an empty username;
5. the old `assign_customer_onboarding` function is gone (or, on an older
   database, still not callable by `anon`).

Each probe that tries to write is designed to fail, so nothing is inserted. If
a probe unexpectedly succeeds, the script prints the row id and the `delete`
statement to clean it up.

### 2.5 Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `PGRST205` / "relation public.customer_onboarding does not exist" | the SQL was never run | run `db/customer_onboarding.sql` in the SQL Editor |
| `PGRST204` / "Could not find the 'connection_valid_until' column" | the live table comes from an earlier draft | re-run the current `db/customer_onboarding.sql`; section 1b upgrades it in place |
| `401` / `403` / `42501` on insert | the column grant is missing, or the policy was dropped | re-run the grants/policy block in `db/customer_onboarding.sql` |
| "Onboarding backend is not configured" banner | `.env` is missing or still has placeholders | set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, restart `npm run dev` |
| Insert returns `23505` | the username or user ID is already registered | check the details the customer was given |
| Insert returns `23514` | a value violates a CHECK constraint | check the field against §5.1 |

> The publishable key is safe to expose; the table's permissions are what stop
> abuse. Note that RLS cannot stop a script from submitting **valid** rows —
> see §6.4.

---

## 3. Local development

```bash
npm install
npm run dev
```

Routes: `/` (product page), `/checkout`, `/order-success`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm test` | CSV export + onboarding rule tests (no network) |
| `npm run verify:onboarding` | Live permission check against `.env` |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | ESLint |
| `npm run build` | Type-check + production build |

---

## 4. Vercel deployment

1. Import the repo into Vercel.
2. Build command `npm run build`, output directory `dist` (Vite defaults).
3. Add environment variables under **Project → Settings → Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Redeploy after changing environment variables (Vite inlines them at build
   time).

`vercel.json` rewrites all paths to `index.html` so the client-side routes
resolve on a hard refresh.

---

## 5. Customer onboarding

### 5.1 What the form collects

| Field | Required | Notes |
| --- | --- | --- |
| Full name | yes | 2–120 characters |
| Email address | yes | Valid shape, at most 254 characters; stored lower-cased |
| Phone number | yes | Shape only; never rewritten. Used for the confirmation call |
| Address line 1 | yes | 2–200 characters |
| Address line 2 | no | At most 200 characters; stored as `NULL` when blank |
| City | yes | At most 120 characters |
| State / Region | yes | At most 120 characters |
| Postal / ZIP code | yes | Shape only, at most 20 characters; `SW1A 1AA` is preserved |
| Country | yes | At most 80 characters |
| Username | yes | 1–64 characters; must be unique (matched case-insensitively) |
| User ID | yes | 1–20 letters or digits; case and leading zeros preserved; must be unique |
| Confirmation code | yes | Exactly 3 digits, sent from a text field so `007` keeps its zero |
| Connection valid until | yes | `MM/YYYY`, e.g. `11/2030`; stored as text, never a timestamp |

The four account details are the values the team already issued to the
customer before checkout. The form **collects** them, validates their shape and
stores them unchanged; it never generates, derives or rewrites them. The
connection expiry is a month/year string, not a duration: the old `18 months`
field is gone.

There is **no** card number, card expiry, CVV, PIN, password or bank field
anywhere in the application, so those credentials cannot be entered,
transmitted or stored. The confirmation code is an account identifier issued
by the team, not a one-time password and not a login secret.

### 5.2 Where the row goes

The browser generates a UUID (`crypto.randomUUID()`), inserts one row into
`public.customer_onboarding` with the publishable key, and navigates to
`/order-success?ref=<uuid>`. The payload contains the contact/address fields
and the four account fields above. PostgREST names every payload key as an
INSERT column, so each of them is explicitly listed in the anon column grant.

The insert uses `Prefer: return=minimal`. This matters: without it, PostgREST
runs `INSERT … RETURNING`, which requires a `SELECT` privilege the browser does
not have, and the insert would fail with a permission error.

### 5.3 Where the account details come from

The customer receives the username, user ID, confirmation code and expiry from
the team before opening checkout, and types them into the form. Nothing is
filled in afterwards, so there is no assignment step and no service-role
function to call.

To check what a customer submitted, use the **Table Editor** or the SQL Editor
as the project owner:

```sql
select id, full_name, email, phone,
       username, external_user_id, confirmation_code, connection_valid_until,
       created_at
from public.customer_onboarding
order by created_at desc;
```

The confirmation screen shows the reference, the submitted identifiers, the
valid-until month and the phone number, and offers the local CSV copy for
download. Correcting a typo is a normal `UPDATE` by the project owner; the
browser has no write path after the initial insert.

### 5.4 The local CSV copy

After a successful insert, the browser renders a summary CSV
(`onboarding-request-<reference>-<timestamp>.csv`) and downloads it. It has nine
columns: submitted at, reference, full name, email, phone, username, user ID,
confirmation code and valid until. It is generated **locally**: RFC 4180
quoting, embedded quotes doubled, and a formula-injection guard (a value
starting with `=`, `+`, `-`, `@`, TAB or CR is prefixed with a single quote). A
leading `+` on an international phone number is therefore written as `'+1 …` so
a spreadsheet shows it as text instead of evaluating it.

The file is a copy for the customer, not a second store — nothing is uploaded
from the browser. It is also kept in `sessionStorage` for this tab so the
confirmation screen can offer the download again.

---

## 6. Security model

### 6.1 What the browser can do

| Operation | Browser (`anon`) |
| --- | --- |
| `INSERT` one complete onboarding row | **allowed** (subject to the CHECK constraints) |
| `SELECT` any row | denied (no grant, no policy) |
| `UPDATE` / `DELETE` any row | denied (no grant, no policy) |
| Omit or null an account identifier | denied (`not null` constraint) |
| Call `assign_customer_onboarding` | impossible (the function no longer exists) |

Defence in depth:

1. **Grants** — `revoke all` removes Supabase's default access, then
   `grant insert (id, …, connection_valid_until)` allow-lists exactly the 14
   columns the form submits.
2. **RLS** — the insert policy applies only to the `anon` role, and the CHECK
   constraints below validate every submitted value.
3. **CHECK constraints** — length/shape rules mirror the form, so a
   hand-crafted request cannot store invalid data: the expiry must be a real
   `MM/YYYY` month, the code exactly three digits, the user ID 1–20
   alphanumeric characters.
4. **No read path** — there is no `SELECT` policy, and the insert avoids
   `RETURNING` via `Prefer: return=minimal`, so a customer can never read
   another customer's row.
5. **Uniqueness** — `username` (case-insensitively) and `external_user_id` are
   unique, so a duplicate submission is rejected with `23505`.

`force row level security` is deliberately **not** used: the table owner
(`postgres`) and `service_role` keep their read/update path for support work.

### 6.2 What the browser never holds

Only the Supabase **publishable** key (`sb_publishable_…`) reaches the build.
The `service_role`/secret key is never referenced by the frontend, and the
client disables session persistence (`persistSession: false`), so no auth token
is written to storage.

### 6.3 No credentials are collected

The schema has no column for a card number, card expiry, CVV, PIN, bank
account, password or one-time code, and the browser's row type does not contain
such a field. The username, user ID, confirmation code and expiry are account
identifiers the team issued, not credentials: they authenticate nothing and
unlock nothing. A future UI change cannot silently start storing a card number:
the insert would fail with `42501` because the column is not in the grant (and
would not exist).

### 6.4 Why a direct insert, and what it does not solve

An Edge Function is the stronger design, but it adds a deploy target, a secret
and a second copy of the validation rules for a form that stores thirteen
customer-supplied fields. A direct insert with a narrow grant, RLS and CHECK
constraints is proportionate here, and it is **honest about its limit**:

- **RLS authorises; it does not rate-limit.** Anyone with the publishable key
  (it is public by design) can submit **valid** rows in a loop. The database
  will reject malformed writes, but not a well-formed spam entry.
- Mitigations available without changing the architecture: Supabase's
  built-in rate limiting / abuse protection on the API, a per-IP limit at the
  CDN/WAF, and deleting obvious spam rows.
- If spam becomes a real problem, add a verification step in front of the
  insert: a Cloudflare Turnstile widget plus a small Edge Function that verifies
  the token with the secret key and then inserts. The table and its constraints
  stay exactly as they are; only the write path moves. Nothing in this
  repository pretends that RLS alone prevents spam.

There is no payment in this flow at all, so there is no payment secret to
protect and no provider integration to verify.

---

## 7. Testing checklist

Automatic:

1. `npm test` — CSV escaping, formula guard, expiry/user-ID/code rules, row
   shape, identifier preservation, error mapping.
2. `npm run typecheck`, `npm run lint`, `npm run build` — all clean.
3. `node scripts/verify-onboarding.mjs` — every check **PASS** against the real
   project (§2.4).

Manual, in the browser:

1. **Buy Now** opens `/checkout` with the item, variant and quantity.
2. **Add to Cart** updates the header count and opens the cart drawer; the cart
   persists across reloads; quantities can change and items can be removed.
3. **Proceed to Checkout** from the cart includes the correct product/quantity.
4. Empty fields show inline errors and block submission; `13/2030`, `11/30`,
   a 2-digit code, a 21-character user ID and a user ID with `-` are rejected;
   `11/2030`, `007` and `0012AbCd` are accepted and stored exactly.
5. The displayed price is exactly **$100.00**.
6. Submitting writes exactly one row to `public.customer_onboarding`, with the
   username, user ID, confirmation code and valid-until month the customer
   typed.
7. In the **Table Editor** (service role), the row contains what was typed —
   including `SW1A 1AA`, `+1 (555) 010-9999`, `0012AbCd` and `007`.
8. With the publishable key, `GET /rest/v1/customer_onboarding?select=*` returns
   `401/403/42501` — **no rows, no schema leak of data**.
9. A hand-crafted insert with `"confirmation_code": "12"` is rejected with
   `23514`; a repeated username is rejected with `23505`.
10. `/order-success?ref=…` shows the reference, the identifiers, the valid-until
    month and the phone number, and the CSV download works (or shows the
    blocked-download message).
11. A double-click on **Submit request** produces a single row.
12. Stopping the database / using a wrong URL shows an error, never a false
    success.
13. Layouts work at mobile (< 640px), tablet (~768px) and desktop (≥ 1024px).

---

## 8. What was removed

The previous project (and its local `supabase/` folder) is gone. The
orders/payments backend was removed with it:

| Removed | Replacement |
| --- | --- |
| `supabase/migrations/*` (orders, order items, billing, profiles) | `db/customer_onboarding.sql` |
| `supabase/functions/create-order`, `get-order`, `confirm-demo-payment`, `complete-onboarding`, `save-billing-details` | one direct `INSERT` into `public.customer_onboarding` |
| `src/lib/orders.ts` (Edge Function calls) | `src/lib/onboarding.ts` |
| `src/lib/orderAccess.ts` (capability tokens) | — (nothing to read back) |
| `src/lib/functionError.ts` | `describeSubmissionError()` in `src/lib/onboarding.ts` |
| `src/lib/paymentCard.ts`, `PaymentDetailsForm.tsx`, `billingDetails.ts`, `BillingDetailsForm.tsx` | customer-only onboarding form |
| `src/lib/googleSheets.ts`, `google-apps-script/` | Supabase is the only store |
| `VITE_PAYMENT_MODE`, `VITE_GOOGLE_SHEETS_ENDPOINT` | `VITE_SUPABASE_PUBLISHABLE_KEY` (a legacy `VITE_SUPABASE_ANON_KEY` is still accepted) |
| `public.orders`, `public.order_items`, `public.customer_profiles`, `public.payment_billing_details` | `public.customer_onboarding` |

There is no card-number, expiry, CVV or PIN input, no card-validation rule and
no card-shaped payload field anywhere in the repository.
