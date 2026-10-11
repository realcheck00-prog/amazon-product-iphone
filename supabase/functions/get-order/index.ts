import { createClient } from 'npm:@supabase/supabase-js@2'
import { json, preflight } from '../_shared/cors.ts'
import { asRecord, mapOrder, str, UUID_RE } from '../_shared/order.ts'

/**
 * Order lookup using the opaque capability token issued at creation time.
 * The token is required in addition to the order number, so guest customers
 * can confirm their own order without any anonymous read access to the table.
 */
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
  if (!orderNumber || orderNumber.length > 64 || !UUID_RE.test(accessToken)) {
    return json({ error: 'Missing or invalid order credentials.' }, 400)
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
    console.error('get-order lookup failed', error)
    return json({ error: 'We could not load your order.' }, 500)
  }
  if (!order) return json({ error: 'Order not found.' }, 404)

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true })

  if (itemsError) {
    console.error('get-order items lookup failed', itemsError)
    return json({ error: 'We could not load your order.' }, 500)
  }

  return json(mapOrder(asRecord(order), (items ?? []).map(asRecord)), 200)
})
