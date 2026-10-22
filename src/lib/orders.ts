import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './supabase'
import { FunctionError } from './functionError'
import {
  buildOnboardingPayload,
  type CompleteOnboardingInput,
  type CompleteOnboardingPayload,
} from './onboarding'

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

/**
 * A failed Supabase Edge Function call.
 *
 * Carries the HTTP status and the optional field-level errors the function
 * returned, so a form can highlight the offending inputs instead of showing a
 * single generic message.
 */
export { FunctionError }

function readError(data: unknown, status: number): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const value = (data as { error?: unknown }).error
    if (typeof value === 'string' && value.trim()) return value
  }
  // Supabase gateway and PostgREST failures use `message` rather than `error`
  // (e.g. a function that is not deployed, or a missing table).
  if (data && typeof data === 'object' && 'message' in data) {
    const value = (data as { message?: unknown }).message
    if (typeof value === 'string' && value.trim()) return value
  }
  return `Request failed (${status})`
}

/**
 * Calls a Supabase Edge Function with the publishable anon key.
 *
 * The anon key is the only Supabase credential that may exist in the
 * frontend. The service-role key stays in the Edge Function environment.
 */
export async function callFunction<T>(name: string, body: unknown): Promise<T> {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Checkout backend is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }

  const endpoint = `${supabaseUrl}/functions/v1/${name}`

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(
      `Could not reach the Supabase Edge Function "${name}" at ${endpoint}. ` +
        `The most common cause is that this function has not been deployed yet — run \`supabase functions deploy ${name}\` ` +
        '(or create it in the Supabase Dashboard → Edge Functions and paste in ' +
        `\`supabase/functions/${name}/index.ts\`). ` +
        'Note: a function that does not exist answers with a 404 that lacks CORS headers, so the browser ' +
        'reports it as a network/CORS failure and hides the real reason. ' +
        'Other causes: VITE_SUPABASE_URL is wrong, or a VPN / firewall / ad blocker blocked the request. ' +
        'Open DevTools → Network, submit again, and check whether this request is pending, blocked (CORS) or failed.',
    )
  }

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    const fields =
      data && typeof data === 'object' && 'fields' in data
        ? (data as { fields?: unknown }).fields
        : undefined
    throw new FunctionError(
      readError(data, response.status),
      response.status,
      fields && typeof fields === 'object' ? (fields as Record<string, string>) : undefined,
    )
  }
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

/** The answer from the `complete-onboarding` Edge Function. */
export type CompleteOnboardingResult = {
  ok: true
  /** The backend-assigned customer reference, e.g. `CUST-4F2A9C1B7D`. */
  customerReference: string
  /** `pending_review` until our team confirms the account by phone. */
  verificationStatus: string
  /** True when a previous submission had already created the record. */
  duplicate: boolean
  createdAt?: string
}

/**
 * Creates the customer onboarding record.
 *
 * The request carries only the fields the form collects. It is authorised
 * with the per-order capability token, validated on the server and written
 * idempotently, so a retry never creates a second record.
 *
 * The customer reference is generated by the database and comes back in the
 * response — it is never chosen by the customer.
 */
export async function completeOnboarding(
  input: CompleteOnboardingInput,
): Promise<CompleteOnboardingResult> {
  const payload: CompleteOnboardingPayload = buildOnboardingPayload(input)

  const result = await callFunction<{
    ok?: boolean
    customerReference?: string
    verificationStatus?: string
    duplicate?: boolean
    createdAt?: string
  }>('complete-onboarding', payload)

  return {
    ok: true,
    customerReference: result.customerReference ?? '',
    verificationStatus: result.verificationStatus ?? 'pending_review',
    duplicate: result.duplicate === true,
    createdAt: result.createdAt,
  }
}
