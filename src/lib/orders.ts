import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './supabase'

export type OrderStatus = 'pending_payment' | 'confirmed' | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'failed'

export type CheckoutCustomer = {
  fullName: string
  email: string
  phone: string
}

export type CheckoutShipping = {
  line1: string
  line2: string
  city: string
  region: string
  postalCode: string
  country: string
}

export type CheckoutLineInput = {
  productId: string
  variant: string
  quantity: number
}

export type OrderLine = {
  productId: string
  title: string
  image: string
  variant: string
  quantity: number
  unitPriceCents: number
  lineTotalCents: number
}

export type OrderRecord = {
  orderId: string
  orderNumber: string
  accessToken: string
  currency: string
  subtotalCents: number
  shippingCents: number
  totalCents: number
  orderStatus: OrderStatus
  paymentStatus: PaymentStatus
  createdAt?: string
  customerName?: string
  customerEmail?: string
  shipping?: CheckoutShipping
  items: OrderLine[]
}

export type CreateOrderInput = {
  idempotencyKey: string
  customer: CheckoutCustomer
  shipping: CheckoutShipping
  items: CheckoutLineInput[]
}

function readError(data: unknown, status: number): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const value = (data as { error?: unknown }).error
    if (typeof value === 'string' && value.trim()) return value
  }
  return `Request failed (${status})`
}

async function callFunction<T>(name: string, body: unknown): Promise<T> {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Checkout backend is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!response.ok) throw new Error(readError(data, response.status))
  return data as T
}

/** Creates the order server-side (pending states). Prices are computed there. */
export function createOrder(input: CreateOrderInput): Promise<OrderRecord> {
  return callFunction<OrderRecord>('create-order', input)
}

/** Fetches an order using its capability token. Used to verify before success. */
export function getOrder(orderNumber: string, accessToken: string): Promise<OrderRecord> {
  return callFunction<OrderRecord>('get-order', { orderNumber, accessToken })
}

/**
 * Demo only. Simulates the provider confirmation step. A real provider would
 * confirm payment through a verified webhook instead of this endpoint.
 */
export function confirmDemoPayment(
  orderNumber: string,
  accessToken: string,
  outcome: 'succeeded' | 'failed',
): Promise<OrderRecord> {
  return callFunction<OrderRecord>('confirm-demo-payment', {
    orderNumber,
    accessToken,
    outcome,
  })
}
