import { createClient } from 'npm:@supabase/supabase-js@2'
import { json, preflight } from '../_shared/cors.ts'
import { asRecord, str, UUID_RE } from '../_shared/order.ts'

/**
 * Completes a customer onboarding.
 *
 * WHAT THIS STORES
 * ----------------
 * A customer onboarding record: the customer's own user ID number, a username
 * chosen by the customer, the contact and postal details of the checkout, the
 * optional date of birth (month + year) and the confirmation state.
 *
 * The user ID is supplied by the CUSTOMER — it is the identifier they already
 * have. It is validated here (letters and numbers, at most 20 characters) and
 * again by a database constraint, and it is UNIQUE, so it cannot be claimed
 * twice. It is an identifier, never a credential: it does not authenticate
 * anyone and it never grants access to anything.
 *
 * SECURITY
 * --------
 *   * The request body is an allow-list. A body containing any other key — a
 *     card number, CVV, PIN, expiry, a one-time code, a password, an access
 *     token of another order — is rejected with 400 *before* a database write
 *     is attempted, so a credential can never be persisted even if a future
 *     client change starts sending one.
 *   * Authorisation: guest checkout has no Supabase Auth session, so the
 *     caller proves ownership of this checkout with the per-order capability
 *     token (orderNumber + accessToken), exactly like `get-order` and
 *     `confirm-demo-payment`. The service-role key is read from the server
 *     environment and never leaves the function; the table has RLS enabled
 *     with no policies, so there is no direct client access.
 *   * A user-supplied identifier is never treated as proof of account
 *     ownership. The user ID and the username are labels only. This endpoint
 *     does not grant access to anything, and the profile it writes starts as
 *     `verification_status = 'pending_review'` — confirmation is carried out
 *     by our team by phone, and only staff can change that status.
 *   * No one-time code, verification code, password or authentication secret
 *     is accepted, stored or logged. There is no column for one.
 *
 * IDEMPOTENT
 * ----------
 * `customer_profiles.order_id` is UNIQUE, so a retry of the same checkout
 * returns the existing record instead of creating a second one. A username
 * or a user ID that is already taken is rejected with 409 rather than
 * overwritten.
 */
const ALLOWED_FIELDS = [
  'orderNumber',
  'accessToken',
  'username',
  'userId',
  'fullName',
  'email',
  'phone',
  'birthMonth',
  'birthYear',
  'addressLine1',
  'addressLine2',
  'city',
  'region',
  'postalCode',
  'country',
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^\+?[0-9](?:[0-9\s().-]{5,18}[0-9])$/
const USERNAME_RE = /^[a-z0-9]{3,32}$/
/** Letters and numbers only, at most 20 characters (10, 15, 16 or 20 are fine). */
const USER_ID_RE = /^[A-Za-z0-9]{1,20}$/
const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/

/** Birth year bounds accepted by the database. */
const MIN_BIRTH_YEAR = 1900
const MAX_BIRTH_YEAR = 2100

/**
 * Reads an optional month/year. Accepts a number or a numeric string; an
 * empty string means "not provided" and becomes NULL. Anything else is a
 * validation error.
 */
function readOptionalNumber(
  raw: unknown,
  field: string,
  min: number,
  max: number,
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === '') return { ok: true, value: null }
  if (typeof raw === 'boolean') {
    return { ok: false, error: `The ${field} is not valid.` }
  }
  const text = typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw.trim() : ''
  if (!/^\d{1,4}$/.test(text)) {
    return { ok: false, error: `The ${field} is not valid.` }
  }
  const value = Number(text)
  if (!Number.isInteger(value) || value < min || value > max) {
    return { ok: false, error: `The ${field} is not valid.` }
  }
  return { ok: true, value }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  let body: Record<string, unknown>
  try {
    body = asRecord(await req.json())
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  // Allow-list the payload. This is the guard that guarantees no card
  // number, CVV, PIN, expiry, one-time code or secret can ever be written,
  // no matter what the client sends.
  const unexpected = Object.keys(body).filter((key) => !ALLOWED_FIELDS.includes(key))
  if (unexpected.length > 0) {
    const names = unexpected
      .filter((key) => /^[A-Za-z0-9_]{1,32}$/.test(key))
      .slice(0, 5)
      .join(', ')
    console.error('complete-onboarding rejected unexpected fields', unexpected)
    return json(
      {
        error:
          'Unexpected field(s) in request body. Only the onboarding fields are accepted.',
        ...(names ? { fields: names } : {}),
      },
      400,
    )
  }

  const orderNumber = str(body.orderNumber)
  const accessToken = str(body.accessToken)
  if (!orderNumber || orderNumber.length > 64 || !UUID_RE.test(accessToken)) {
    return json({ error: 'Missing or invalid order credentials.' }, 400)
  }

  const username = str(body.username).toLowerCase()
  const userId = str(body.userId).toUpperCase()
  const fullName = str(body.fullName)
  const email = str(body.email).toLowerCase()
  const phone = str(body.phone)
  const addressLine1 = str(body.addressLine1)
  const addressLine2 = str(body.addressLine2)
  const city = str(body.city)
  const region = str(body.region)
  const postalCode = str(body.postalCode)
  const country = str(body.country)

  const fieldErrors: Record<string, string> = {}

  if (!USERNAME_RE.test(username)) {
    fieldErrors.username = 'Choose a username of 3 to 32 letters or numbers.'
  }
  if (!USER_ID_RE.test(userId)) {
    fieldErrors.userId = 'Enter your user ID number: letters and numbers, up to 20 characters.'
  }
  if (fullName.length < 2 || fullName.length > 120) {
    fieldErrors.fullName = 'Enter a valid full name.'
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    fieldErrors.email = 'Enter a valid email address.'
  }
  if (!PHONE_RE.test(phone)) {
    fieldErrors.phone = 'Enter a valid phone number.'
  }
  if (addressLine1.length < 1 || addressLine1.length > 200) {
    fieldErrors.addressLine1 = 'Enter a valid street address.'
  }
  if (addressLine2.length > 120) {
    fieldErrors.addressLine2 = 'Address line 2 is too long.'
  }
  if (city.length < 1 || city.length > 120) {
    fieldErrors.city = 'Enter a valid city.'
  }
  if (region.length < 1 || region.length > 120) {
    fieldErrors.region = 'Enter a valid state or region.'
  }
  if (postalCode.length < 1 || postalCode.length > 20) {
    fieldErrors.postalCode = 'Enter a valid postal or ZIP code.'
  }
  if (country.length < 2 || country.length > 64) {
    fieldErrors.country = 'Enter a valid country.'
  }

  const birthMonth = readOptionalNumber(body.birthMonth, 'birth month', 1, 12)
  if (!birthMonth.ok) fieldErrors.birthMonth = birthMonth.error
  const birthYear = readOptionalNumber(body.birthYear, 'birth year', MIN_BIRTH_YEAR, MAX_BIRTH_YEAR)
  if (!birthYear.ok) fieldErrors.birthYear = birthYear.error

  for (const [key, value] of Object.entries({
    username,
    fullName,
    email,
    phone,
    addressLine1,
    addressLine2,
    city,
    region,
    postalCode,
    country,
  })) {
    if (CONTROL_CHARS_RE.test(value)) {
      fieldErrors[key] = 'This value contains invalid characters.'
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return json({ error: 'Please correct the highlighted fields.', fields: fieldErrors }, 422)
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

  // Capability-token check: proves the caller owns this checkout.
  const { data: order, error: lookupError } = await supabase
    .from('orders')
    .select('id, order_status, customer_email')
    .eq('order_number', orderNumber)
    .eq('access_token', accessToken)
    .maybeSingle()

  if (lookupError) {
    console.error('complete-onboarding lookup failed', lookupError)
    return json({ error: `We could not load your order. ${lookupError.message}`.trim() }, 500)
  }
  if (!order) return json({ error: 'Order not found.' }, 404)

  const orderRow = asRecord(order)
  if (orderRow.order_status === 'cancelled') {
    return json({ error: 'This order was cancelled.' }, 409)
  }

  // The account identity must match the identity the order was created with.
  const orderEmail = str(orderRow.customer_email).toLowerCase()
  if (orderEmail && orderEmail !== email) {
    return json(
      { error: 'The email address does not match the one used for this order.' },
      409,
    )
  }

  const orderId = orderRow.id as string

  // Idempotency: one onboarding record per order. A retry returns the record
  // that already exists instead of writing a second one.
  const { data: existing, error: existingError } = await supabase
    .from('customer_profiles')
    .select('user_id, verification_status, created_at')
    .eq('order_id', orderId)
    .maybeSingle()

  if (existingError) {
    console.error('complete-onboarding existing lookup failed', existingError)
    return json({ error: 'We could not read your customer record.' }, 500)
  }
  if (existing) {
    const record = asRecord(existing)
    return json(
      {
        ok: true,
        duplicate: true,
        userId: record.user_id,
        verificationStatus: record.verification_status,
        createdAt: record.created_at,
      },
      200,
    )
  }

  // A username identifies one customer. If it is already taken, refuse
  // instead of silently reassigning it.
  const { data: takenUsername, error: usernameError } = await supabase
    .from('customer_profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (usernameError) {
    console.error('complete-onboarding username lookup failed', usernameError)
    return json({ error: 'We could not check that username.' }, 500)
  }
  if (takenUsername) {
    return json({ error: 'That username is already taken. Please choose another.' }, 409)
  }

  // A user ID identifies one customer too. If it is already taken, refuse
  // instead of silently reassigning it. The comparison is case-insensitive,
  // exactly like the unique index in the database.
  const { data: takenUserId, error: userIdError } = await supabase
    .from('customer_profiles')
    .select('id')
    .ilike('user_id', userId)
    .maybeSingle()

  if (userIdError) {
    console.error('complete-onboarding user id lookup failed', userIdError)
    return json({ error: 'We could not check that user ID.' }, 500)
  }
  if (takenUserId) {
    return json(
      { error: 'That user ID is already registered. Please check it and try again.' },
      409,
    )
  }

  // The user ID is the customer's own identifier. It is not a credential and
  // it is never treated as proof of account ownership.
  const { data: inserted, error: insertError } = await supabase
    .from('customer_profiles')
    .insert({
      order_id: orderId,
      user_id: userId,
      username,
      full_name: fullName,
      email,
      phone,
      birth_month: birthMonth.ok ? birthMonth.value : null,
      birth_year: birthYear.ok ? birthYear.value : null,
      address_line1: addressLine1,
      address_line2: addressLine2,
      city,
      region,
      postal_code: postalCode,
      country,
    })
    .select('user_id, verification_status, created_at')
    .maybeSingle()

  if (insertError) {
    if (insertError.code === '23505') {
      // Lost a race against a concurrent submit. Read the winner and report
      // it instead of writing a duplicate.
      const { data: raced } = await supabase
        .from('customer_profiles')
        .select('user_id, verification_status, created_at')
        .eq('order_id', orderId)
        .maybeSingle()
      if (raced) {
        const record = asRecord(raced)
        return json(
          {
            ok: true,
            duplicate: true,
            userId: record.user_id,
            verificationStatus: record.verification_status,
            createdAt: record.created_at,
          },
          200,
        )
      }
      // Not our order: the username or the user ID was taken by somebody else.
      const { data: takenUsername } = await supabase
        .from('customer_profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle()
      if (takenUsername) {
        return json(
          { error: 'That username is already taken. Please choose another.' },
          409,
        )
      }
      return json(
        { error: 'That user ID is already registered. Please check it and try again.' },
        409,
      )
    }
    console.error('complete-onboarding insert failed', insertError)
    return json({ error: `We could not save your details. ${insertError.message}`.trim() }, 500)
  }

  const record = asRecord(inserted)
  return json(
    {
      ok: true,
      duplicate: false,
      userId: record.user_id,
      verificationStatus: record.verification_status,
      createdAt: record.created_at,
    },
    201,
  )
})
