# amazon — iPhone Pro Max demo storefront

A React + Vite + TypeScript + Tailwind CSS demo storefront with a complete,
responsive guest checkout flow and a customer onboarding step. Orders and
customer accounts are stored in **Supabase** (Postgres + Edge Functions).

- **Product:** Apple iPhone 17 Pro Max 256 GB (Cosmic Orange)
- **Price:** **$100.00 USD** (stored everywhere as `10000` integer cents)
- **Payment:** **DEMO only** — simulated, clearly labelled, no real charge
- **Checkout:** `/checkout` (guest, no card details, no payment credentials)
- **Onboarding:** a customer account is created on the checkout page
- **Confirmation:** `/order-success` (server-verified)

> This is an unaffiliated demo interface. It does not use, embed, or redirect to
> Amazon checkout. The reference URL was used for visual inspiration only.

---

## 1. What is in the repository

### Frontend

| File | Purpose |
| --- | --- |
| `src/lib/supabase.ts` | Reusable Supabase browser client + config check |
| `src/lib/orders.ts` | Typed calls to the Edge Functions |
| `src/lib/onboarding.ts` | Onboarding rules, payload builder, session store for the issued reference |
| `src/lib/functionError.ts` | Structured error for a rejected Edge Function call |
| `src/lib/orderAccess.ts` | Per-order capability-token store (sessionStorage) |
| `src/lib/buyNow.ts` | Separate Buy Now checkout payload (sessionStorage) |
| `src/lib/catalog.ts` | Client mirror of the product (never authoritative for price) |
| `src/lib/validation.ts` | Contact + shipping form validation + inline errors |
| `src/lib/format.ts` | `formatCents()` for integer-cent money |
| `src/data/product.ts` | Product copy, price and storefront identity |
| `src/data/media.ts` | Single source of truth for uploaded image priority order |
| `src/state/cart.ts`, `src/state/CartProvider.tsx` | localStorage-backed cart |
| `src/pages/ProductPage.tsx` | Existing PDP, moved out of `App.tsx` |
| `src/pages/CheckoutPage.tsx` | Checkout + onboarding with two-column responsive layout |
| `src/pages/OrderSuccessPage.tsx` | Success / pending screen |
| `src/components/cart/CartDrawer.tsx` | Slide-over cart with qty + remove |
| `src/components/checkout/*` | Header, form field, order summary, onboarding form |
| `src/lib/csvExport.ts` | Local CSV copy of the account summary — RFC 4180 escaping + formula-injection guard |
| `src/App.tsx` | Router (`/`, `/checkout`, `/order-success`) |

### Backend (Supabase)

| File | Purpose |
| --- | --- |
| `supabase/migrations/20260101000000_init_checkout.sql` | Tables, indexes, constraints, RLS, atomic order-creation RPC |
| `supabase/migrations/20261021000000_payment_billing_details.sql` | **Deprecated** — the old card-form table, kept so its rows are not destroyed (§2.6) |
| `supabase/migrations/20261022000000_customer_onboarding.sql` | `customer_profiles` (onboarding records, backend-issued customer reference, RLS) |
| `supabase/functions/create-order/index.ts` | Trusted order creation (server-side pricing + idempotency) |
| `supabase/functions/get-order/index.ts` | Capability-token order lookup |
| `supabase/functions/confirm-demo-payment/index.ts` | DEMO payment confirmation (only writer of `paid`/`confirmed`) |
| `supabase/functions/complete-onboarding/index.ts` | Creates the customer account; issues the customer reference; rejects card/credential fields |
| `supabase/functions/_shared/*` | CORS, authoritative catalog, serialization |
| `supabase/config.toml` | Disables JWT verification for the guest-facing functions |
| `scripts/verify-onboarding.mjs` | Post-deploy check of the function, the table and the onboarding endpoint (no dependencies) |
| `scripts/test-csv-export.mjs` | Tests for the CSV escaping and the formula-injection guard |
| `scripts/test-onboarding.mjs` | Tests for the onboarding rules and the request payload |
| `vercel.json` | SPA rewrites so `/checkout` and `/order-success` deep-link correctly |
| `.env.example` | Environment variable placeholders (no secrets) |

---

## 2. Supabase setup

### 2.1 Create the project

1. Create a project at <https://supabase.com/dashboard>.
2. Note the **Project URL** and **publishable/anon key** (Project Settings → API).

### 2.2 Run the SQL migrations

Open **SQL Editor → New query**, paste the contents of each file in
`supabase/migrations/` (in filename order), and run it:

1. `20260101000000_init_checkout.sql`
2. `20261021000000_payment_billing_details.sql` — deprecated, only needed if
   the old table is not in your database yet
3. `20261022000000_customer_onboarding.sql` ← **the onboarding table**

This creates:

- `public.orders` and `public.order_items` with integer-cent money columns,
  status/amount constraints and indexes on order number, creation date and the
  order-item foreign key.
- `public.customer_profiles` — one onboarding record per order, with a
  **database-generated** `customer_reference`, a unique `username`, the
  optional birth month/year, and the `verification_status` /
  `verified_at` / `verification_reference` columns.
- Row Level Security **enabled with no policies**, so anonymous users have **no**
  direct access. Reads/writes happen only through Edge Functions using the
  service-role key.
- `public.create_order_with_items(...)` — a `SECURITY DEFINER` function that
  inserts the order and its items atomically, enforces idempotency and generates
  the order number server-side. Execute is granted to `service_role` **only**.

> Or, with the Supabase CLI: `supabase db push` (after `supabase link`).

### 2.3 Deploy the Edge Functions

#### Option A — Supabase CLI (recommended)

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>

supabase functions deploy create-order
supabase functions deploy get-order
supabase functions deploy confirm-demo-payment
supabase functions deploy complete-onboarding
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically into
deployed functions — you do not set them yourself. **Never** put the
service-role key in frontend code or in `.env` files used by Vite.

DEMO mode is the default. Do **not** set `PAYMENT_PROVIDER` unless you have
integrated a real provider (see §6).

#### Option B — Supabase Dashboard (no CLI required)

1. Open the project → **Edge Functions** → **Deploy a new function**.
2. Choose **Via Editor**.
3. Set the function name to `complete-onboarding` exactly.
4. Delete the template contents and paste the whole of
   `supabase/functions/complete-onboarding/index.ts`.
5. Click **Deploy function**. Deployment usually takes 10–30 seconds.
6. Open the function's **detail tab** and turn **Verify JWT** **OFF**.
   The frontend calls this endpoint as an anonymous guest, and the function
   does its own authorisation with the per-order capability token — exactly
   like `get-order` and `confirm-demo-payment`. This matches
   `verify_jwt = false` in `supabase/config.toml`.
   > Known issue: the **Verify JWT** toggle sometimes resets to **ON** after a
   > deploy. Always re-check it *after* deploying, and confirm it is off
   > before testing. If it is on, the browser's `OPTIONS` preflight is
   > rejected with `401 Missing authorization header` and you get a CORS
   > error even though the function is deployed correctly.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform
for Dashboard-deployed functions too — you do not add them as secrets.

> `complete-onboarding` imports `../_shared/cors.ts` and `../_shared/order.ts`.
> The Dashboard editor can host those files too (add them under the function
> folder), but the CLI path above is simpler.

### 2.4 Frontend environment variables

```bash
cp .env.example .env
```

Fill in:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
VITE_PAYMENT_MODE=demo
```

Only the Supabase **anon/publishable** key may exist in the frontend. The
service-role key lives exclusively in the Edge Function environment.

> `VITE_GOOGLE_SHEETS_ENDPOINT` is **no longer read** — the Google Sheets
> integration has been removed (§9). Delete it from your local `.env` and from
> the Vercel environment variables; it is simply ignored, but leaving it
> around suggests a storage path that no longer exists.

### 2.5 Troubleshooting: onboarding missing in Supabase

| Symptom | Cause | Fix |
| --- | --- | --- |
| UI says *"Could not reach the Supabase Edge Function … complete-onboarding"* (DevTools shows a CORS / `TypeError: Failed to fetch`) | `complete-onboarding` is not deployed. The gateway answers the `OPTIONS` preflight with **404**, and a failed preflight makes the browser report a CORS error and hide the real reason. | deploy `complete-onboarding` — see §2.3 Option A (CLI) or Option B (Dashboard) |
| UI says *"…relation \"public.customer_profiles\" does not exist"* (or PGRST205) | the third migration was never run | run `supabase/migrations/20261022000000_customer_onboarding.sql` in the SQL Editor |
| UI says *"…Missing authorization header"* (401) on a *preflight* | **Verify JWT** was left **ON** for the function | turn the **Verify JWT** toggle off in the Dashboard function settings (or deploy with `--no-verify-jwt`) |
| UI says *"That username is already taken."* | another customer already chose that username | pick a different one — usernames are unique |

The table has RLS enabled with no policies and its anon grants revoked, so it
will always look "empty" when queried directly with the anon key — rows are
only written by the Edge Function (service role) and can only be seen in the
Table Editor or with the service-role key.

> **Diagnostic shortcut:** the browser hides the real error, so test the
> preflight yourself. `curl -i -X OPTIONS \
>   https://<project-ref>.supabase.co/functions/v1/complete-onboarding \
>   -H "Origin: http://localhost:5173" \
>   -H "Access-Control-Request-Method: POST" \
>   -H "Access-Control-Request-Headers: content-type,apikey,authorization"`
>
> A working function answers **200** with `access-control-allow-headers` that
> includes `content-type` and an `access-control-allow-methods` header. A
> missing function answers **404** with `sb-error-code: NOT_FOUND`.

### 2.6 Optional cleanup of the old billing-details table

`public.payment_billing_details` came from the **removed** card form. Nothing
writes to it any more and the `save-billing-details` Edge Function has been
deleted from this repository — but the **table and its rows are still there**,
because dropping a table destroys data.

The table is marked deprecated by the new migration. When you no longer need
the rows, remove it:

```sql
-- 1. Look at what would be lost (do this first).
select count(*) from public.payment_billing_details;
select * from public.payment_billing_details limit 20;

-- 2. Only when that data is confirmed to be unneeded — THIS DROWS ROWS.
--    Take a backup first.
drop table if exists public.payment_billing_details;
```

Also delete the old Edge Function in the dashboard if it is still deployed:
**Edge Functions → `save-billing-details` → Delete**. It is not called by
anything, and leaving a card-shaped endpoint deployed is needless attack
surface.

### 2.7 Verify the deployment

Once the migration has been run and the function deployed, check the whole path
in one command:

```bash
node scripts/verify-onboarding.mjs
# or: npm run verify:onboarding
```

It reads `.env`, uses only the **anon** key (exactly like the browser) and
checks, in order:

1. the `OPTIONS` preflight (200 + CORS headers),
2. that `public.customer_profiles` exists,
3. that a test order can be created,
4. that `complete-onboarding` creates the account and issues a customer
   reference of the shape `CUST-XXXXXXXXXX`,
5. that the record starts as `pending_review`,
6. that a **retry** returns the **same** customer reference (idempotent),
7. that a body containing `cardNumber` / `cvv` / `otp` is rejected with `400`,
8. that a wrong access token is rejected with `404 "Order not found."`,
9. that replaying the order with the same `idempotency_key` returns the **same**
   order, so a retry never creates a second order.

It stops after step 2 if the function or the table is missing, so it does not
create a test order while the endpoint is still broken. Once the endpoint
works, steps 3 and 9 create one throw-away order in your database (customer
*Opencode Verifier*) — check it with the Table Editor if you want to remove it.

To test an order you already have instead of creating one:

```bash
node scripts/verify-onboarding.mjs \
  --order SF-20261021-B6564D6C \
  --token a1bbc7d5-e379-4052-a74e-4204c4313afd
```

---

## 3. Local development

```bash
npm install
npm run dev
```

Routes: `/` (product page), `/checkout`, `/order-success`.

---

## 4. Vercel deployment

1. Import the repo into Vercel.
2. Build command `npm run build`, output directory `dist` (Vite defaults).
3. Add environment variables under **Project → Settings → Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_PAYMENT_MODE` (`demo`)
4. Redeploy after changing environment variables (Vite inlines them at build time).

`vercel.json` already rewrites all paths to `index.html` so the client-side
routes resolve on a hard refresh.

---

## 5. Customer onboarding

### 5.1 What the form collects

| Field | Required | Notes |
| --- | --- | --- |
| Full name | yes | |
| Email address | yes | Must match the email the order was created with |
| Phone number | yes | Used for the confirmation call |
| Address line 1 / 2, city, region, postal code, country | yes / line 2 optional | Delivery address |
| Username | yes | Letters and numbers only, 3–32 characters. Lowercased. |
| Customer reference | **no — read-only** | Issued by the database, never typed |
| Birth month + year | **no — optional** | Only stored when the customer provides it |

There is **no** card number, expiry date, CVV, PIN, password or one-time code
field anywhere in the application, so those credentials cannot be entered,
transmitted or stored.

### 5.2 The customer reference

`customer_profiles.customer_reference` has a **database default**
(`CUST-` + 10 hex characters). The reference is therefore:

- generated by the trusted backend, never by the customer;
- not part of the request payload — `complete-onboarding` ignores any such
  field, because the body is allow-listed;
- stable across retries, because the record is unique per order.

It is a public reference for support conversations, **not** a credential.

### 5.3 How an account is confirmed

There is **no automated verification** in this application. A new account is
written with `verification_status = 'pending_review'` and `verified_at = null`,
and your team confirms it by phone.

Consequently:

- the application never claims that a verification message was sent — there is
  no messaging integration and it never pretends otherwise;
- no one-time code, verification code, password or authentication secret is
  accepted, stored or logged; there is no column for one;
- the **username is a label, not proof of account ownership**. It never grants
  access to anything, and it is not treated as an identity by the backend.

To record a confirmation, update the row (service role / Table Editor):

```sql
update public.customer_profiles
set verification_status = 'confirmed',
    verified_at = now(),
    verification_reference = 'CALL-2026-10-22-0142'
where customer_reference = 'CUST-4F2A9C1B7D';
```

`verification_reference` holds a non-sensitive pointer to the confirmation
(ticket or call-log id) — never the content of a conversation.

### 5.4 The local CSV copy

After a successful onboarding, the browser renders a summary CSV
(`account-details-<CUST-…>.csv`) and offers it as a download. It is generated
**locally**: RFC 4180 quoting, embedded quotes doubled, and a formula-injection
guard (a value starting with `=`, `+`, `-` or `@` is prefixed with a single
quote). It is a copy for the customer, not a second store — nothing is
uploaded from the browser.

---

## 6. Payment

No real payment provider is configured in this repository, and the checkout form
does not collect payment credentials at all. Checkout runs in **DEMO mode**:

- The order is created with `order_status = pending_payment` and
  `payment_status = pending`.
- There is no payment form. The panel that used to ask for a cardholder name
  and a billing ZIP now asks for the **customer account** details (§5).
- On submit, the permitted details are written to **Supabase** by the
  `complete-onboarding` Edge Function, and a **local CSV copy** is downloaded to
  the user's own device.
- Clicking **Pay $100.00** calls `confirm-demo-payment`, which is the **only**
  code path that sets `payment_status = paid` / `order_status = confirmed`.
- The success tick on `/order-success` is rendered only when the server reports
  `paid` + `confirmed`. Otherwise the page shows
  **“Order created — payment pending.”**

### Integrating a real provider later

1. Set `PAYMENT_PROVIDER` (e.g. `stripe`) and the provider secret via
   `supabase secrets set ...`. `confirm-demo-payment` will then refuse to run.
2. Create the payment intent/session server-side, keyed to the order.
3. Add a **webhook** Edge Function that verifies the provider signature and,
   only after verified confirmation, updates `payment_status = paid` /
   `order_status = confirmed`.
4. Add a hosted payment element to `src/pages/CheckoutPage.tsx`.
   Until such a provider exists, the form must stay credential-free: raw card
   numbers, CVVs and PINs are never sent to Supabase or any other server, never
   stored and never logged.

---

## 7. Security model

- The browser never determines price, totals, product details, order number,
  customer reference or statuses — `create-order` recomputes the first three
  from its server-side catalog and the database generates the reference.
- RLS denies all anonymous/authenticated direct table access.
- Guests are not required to create an Auth account.
- Order lookup requires the per-order opaque **capability token** returned once
  at creation (`get-order` / `confirm-demo-payment` / `complete-onboarding`).
- `customer_profiles` holds only the onboarding details listed in §5.1. RLS is
  enabled with **no policies**, and the `anon` / `authenticated` table grants
  are revoked, so only the Edge Function (service role) can write. Its
  `order_id` is unique, making repeated submissions idempotent.
- `complete-onboarding` **allow-lists** its request body
  (`orderNumber`, `accessToken`, `username`, `fullName`, `email`, `phone`,
  `birthMonth`, `birthYear`, `addressLine1`, `addressLine2`, `city`, `region`,
  `postalCode`, `country`). Any other key — a card number, CVV, PIN, expiry, a
  one-time code, a password, a customer reference — is rejected with `400`
  *before* a database write is attempted, so a credential cannot be stored
  even if a future client change starts sending one.
- The customer reference is **not** accepted from the client. It is produced by
  the database default, so it cannot be chosen or forged.
- The client-side rules are mirrored server-side (the Edge Function) and a
  third time in the database (CHECK constraints), so a hand-crafted request
  cannot store a shape the UI would not produce.
- The username is unique and is treated as a label, never as proof of account
  ownership (§5.3).
- The birth month and year are nullable and are only stored when supplied;
  they are never used as an identity factor.
- The frontend holds **no** credential: only the Supabase *anon* key (safe by
  design). The service-role key lives in the Edge Function environment and
  never reaches the browser.
- Every value in the local CSV is quoted, and a value that starts with `=`,
  `+`, `-` or `@` is additionally prefixed with a single quote — a submitted
  text can never execute as a spreadsheet formula.
- Repeated submissions of the same checkout reuse one `idempotency_key`, so the
  database returns the existing order instead of creating a duplicate, and the
  unique `order_id` on `customer_profiles` returns the existing account instead
  of creating a second one.
- Database errors are returned as non-2xx responses; the UI shows the error and
  never a false success.

---

## 8. Testing checklist

Manual verification:

1. **Buy Now** opens `/checkout` with the item, variant and quantity.
2. **Add to Cart** updates the header count and opens the cart drawer; the cart
   persists across reloads; quantities can change and items can be removed.
3. **Proceed to Checkout** from the cart includes the correct product/quantity.
4. Empty/invalid form fields show inline errors and block submission —
   including the onboarding fields (username 3–32 letters/numbers, month and
   year either both empty or both filled, year within 1900…current year).
5. The displayed price is exactly **$100.00**.
6. Changing a client price in dev tools does not change the server total.
7. Orders and order items appear in the `orders` / `order_items` tables.
8. Stopping the Edge Function / breaking the DB shows an error, not success.
9. Double-clicking **Pay $100.00** creates a single order **and** a single
   customer account.
10. The green tick appears only after a successful server confirmation.
11. Layouts work at mobile (< 640px), tablet (~768px) and desktop (≥ 1024px).
12. `npm run build` passes.
13. After checkout, `customer_profiles` contains one row with a
    `customer_reference` of the shape `CUST-XXXXXXXXXX`, a `username` matching
    what was typed, `verification_status = 'pending_review'` and
    `verified_at = null`.
14. The username field rejects characters that are not letters or numbers.
15. Leaving the birth month and year empty stores `NULL` in both columns.
16. A request body containing `cardNumber`, `cvv` or `otp` is rejected by
    `complete-onboarding` with `400` and nothing is written.
17. The same checkout submitted twice returns the same customer reference and
    does not create a second row.
18. The customer reference field is read-only and shows “Assigned when you
    submit” before the form is submitted.
19. The confirmation screen shows the issued customer reference.
20. `npm test` passes (CSV escaping + the onboarding rules and payload).
21. The Supabase path works: `node scripts/verify-onboarding.mjs` reports every
    check as **PASS** (see §2.7).

---

## 9. What was removed

The credit-card functionality has been removed end to end:

| Removed | Replacement |
| --- | --- |
| `src/lib/paymentCard.ts` (brand detection, Luhn, expiry/CVV formatting) | — |
| `src/components/checkout/PaymentDetailsForm.tsx` (card form) | — |
| `src/lib/billingDetails.ts` (cardholder name + billing ZIP rules) | `src/lib/onboarding.ts` (username + optional birth month/year) |
| `src/components/checkout/BillingDetailsForm.tsx` | `src/components/checkout/OnboardingForm.tsx` |
| `src/lib/googleSheets.ts` + `google-apps-script/` + the Sheet write path | `supabase/functions/complete-onboarding/index.ts` (Supabase is the only store) |
| `supabase/functions/save-billing-details/index.ts` | `supabase/functions/complete-onboarding/index.ts` |
| `scripts/verify-save-billing-details.mjs` | `scripts/verify-onboarding.mjs` |
| `scripts/test-sheet-submission.mjs`, `scripts/test-apps-script.mjs` | `scripts/test-onboarding.mjs` |
| `VITE_GOOGLE_SHEETS_ENDPOINT` | — |
| `public.payment_billing_details` writes | `public.customer_profiles` (the old table is kept, deprecated — §2.6) |

There is no card-number, expiry, CVV or PIN input, no card-validation rule and
no card-shaped payload field anywhere in the repository.
