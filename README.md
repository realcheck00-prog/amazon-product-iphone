# Shopfront — iPhone Pro Max demo storefront

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
| `src/components/checkout/*` | Header, form field, order summary |
| `src/App.tsx` | Router (`/`, `/checkout`, `/order-success`) |

### Backend (Supabase)

| File | Purpose |
| --- | --- |
| `supabase/migrations/20260101000000_init_checkout.sql` | Tables, indexes, constraints, RLS, atomic order-creation RPC |
| `supabase/functions/create-order/index.ts` | Trusted order creation (server-side pricing + idempotency) |
| `supabase/functions/get-order/index.ts` | Capability-token order lookup |
| `supabase/functions/confirm-demo-payment/index.ts` | DEMO payment confirmation (only writer of `paid`/`confirmed`) |
| `supabase/functions/_shared/*` | CORS, authoritative catalog, serialization |
| `supabase/config.toml` | Disables JWT verification for the guest-facing functions |
| `vercel.json` | SPA rewrites so `/checkout` and `/order-success` deep-link correctly |
| `.env.example` | Environment variable placeholders (no secrets) |

---

## 2. Supabase setup

### 2.1 Create the project

1. Create a project at <https://supabase.com/dashboard>.
2. Note the **Project URL** and **publishable/anon key** (Project Settings → API).

### 2.2 Run the SQL migration

Open **SQL Editor → New query**, paste the contents of
`supabase/migrations/20260101000000_init_checkout.sql`, and run it.

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

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>

supabase functions deploy create-order
supabase functions deploy get-order
supabase functions deploy confirm-demo-payment
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically into
deployed functions — you do not set them yourself. **Never** put the
service-role key in frontend code or in `.env` files used by Vite.

DEMO mode is the default. Do **not** set `PAYMENT_PROVIDER` unless you have
integrated a real provider (see §5).

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
- The payment step is clearly labelled **DEMO** and explains that no card data
  is collected and no money is charged.
- Clicking **Pay (demo)** calls `confirm-demo-payment`, which is the **only**
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

No raw card numbers, CVVs or banking credentials are collected or stored
anywhere in the current code.

---

## 6. Security model

- The browser never determines price, totals, product details, order number or
  statuses — `create-order` recomputes all of these from its server-side catalog.
- RLS denies all anonymous/authenticated direct table access.
- Guests are not required to create an Auth account.
- Order lookup requires the per-order opaque **capability token** returned once
  at creation (`get-order` / `confirm-demo-payment`).
- Repeated submissions of the same checkout reuse one `idempotency_key`, so the
  database returns the existing order instead of creating a duplicate.
- Database errors are returned as non-2xx responses; the UI shows the error and
  never a false success.

---

## 7. Testing checklist

See §9 of the implementation requirements. Manual verification:

1. **Buy Now** opens `/checkout` with the item, variant and quantity.
2. **Add to Cart** updates the header count and opens the cart drawer; the cart
   persists across reloads; quantities can change and items can be removed.
3. **Proceed to Checkout** from the cart includes the correct product/quantity.
4. Empty/invalid form fields show inline errors and block submission.
5. The displayed price is exactly **$100.00**.
6. Changing a client price in dev tools does not change the server total.
7. Orders and order items appear in the `orders` / `order_items` tables.
8. Stopping the Edge Function / breaking the DB shows an error, not success.
9. Double-clicking **Continue to payment** creates a single order.
10. **Simulate failed payment** leaves the order unpaid and retryable.
11. The green tick appears only after a successful server confirmation.
12. Layouts work at mobile (< 640px), tablet (~768px) and desktop (≥ 1024px).
13. `npm run build` passes.
