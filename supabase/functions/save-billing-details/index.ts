import { createClient } from 'npm:@supabase/supabase-js@2'
import { json, preflight } from '../_shared/cors.ts'
import { asRecord, str, UUID_RE } from '../_shared/order.ts'

/**
 * Saves the ONLY non-sensitive fields collected by the payment-details form:
 *
 *   * cardholder name
 *   * billing ZIP code
 *   * submission timestamp (set server-side as `created_at`)
 *
 * Card numbers, CVVs, PINs and other payment credentials are never sent by
 * the client and must never be sent — this function only ever writes the two
 * fields above, and rejects anything else it is given.
 *
 * Authorisation: guest checkout has no auth session, so the caller must prove
 * ownership with the per-order capability token (orderNumber + accessToken),
 * exactly like `get-order` and `confirm-demo-payment`. Runs with the
 * service-role key; the table itself has RLS enabled with no policies, so
 * there is no direct client access.
 *
 * Idempotent: `payment_billing_details.order_id` is unique, so retries update
 * the existing row in place and keep the original `created_at`.
 */
const ZIP_RE = /^[0-9]{5}(-[0-9]{4})?$/

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  let body: Record<string, unknown>
  try {
    body = asRecord(await req.json())
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const orderNumber = str(body.orderNumber)
  const accessToken = str(body.accessToken)
  const cardholderName = str(body.cardholderName)
  const billingPostalCode = str(body.billingPostalCode)

  if (!orderNumber || orderNumber.length > 64 || !UUID_RE.test(accessToken)) {
    return json({ error: 'Missing or invalid order credentials.' }, 400)
  }
  if (cardholderName.length < 2 || cardholderName.length > 120) {
    return json({ error: 'Cardholder name is missing or too long.' }, 400)
  }
  if (!ZIP_RE.test(billingPostalCode)) {
    return json({ error: 'Billing ZIP code must be a 5-digit US ZIP code.' }, 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return json({ error: 'Server is not configured.' }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  // Capability-token check: proves the caller owns this order.
  const { data: order, error } = await supabase
    .from('orders')
    .select('id')
    .eq('order_number', orderNumber)
    .eq('access_token', accessToken)
    .maybeSingle()

  if (error) {
    // Surface the database message (never any secret) so a failed insert is
    // diagnosable from the UI during development.
    console.error('save-billing-details lookup failed', error)
    return json({ error: `We could not load your order. ${error.message}`.trim() }, 500)
  }
  if (!order) return json({ error: 'Order not found.' }, 404)

  const { data: saved, error: saveError } = await supabase
    .from('payment_billing_details')
    .upsert(
      {
        order_id: order.id as string,
        cardholder_name: cardholderName,
        billing_postal_code: billingPostalCode,
      },
      { onConflict: 'order_id' },
    )
    .select('created_at')
    .single()

  if (saveError || !saved) {
    // Surface the database message (never any secret) so a failed insert is
    // diagnosable from the UI during development.
    console.error('save-billing-details upsert failed', saveError)
    return json(
      { error: `We could not save your billing details. ${saveError?.message ?? ''}`.trim() },
      500,
    )
  }

  // Nothing sensitive is echoed back — only the submission timestamp.
  return json({ ok: true, savedAt: (saved as { created_at: string }).created_at })
})
