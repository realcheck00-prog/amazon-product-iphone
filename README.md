# amazon — iPhone Pro Max demo storefront

A React + Vite + TypeScript + Tailwind CSS demo storefront with a complete,
responsive guest checkout flow backed by Supabase (Postgres + Edge Functions).

- **Product:** Apple iPhone 17 Pro Max 256 GB (Cosmic Orange)
- **Price:** **$100.00 USD** (stored everywhere as `10000` integer cents)
- **Payment:** **DEMO only** — simulated, clearly labelled, no real charge
- **Checkout:** `/checkout` (guest, no account required)
- **Confirmation:** `/order-success` (server-verified)

> This is an unaffiliated demo interface. It does not use, embed, or redirect to
> Amazon checkout. The reference URL was used for visual inspiration only.

---

## 1. What was added

### Frontend

| File | Purpose |
| --- | --- |
| `src/lib/supabase.ts` | Reusable Supabase browser client + config check |
| `src/lib/orders.ts` | Typed calls to the Edge Functions |
| `src/lib/orderAccess.ts` | Per-order capability-token store (sessionStorage) |
| `src/lib/buyNow.ts` | Separate Buy Now checkout payload (sessionStorage) |
| `src/lib/catalog.ts` | Client mirror of the product (never authoritative for price) |
| `src/lib/validation.ts` | Checkout form validation + inline errors |
| `src/lib/format.ts` | Added `formatCents()` for integer-cent money |
| `src/data/media.ts` | Single source of truth for uploaded image priority order |
| `src/state/cart.ts`, `src/state/CartProvider.tsx` | localStorage-backed cart |
| `src/pages/ProductPage.tsx` | Existing PDP, moved out of `App.tsx` |
| `src/pages/CheckoutPage.tsx` | Checkout with two-column responsive layout |
| `src/pages/OrderSuccessPage.tsx` | Success / pending screen |
| `src/components/cart/CartDrawer.tsx` | Slide-over cart with qty + remove |
| `src/components/checkout/*` | Header, form field, order summary, payment-details form |
| `src/lib/paymentCard.ts` | Card brand detection, MM/YY + CVV + ZIP formatting/validation (client-only) |
| `src/App.tsx` | Router (`/`, `/checkout`, `/order-success`) |

### Backend (Supabase)

| File | Purpose |
| --- | --- |
| `supabase/migrations/20260101000000_init_checkout.sql` | Tables, indexes, constraints, RLS, atomic order-creation RPC |
| `supabase/migrations/20261021000000_payment_billing_details.sql` | Non-sensitive billing metadata table (name + ZIP + timestamp), RLS |
| `supabase/functions/create-order/index.ts` | Trusted order creation (server-side pricing + idempotency) |
| `supabase/functions/get-order/index.ts` | Capability-token order lookup |
| `supabase/functions/confirm-demo-payment/index.ts` | DEMO payment confirmation (only writer of `paid`/`confirmed`) |
| `supabase/functions/save-billing-details/index.ts` | Saves cardholder name + billing ZIP (never card number/CVV) |
| `supabase/functions/_shared/*` | CORS, authoritative catalog, serialization |
| `supabase/config.toml` | Disables JWT verification for the guest-facing functions |
| `scripts/verify-save-billing-details.mjs` | Post-deploy check of the function, the table and the billing endpoint (no dependencies) |
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
2. `20261021000000_payment_billing_details.sql`

This creates:

- `public.orders` and `public.order_items` with integer-cent money columns,
  status/amount constraints and indexes on order number, creation date and the
  order-item foreign key.
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
supabase functions deploy save-billing-details
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically into
deployed functions — you do not set them yourself. **Never** put the
service-role key in frontend code or in `.env` files used by Vite.

DEMO mode is the default. Do **not** set `PAYMENT_PROVIDER` unless you have
integrated a real provider (see §5).

#### Option B — Supabase Dashboard (no CLI required)

Use this when you cannot run `supabase login`. Only `save-billing-details`
is documented here, because it is the function the Dashboard editor can host
without any shared-file imports.

1. Open the project → **Edge Functions** → **Deploy a new function**.
2. Choose **Via Editor**.
3. Set the function name to `save-billing-details` exactly.
4. Delete the template contents and paste the whole of
   `supabase/functions/save-billing-details/index.ts`.
   That file is **self-contained** — it inlines its own CORS headers and
   helpers instead of importing `../_shared/*`, because the Dashboard editor
   cannot resolve relative imports of sibling files.
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

> If you later deploy the other three functions from the Dashboard, they
> import `../_shared/cors.ts` and `../_shared/order.ts`. The Dashboard editor
> can host those files too (add them under the function folder), but the CLI
> path above is simpler for them.

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

### 2.5 Troubleshooting: form submissions missing in Supabase

The checkout writes billing metadata through two pieces of infrastructure.
If **either** is missing, nothing appears in the table:

| Symptom | Cause | Fix |
| --- | --- | --- |
| UI says *"Your billing details were NOT saved: Could not reach the Supabase Edge Function … save-billing-details"* (DevTools shows a CORS / `TypeError: Failed to fetch`) | `save-billing-details` is not deployed. The gateway answers the `OPTIONS` preflight with **404**, and a failed preflight makes the browser report a CORS error and hide the real reason. | deploy `save-billing-details` — see §2.3 Option A (CLI) or Option B (Dashboard) |
| UI says *"Your billing details were NOT saved: Requested function was not found"* (seen outside the browser, e.g. curl) | same as above | same as above |
| UI says *"…relation \"public.payment_billing_details\" does not exist"* (or PGRST205) | the second migration was never run | run `supabase/migrations/20261021000000_payment_billing_details.sql` in the SQL Editor |
| UI says *"…Missing authorization header"* (401) on a *preflight* | **Verify JWT** was left **ON** for the function | turn the **Verify JWT** toggle off in the Dashboard function settings (or deploy with `--no-verify-jwt`) |

Both infrastructure pieces are required. The table has RLS enabled with no
policies and its anon grants revoked, so it will always look "empty" when
queried directly with the anon key — rows are only written by the Edge Function
(service role) and can only be seen in the Table Editor or with the
service-role key.

> **Diagnostic shortcut:** the browser hides the real error, so test the
> preflight yourself. `curl -i -X OPTIONS \
>   https://<project-ref>.supabase.co/functions/v1/save-billing-details \
>   -H "Origin: http://localhost:5173" \
>   -H "Access-Control-Request-Method: POST" \
>   -H "Access-Control-Request-Headers: content-type,apikey,authorization"`
>
> A working function answers **200** with `access-control-allow-headers` that
> includes `content-type` and an `access-control-allow-methods` header. A
> missing function answers **404** with `sb-error-code: NOT_FOUND`.

### 2.6 Verify the deployment

Once the migration has been run and the function deployed, check the whole path
in one command:

```bash
node scripts/verify-save-billing-details.mjs
# or: npm run verify:billing
```

It reads `.env`, uses only the **anon** key (exactly like the browser) and
checks, in order:

1. the `OPTIONS` preflight (200 + CORS headers),
2. that `public.payment_billing_details` exists,
3. that a test order can be created,
4. that `save-billing-details` saves the billing details,
5. that a **retry** returns the same `savedAt` (the original `created_at`),
6. that a body containing `cardNumber` / `cvv` is rejected with `400`,
7. that a wrong access token is rejected with `404 "Order not found."`,
8. that replaying the order with the same `idempotency_key` returns the **same**
   order, so a retry never creates a second order.

It stops after step 2 if the function or the table is missing, so it does not
create a test order while the endpoint is still broken. Once the endpoint
works, steps 3 and 8 create one throw-away order in your database (customer
*Opencode Verifier*) — check it with the Table Editor if you want to remove it.

To test an order you already have instead of creating one:

```bash
node scripts/verify-save-billing-details.mjs \
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

## 5. Payment

No real payment provider is configured in this repository. Checkout runs in
**DEMO mode**:

- The order is created with `order_status = pending_payment` and
  `payment_status = pending`.
- The payment step is an iOS-inspired **Payment Details** card form (name,
  number, MM/YY, CVV, US ZIP) with brand detection and inline validation.
  Card number, expiry and CVV are checked in the browser only, cleared after a
  successful order, and **no money is charged**.
- On submit, only the **cardholder name**, **billing ZIP** and a server-side
  **submission timestamp** are saved, via `save-billing-details` into
  `payment_billing_details`. The UI shows a saving/success/error message for
  this step; it is explicitly **not** a payment confirmation.
- Clicking **Pay $100.00** calls `confirm-demo-payment`, which is the **only**
  code path that sets `payment_status = paid` / `order_status = confirmed`.
- **Simulate failed payment** sets `payment_status = failed` while leaving the
  order `pending_payment`, so it can be retried safely.
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

No payment provider is integrated, so the card form is client-side only:
raw card numbers, CVVs and PINs are never sent to Supabase or any other
server, never stored, never logged, and are dropped from memory once the
order is confirmed. The only persisted fields are cardholder name, billing
ZIP and the submission timestamp. Real card entry must not be used until a
provider (see above) is integrated.

---

## 6. Security model

- The browser never determines price, totals, product details, order number or
  statuses — `create-order` recomputes all of these from its server-side catalog.
- RLS denies all anonymous/authenticated direct table access.
- Guests are not required to create an Auth account.
- Order lookup requires the per-order opaque **capability token** returned once
  at creation (`get-order` / `confirm-demo-payment` / `save-billing-details`).
- `payment_billing_details` holds only cardholder name, billing ZIP and a
  timestamp. RLS is enabled with **no policies**, and the `anon` /
  `authenticated` table grants are revoked, so only the Edge Function (service
  role) can write. Its `order_id` is unique, making repeated submissions
  idempotent.
- `save-billing-details` writes that row with an explicit INSERT, and only if
  the unique constraint rejects the INSERT (23505) does it fall back to an
  UPDATE. The INSERT leaves `id` and `created_at` to their database defaults;
  the UPDATE touches `cardholder_name` and `billing_postal_code` only. A retry
  therefore reuses the existing row and keeps the **original** `created_at`.
- `save-billing-details` **allow-lists** its request body
  (`orderNumber`, `accessToken`, `cardholderName`, `billingPostalCode`). Any
  other key — a card number, CVV, PIN or expiry — is rejected with `400`
  *before* a database write is attempted, so sensitive data cannot be stored
  even if a future client change starts sending it.
- Repeated submissions of the same checkout reuse one `idempotency_key`, so the
  database returns the existing order instead of creating a duplicate.
  `save-billing-details` never writes to `orders` at all — it only reads the
  order id and writes the billing row, so retrying can never create a second
  order.
- Database errors are returned as non-2xx responses; the UI shows the error and
  never a false success.

---

## 7. Testing checklist

See §9 of the implementation requirements. Manual verification:

1. **Buy Now** opens `/checkout` with the item, variant and quantity.
2. **Add to Cart** updates the header count and opens the cart drawer; the cart
   persists across reloads; quantities can change and items can be removed.
3. **Proceed to Checkout** from the cart includes the correct product/quantity.
4. Empty/invalid form fields show inline errors and block submission —
   including the card fields (brand-aware number length + Luhn, MM/YY not in
   the past, 3- or 4-digit CVV, 5-digit ZIP).
5. The displayed price is exactly **$100.00**.
6. Changing a client price in dev tools does not change the server total.
7. Orders and order items appear in the `orders` / `order_items` tables.
8. Stopping the Edge Function / breaking the DB shows an error, not success.
9. Double-clicking **Pay $100.00** creates a single order.
10. **Simulate failed payment** leaves the order unpaid and retryable.
11. The green tick appears only after a successful server confirmation.
12. Layouts work at mobile (< 640px), tablet (~768px) and desktop (≥ 1024px).
13. `npm run build` passes.
14. After checkout, `payment_billing_details` contains one row per order with
    **only** the cardholder name, billing ZIP and timestamp — and no card
    number, CVV, expiry or PIN.
15. The payment form shows “Saving your billing details…” then a success or
    error message; double-clicking **Pay $100.00** still creates one order and
    one billing row.
16. `payment_billing_details` cannot be read or written from the anon key
    (try it in the SQL Editor as `anon` or via `supabase-js` in the browser).
17. `node scripts/verify-save-billing-details.mjs` reports every check as
    **PASS** (see §2.6).
