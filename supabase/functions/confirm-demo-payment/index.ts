import { createClient } from 'npm:@supabase/supabase-js@2'
import { json, preflight } from '../_shared/cors.ts'
import { asRecord, mapOrder, str, UUID_RE } from '../_shared/order.ts'

/**
 * DEMO payment confirmation.
 *
 * This function simulates the provider confirmation step for the demo store.
 * It is the ONLY place that may transition an order to `paid` / `confirmed`,
 * and it does so only after being called with the correct capability token.
 *
 * When a real payment provider is configured (PAYMENT_PROVIDER env var set),
 * this endpoint refuses to run — a real integration must confirm payment
 * through that provider's verified webhook instead.
 */
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  if (Deno.env.get('PAYMENT_PROVIDER')) {
    return json(
      { error: 'Demo payments are disabled because a real payment provider is configured.' },
      409,
    )
  }

  let body: Record<string, unknown>
  try {
    body = asRecord(await req.json())
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const orderNumber = str(body.orderNumber)
  const accessToken = str(body.accessToken)
  const outcome = str(body.outcome)

  if (!orderNumber || orderNumber.length > 64 || !UUID_RE.test(accessToken)) {
    return json({ error: 'Missing or invalid order credentials.' }, 400)
  }
  if (outcome !== 'succeeded' && outcome !== 'failed') {
    return json({ error: 'Invalid payment outcome.' }, 400)
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

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .eq('access_token', accessToken)
    .maybeSingle()

  if (error) {
    console.error('confirm-demo-payment lookup failed', error)
    return json({ error: 'We could not load your order.' }, 500)
  }
  if (!order) return json({ error: 'Order not found.' }, 404)

  const current = asRecord(order)

  // A paid order is terminal — never downgrade it, and treat repeats as success.
  if (current.payment_status !== 'paid') {
    const update =
      outcome === 'succeeded'
        ? {
            payment_status: 'paid',
            order_status: 'confirmed',
            payment_provider_reference: `DEMO-${crypto.randomUUID()}`,
          }
        : {
            payment_status: 'failed',
            // Keep the order retryable rather than cancelling it.
            order_status: 'pending_payment',
          }

    const { error: updateError } = await supabase
      .from('orders')
      .update(update)
      .eq('id', current.id as string)

    if (updateError) {
      console.error('confirm-demo-payment update failed', updateError)
      return json({ error: 'We could not update your payment status.' }, 500)
    }
  }

  const { data: refreshed, error: refreshError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', current.id as string)
    .single()

  if (refreshError || !refreshed) {
    console.error('confirm-demo-payment refresh failed', refreshError)
    return json({ error: 'We could not confirm your payment.' }, 500)
  }

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', current.id as string)
    .order('created_at', { ascending: true })

  if (itemsError) {
    console.error('confirm-demo-payment items lookup failed', itemsError)
    return json({ error: 'We could not confirm your payment.' }, 500)
  }

  return json(mapOrder(asRecord(refreshed), (items ?? []).map(asRecord)), 200)
})
