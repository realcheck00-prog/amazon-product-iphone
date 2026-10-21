import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Saves the ONLY non-sensitive fields collected by the payment-details form:
 *
 *   * cardholder name
 *   * billing ZIP code
 *   * submission timestamp (server-side `created_at`)
 *
 * SECURITY — card numbers, CVVs, PINs, expiry dates and every other payment
 * credential must never reach this endpoint. The request body is allow-listed
 * (ALLOWED_FIELDS below): any unexpected key is rejected with 400 *before* a
 * database write is attempted, so sensitive data can never be persisted even if
 * a future client change starts sending it. Only the two fields above are ever
 * written.
 *
 * Authorisation: guest checkout has no auth session, so the caller must prove
 * ownership with the per-order capability token (orderNumber + accessToken),
 * exactly like `get-order` and `confirm-demo-payment`. The service-role key is
 * read from the server-side environment and never leaves the function; the
 * table has RLS enabled with no policies, so there is no direct client access.
 *
 * Idempotent: `payment_billing_details.order_id` is unique, so retries update
 * the existing row in place and keep the original `created_at`. This endpoint
 * never inserts, updates or deletes anything in `orders`, so retrying the
 * checkout can never create a second order.
 *
 * NOTE: the CORS headers and the two tiny helpers are inlined here instead of
 * being imported from `../_shared/`, so that this file can be pasted into the
 * Supabase Dashboard editor (Edge Functions → Deploy a new function → Via
 * Editor) as one self-contained file. The Dashboard editor cannot resolve
 * relative imports of `../_shared/*`. Keep the values in sync with
 * `supabase/functions/_shared/cors.ts`.
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const

/** The only keys this endpoint accepts. Everything else is refused. */
const ALLOWED_FIELDS = ['orderNumber', 'accessToken', 'cardholderName', 'billingPostalCode']

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ZIP_RE = /^[0-9]{5}(-[0-9]{4})?$/
const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/

/** JSON response with CORS headers. */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

/** Preflight response. Must answer OPTIONS before anything else. */
function preflight(): Response {
  return new Response('ok', { headers: { ...CORS_HEADERS } })
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

Deno.serve(async (req: Request): Promise<Response> => {
  // 1. CORS preflight. This must be handled before the method check, and it
  //    must be answered by the function itself: the gateway's default 404 for
  //    a missing function is what the browser reports as a CORS error.
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  // 2. Parse the body.
  let body: Record<string, unknown>
  try {
    const parsed: unknown = await req.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return json({ error: 'Invalid JSON body.' }, 400)
    }
    body = parsed as Record<string, unknown>
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  // 3. Allow-list the payload. This is the guard that guarantees no card
  //    number, CVV, PIN or expiry can ever be written, no matter what the
  //    client sends.
  const unexpected = Object.keys(body).filter((key) => !ALLOWED_FIELDS.includes(key))
  if (unexpected.length > 0) {
    const names = unexpected
      .filter((key) => /^[A-Za-z0-9_]{1,32}$/.test(key))
      .slice(0, 5)
      .join(', ')
    console.error('save-billing-details rejected unexpected fields', unexpected)
    return json(
      {
        error:
          'Unexpected field(s) in request body. Only the cardholder name and billing ZIP code are accepted.',
        ...(names ? { fields: names } : {}),
      },
      400,
    )
  }

  const orderNumber = str(body.orderNumber)
  const accessToken = str(body.accessToken)
  const cardholderName = str(body.cardholderName)
  const billingPostalCode = str(body.billingPostalCode)

  // 4. Validate the payload against the same rules the database enforces.
  if (!orderNumber || orderNumber.length > 64 || !UUID_RE.test(accessToken)) {
    return json({ error: 'Missing or invalid order credentials.' }, 400)
  }
  if (cardholderName.length < 2 || cardholderName.length > 120) {
    return json({ error: 'Cardholder name is missing or too long.' }, 400)
  }
  if (CONTROL_CHARS_RE.test(cardholderName)) {
    return json({ error: 'Cardholder name contains invalid characters.' }, 400)
  }
  if (!ZIP_RE.test(billingPostalCode)) {
    return json({ error: 'Billing ZIP code must be a 5-digit US ZIP code.' }, 400)
  }

  // 5. Server-only credentials. These are injected by the Supabase Edge
  //    Runtime and are never exposed to the browser.
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return json({ error: 'Server is not configured.' }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  // 6. Capability-token check: proves the caller owns this order. Only the
  //    order id is read here — this endpoint never writes to `orders`.
  const { data: order, error: lookupError } = await supabase
    .from('orders')
    .select('id')
    .eq('order_number', orderNumber)
    .eq('access_token', accessToken)
    .maybeSingle()

  if (lookupError) {
    // Surface the database message (never any secret) so a failed insert is
    // diagnosable from the UI during development.
    console.error('save-billing-details lookup failed', lookupError)
    return json({ error: `We could not load your order. ${lookupError.message}`.trim() }, 500)
  }
  if (!order) return json({ error: 'Order not found.' }, 404)

  // 7. Idempotent write.
  //
  //    `payment_billing_details.order_id` is unique, so a retry has to land on
  //    the row that already exists instead of adding a second one. That is
  //    done explicitly, with an INSERT and — only if the unique constraint
  //    rejects it — an UPDATE:
  //
  //      * INSERT with `missing=default`: `id` and `created_at` are not part
  //        of the payload, so they take their database defaults.
  //      * UPDATE sets `cardholder_name` and `billing_postal_code` only, so the
  //        original `created_at` survives every retry.
  //
  //    (`upsert()` would express the same intent in one round trip, but its
  //    conflict branch rewrites every column of the table, which resets
  //    `created_at`. The explicit two-step form leaves no such ambiguity.)
  //
  //    This endpoint never inserts, updates or deletes anything in `orders`,
  //    so retrying the checkout can never create a second order.
  const billingFields = {
    cardholder_name: cardholderName,
    billing_postal_code: billingPostalCode,
  }

  const { data: inserted, error: insertError } = await supabase
    .from('payment_billing_details')
    .insert({ order_id: order.id as string, ...billingFields }, { defaultToNull: false })
    .select('created_at')
    .maybeSingle()

  if (!insertError && inserted) {
    // Nothing sensitive is echoed back — only the submission timestamp.
    return json({ ok: true, savedAt: (inserted as { created_at: string }).created_at })
  }

  if (insertError?.code === '23505') {
    // The row already exists (23505 = unique_violation on `order_id`): update
    // it in place, leaving `created_at` untouched.
    const { data: updated, error: updateError } = await supabase
      .from('payment_billing_details')
      .update(billingFields)
      .eq('order_id', order.id as string)
      .select('created_at')
      .maybeSingle()

    if (!updateError && updated) {
      return json({ ok: true, savedAt: (updated as { created_at: string }).created_at })
    }

    console.error('save-billing-details update failed', updateError)
    return json(
      { error: `We could not save your billing details. ${updateError?.message ?? ''}`.trim() },
      500,
    )
  }

  // Surface the database message (never any secret) so a failed write is
  // diagnosable from the UI during development.
  console.error('save-billing-details insert failed', insertError)
  return json(
    { error: `We could not save your billing details. ${insertError?.message ?? ''}`.trim() },
    500,
  )
})
