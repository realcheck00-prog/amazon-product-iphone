# amazon — iPhone Pro Max demo storefront

A React + Vite + TypeScript + Tailwind CSS demo storefront with a complete,
responsive guest checkout flow. Orders are created with Supabase (Postgres +
Edge Functions); the submitted form details are recorded in a Google Sheet
through a Google Apps Script web app.

- **Product:** Apple iPhone 17 Pro Max 256 GB (Cosmic Orange)
- **Price:** **$100.00 USD** (stored everywhere as `10000` integer cents)
- **Payment:** **DEMO only** — simulated, clearly labelled, no real charge
- **Checkout:** `/checkout` (guest, no account required)
- **Confirmation:** `/order-success` (server-verified)
- **Form submissions:** Google Sheet via Apps Script (see §8)

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
| `src/components/checkout/*` | Header, form field, order summary, billing-details form |
| `src/lib/billingDetails.ts` | Billing-metadata formatting/validation — cardholder name + US ZIP only (client-only) |
| `src/lib/googleSheets.ts` | Posts one submission to the Apps Script web app (no credentials in the browser) |
| `src/lib/csvExport.ts` | Local CSV copy of a submission — RFC 4180 escaping + formula-injection guard |
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
| `scripts/test-csv-export.mjs` | Tests for the CSV escaping and the formula-injection guard |
| `scripts/test-sheet-submission.mjs` | Tests for the Apps Script request/response contract (offline) |
| `google-apps-script/save-checkout-submission.gs` | Apps Script web app that appends one row per submission to a Google Sheet |
| `google-apps-script/appsscript.json` | Apps Script manifest (`spreadsheets` scope only) |
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

No real payment provider is configured in this repository, and the checkout form
does not collect payment credentials at all. Checkout runs in **DEMO mode**:

- The order is created with `order_status = pending_payment` and
  `payment_status = pending`.
- The payment step is an iOS-inspired **Billing Details** card form that asks
  for the **cardholder name** and the **US billing ZIP** only, with a visible
  notice that no payment is processed. There is no card-number, expiry, CVV or
  PIN input anywhere in the form, so those credentials can never be entered,
  sent or stored, and **no money is charged**.
- On submit, the permitted details (name, email, phone, cardholder name,
  billing ZIP, shipping city/country and the order reference) are posted to a
  **Google Apps Script web app** that appends one row to a Google Sheet, and a
  **local CSV copy** is downloaded to the user's own device. Nothing is
  uploaded to Supabase from this workflow. The UI shows the outcome of the
  submission; it is explicitly **not** a payment confirmation.
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
4. Add a hosted payment element to `src/components/checkout/BillingDetailsForm.tsx`.
   Until such a provider exists, the form must stay credential-free: raw card
   numbers, CVVs and PINs are never sent to Supabase or any other server, never
   stored and never logged. The only persisted fields are cardholder name,
   billing ZIP and the submission timestamp.

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
- The checkout form has **no** card-number, expiry, CVV or PIN input. The
  browser cannot collect a payment credential because there is nowhere to type
  one, and the form displays a notice that no payment is processed.
- The submission posted to the Apps Script web app is an **allow-list**:
  `submissionId`, `orderReference`, `fullName`, `email`, `phone`,
  `cardholderName`, `billingPostalCode`, `shippingCity`, `shippingCountry`.
  The script rejects any other key — a card number, CVV, PIN, expiry or the
  order capability token — *before* a row is written, so a payment credential
  cannot be stored in the sheet even if a future client change sends one.
- The Apps Script web app holds **no credential in the frontend**: the browser
  only knows the deployment URL, which is configured through
  `VITE_GOOGLE_SHEETS_ENDPOINT` and kept in the environment. The script itself
  reads the spreadsheet ID from its own **script properties** and needs only
  the `spreadsheets` scope.
- Every sheet column is written with the plain-text number format, and a value
  that starts with `=`, `+`, `-` or `@` is additionally prefixed with a single
  quote — a submitted text can never execute as a spreadsheet formula.
- The sheet row is de-duplicated on `submissionId`, which is the same
  idempotency key the order uses. A retry therefore reuses the existing row
  instead of appending a second one.
- Repeated submissions of the same checkout reuse one `idempotency_key`, so the
  database returns the existing order instead of creating a duplicate. A failed
  sheet submission stops the checkout with an error instead of silently
  dropping the details, and pressing Pay again reuses the same order and the
  same sheet row.
- The local CSV copy is generated in the browser: RFC 4180 quoting, embedded
  quotes doubled, and the same formula-injection guard. It is a copy for the
  customer — it is not a second store.
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
   including the billing fields (cardholder name required, ≤ 120 characters,
   5-digit US ZIP or ZIP+4).
5. The displayed price is exactly **$100.00**.
6. Changing a client price in dev tools does not change the server total.
7. Orders and order items appear in the `orders` / `order_items` tables.
8. Stopping the Edge Function / breaking the DB shows an error, not success.
9. Double-clicking **Pay $100.00** creates a single order.
10. **Simulate failed payment** leaves the order unpaid and retryable.
11. The green tick appears only after a successful server confirmation.
12. Layouts work at mobile (< 640px), tablet (~768px) and desktop (≥ 1024px).
13. `npm run build` passes.
14. After checkout, the Google Sheet contains one row per submission with
    **only** the permitted fields and a server-generated timestamp — and no
    card number, CVV, expiry or PIN.
15. The billing form shows “Recording your submission…” and then a success or
    error message; double-clicking **Pay $100.00** still creates one order and
    one sheet row.
16. A submission that contains a card number is rejected by the Apps Script
    with `ok: false` and nothing is written.
17. Sending the same `submissionId` twice returns `duplicate: true` and leaves
    exactly one row in the sheet.
18. The checkout form displays a **Demo** badge and a notice that no payment is
    processed, and contains no card-number, expiry, CVV or PIN input.
19. `npm test` passes (CSV escaping + the Apps Script request/response
    contract).
20. The Supabase path still works: `node scripts/verify-save-billing-details.mjs`
    reports every check as **PASS** (see §2.6).

---

## 8. Form submissions → Google Sheet (Apps Script)

The checkout form records each submission in a Google Sheet. The browser posts
the permitted fields to a **Google Apps Script web app**, which validates
them, de-duplicates them and appends one row. The order itself is still
created in Supabase — orders are a separate concern and are not affected.

### 8.1 What is written

| Column | Source | Notes |
| --- | --- | --- |
| Submission Timestamp | Apps Script | Server-generated (UTC, ISO 8601) |
| Order Reference | `create-order` | e.g. `SF-20261021-9CC80474` |
| Submission Id | client idempotency key | Used to de-duplicate rows |
| Full Name | form | |
| Email | form | |
| Phone | form | |
| Cardholder Name | form | |
| Billing ZIP Code | form | US ZIP / ZIP+4 |
| Shipping City | form | |
| Shipping Country | form | |

Never written: card number, CVV, PIN, expiry, the street address, the order
capability token, any Google credential. The script rejects a request body
that contains any key outside the list above.

### 8.2 Create the spreadsheet

1. Open <https://sheets.new> and create the spreadsheet you want to use.
2. The script creates and owns the `Submissions` tab (and the header row) on
   the first submission — you do not have to add anything by hand. If you
   prefer to set the columns up yourself, create a tab named `Submissions`
   whose row 1 contains **exactly** these headers, in this order:
   `Submission Timestamp`, `Order Reference`, `Submission Id`, `Full Name`,
   `Email`, `Phone`, `Cardholder Name`, `Billing ZIP Code`, `Shipping City`,
   `Shipping Country`.
3. Note the spreadsheet ID: it is the part between `/d/` and `/edit` in the
   URL, `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`.

### 8.3 Deploy the Apps Script web app

1. Go to <https://script.google.com> → **New project**.
2. Delete the placeholder `Code.gs` and paste the contents of
   `google-apps-script/save-checkout-submission.gs`.
3. Add the manifest: **Project Settings → Show "appsscript.json" manifest file
   in editor** → replace it with `google-apps-script/appsscript.json`.
4. Set the configuration (this is where the configuration lives — it is not in
   the source file):
   - **Project Settings → Script Properties → Add script property**
     - `SPREADSHEET_ID` = the ID from step 2.3
     - `SHEET_NAME` = `Submissions` (optional)
   - Or run `setupSpreadsheet()` once from the editor and answer the prompts.
5. **Deploy → New deployment → Web app**:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone** (required — the browser posts anonymously)
6. Press **Authorize access** and approve the `spreadsheets` permission. This
   is the one-time Google authorization you have to complete.
7. Copy the **Web app URL** — it ends in `/exec`.

### 8.4 Configure the frontend

```bash
# .env (never committed)
VITE_GOOGLE_SHEETS_ENDPOINT=https://script.google.com/macros/s/AKfycb.../exec
```

On Vercel: **Project → Settings → Environment Variables** → add
`VITE_GOOGLE_SHEETS_ENDPOINT` → redeploy (Vite inlines the value at build
time). Add it to `.env.example` only as a placeholder.

The URL is not a credential, but it **is** a capability URL: anyone who has it
can append a row. Keep it out of public repositories and rotate it (delete the
deployment, deploy a new one) if it leaks.

### 8.5 Test it

Health check — open the deployment URL in a browser:

```json
{"ok":true,"service":"checkout-submission","spreadsheetConfigured":true,"sheetName":"Submissions", ...}
```

Successful submission:

```bash
curl -s -X POST "$VITE_GOOGLE_SHEETS_ENDPOINT" \
  -H 'Content-Type: text/plain;charset=utf-8' \
  -d '{"submissionId":"manual-test-1","orderReference":"SF-TEST-1","fullName":"Alex Morgan","email":"alex@example.com","phone":"+15550109999","cardholderName":"Alex Morgan","billingPostalCode":"10001","shippingCity":"New York","shippingCountry":"United States"}'
# {"ok":true,"saved":true,"duplicate":false,"row":2,"timestamp":"..."}
```

Failure — an invalid field is rejected and nothing is written:

```bash
curl -s -X POST "$VITE_GOOGLE_SHEETS_ENDPOINT" -H 'Content-Type: text/plain;charset=utf-8' \
  -d '{"submissionId":"manual-test-2","orderReference":"SF-TEST-2","fullName":"A","email":"not-an-email","phone":"1","cardholderName":"A","billingPostalCode":"1"}'
# {"ok":false,"error":"Field \"fullName\" is required.","field":"fullName"}
```

Duplicate — the same `submissionId` twice returns the existing row and does
**not** append a second one:

```bash
# repeat the successful submission with the same submissionId
# {"ok":true,"saved":true,"duplicate":true,"row":2,"timestamp":"..."}
```

Formula injection — a name that starts with `=` is stored as text:

```bash
# cardholderName "=IMPORTXML(...)" is written as "'=IMPORTXML(...)" and the
# column is plain text, so it is never evaluated.
```

Permissions — the script runs as the account that deployed it, so that account
needs edit access to the spreadsheet. To check: share the sheet with that
Google account, or deploy from the sheet's owner. The `spreadsheets` scope in
`appsscript.json` is the only scope requested; the script never asks for
Drive access and never reads a credential from the frontend.

### 8.6 If you need central collection without Apps Script

The repository already contains a second, fully server-side option: the
`save-billing-details` Edge Function with the `payment_billing_details` table
(§2.5, §2.6). It runs in Supabase, authorises the caller with the per-order
capability token, writes with the service role and is protected by RLS with no
policies.

Either way the rule is the same: **the frontend never holds a credential.** The
browser may only contain the Supabase *anon* key (safe by design) or the
deployment URL of a web app that authorises itself. A service-role key, an
OAuth refresh token or a private key must never be embedded in frontend code
or committed to the repository.
