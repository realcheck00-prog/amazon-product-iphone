import { createClient } from 'npm:@supabase/supabase-js@2'
import { json, preflight } from '../_shared/cors.ts'
import { CATALOG, CURRENCY, MAX_LINE_QUANTITY } from '../_shared/catalog.ts'
import { asRecord, str, UUID_RE } from '../_shared/order.ts'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^\+?[0-9](?:[0-9\s().-]{5,18}[0-9])$/

type ComputedItem = {
  product_id: string
  product_title: string
  product_image: string
  selected_variant: string
  quantity: number
  unit_price_cents: number
  line_total_cents: number
}

/**
 * Trusted order-creation endpoint.
 *
 * Validates and normalizes customer input, determines the authoritative unit
 * price from the server catalog, computes subtotal/total, generates the order
 * number inside the database, and persists the order + items atomically.
 * Idempotency is enforced by the database on `idempotency_key`.
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

  const idempotencyKey = str(body.idempotencyKey)
  if (!UUID_RE.test(idempotencyKey)) {
    return json({ error: 'Missing or invalid idempotency key.' }, 400)
  }

  const customerRaw = asRecord(body.customer)
  const shippingRaw = asRecord(body.shipping)

  const customer = {
    fullName: str(customerRaw.fullName),
    email: str(customerRaw.email).toLowerCase(),
    phone: str(customerRaw.phone),
  }

  const shipping = {
    line1: str(shippingRaw.line1),
    line2: str(shippingRaw.line2),
    city: str(shippingRaw.city),
    region: str(shippingRaw.region),
    postalCode: str(shippingRaw.postalCode),
    country: str(shippingRaw.country),
  }

  const fieldErrors: Record<string, string> = {}
  if (customer.fullName.length < 2 || customer.fullName.length > 120) {
    fieldErrors.fullName = 'Enter a valid full name.'
  }
  if (!EMAIL_RE.test(customer.email) || customer.email.length > 254) {
    fieldErrors.email = 'Enter a valid email address.'
  }
  if (!PHONE_RE.test(customer.phone)) {
    fieldErrors.phone = 'Enter a valid phone number.'
  }
  if (shipping.line1.length < 1 || shipping.line1.length > 200) {
    fieldErrors.line1 = 'Enter a valid street address.'
  }
  if (shipping.line2.length > 120) {
    fieldErrors.line2 = 'Address line 2 is too long.'
  }
  if (shipping.city.length < 1 || shipping.city.length > 120) {
    fieldErrors.city = 'Enter a valid city.'
  }
  if (shipping.region.length < 1 || shipping.region.length > 120) {
    fieldErrors.region = 'Enter a valid state or region.'
  }
  if (shipping.postalCode.length < 1 || shipping.postalCode.length > 20) {
    fieldErrors.postalCode = 'Enter a valid postal or ZIP code.'
  }
  if (shipping.country.length < 2 || shipping.country.length > 64) {
    fieldErrors.country = 'Enter a valid country.'
  }
  if (Object.keys(fieldErrors).length > 0) {
    return json({ error: 'Please correct the highlighted fields.', fields: fieldErrors }, 422)
  }

  const rawItems = Array.isArray(body.items) ? body.items : []
  if (rawItems.length === 0) return json({ error: 'Your order has no items.' }, 422)
  if (rawItems.length > 20) return json({ error: 'Too many line items.' }, 422)

  const computedItems: ComputedItem[] = []
  let subtotalCents = 0

  for (const entry of rawItems) {
    const item = asRecord(entry)
    const productId = str(item.productId)
    const variant = str(item.variant)
    const quantity = Number(item.quantity)

    const catalogEntry = CATALOG[productId]
    if (!catalogEntry) {
      return json({ error: `Unknown product: ${productId || '(missing id)'}.` }, 422)
    }
    if (variant.length < 1 || variant.length > 120) {
      return json({ error: 'Invalid product variant.' }, 422)
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
      return json(
        { error: `Quantity must be between 1 and ${MAX_LINE_QUANTITY}.` },
        422,
      )
    }

    // Authoritative price — the client cannot influence this.
    const unitPriceCents = catalogEntry.unitPriceCents
    const lineTotalCents = unitPriceCents * quantity
    subtotalCents += lineTotalCents

    computedItems.push({
      product_id: productId,
      product_title: catalogEntry.title,
      product_image: catalogEntry.image,
      selected_variant: variant,
      quantity,
      unit_price_cents: unitPriceCents,
      line_total_cents: lineTotalCents,
    })
  }

  // Shipping is not configured for this demo store: zero, and labelled as such.
  const shippingCents = 0
  const totalCents = subtotalCents + shippingCents

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return json({ error: 'Server is not configured.' }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { data, error } = await supabase.rpc('create_order_with_items', {
    p_idempotency_key: idempotencyKey,
    p_customer_name: customer.fullName,
    p_customer_email: customer.email,
    p_customer_phone: customer.phone,
    p_address_line1: shipping.line1,
    p_address_line2: shipping.line2,
    p_city: shipping.city,
    p_region: shipping.region,
    p_postal_code: shipping.postalCode,
    p_country: shipping.country,
    p_subtotal_cents: subtotalCents,
    p_shipping_cents: shippingCents,
    p_total_cents: totalCents,
    p_currency: CURRENCY,
    p_items: computedItems,
  })

  if (error) {
    console.error('create_order_with_items failed', error)
    return json({ error: 'We could not create your order. Please try again.' }, 500)
  }

  const result = asRecord(data)

  return json(
    {
      orderId: result.order_id,
      orderNumber: result.order_number,
      accessToken: result.access_token,
      currency: result.currency,
      subtotalCents: result.subtotal_cents,
      shippingCents: result.shipping_cents,
      totalCents: result.total_cents,
      orderStatus: result.order_status,
      paymentStatus: result.payment_status,
      createdAt: result.created_at,
      items: computedItems.map((item) => ({
        productId: item.product_id,
        title: item.product_title,
        image: item.product_image,
        variant: item.selected_variant,
        quantity: item.quantity,
        unitPriceCents: item.unit_price_cents,
        lineTotalCents: item.line_total_cents,
      })),
    },
    201,
  )
})
