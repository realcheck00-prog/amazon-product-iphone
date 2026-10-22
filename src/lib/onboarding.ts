/**
 * Customer onboarding: the connection-period rules and the row that is written
 * to the `public.customer_onboarding` table.
 *
 * This module is deliberately dependency-free — it imports nothing — so the
 * rules can be unit-tested without a browser, a bundler or a Supabase client.
 *
 * There is NO card handling anywhere in this module, and there never will be:
 * there is no card number, expiry, CVV, PIN or card-validation rule in this
 * file. The onboarding flow takes no payment and collects no credential of any
 * kind.
 *
 * The username, the 20-character user ID and the 3-digit confirmation code are
 * assigned later by the support team over the phone. They are NOT asked for
 * here, they are NOT sent by the browser, and the database rejects any
 * attempt to set them from the public API.
 */

export type OnboardingValues = {
  /** How long the customer wants the connection for, e.g. `18 months`. */
  connectionPeriod: string
}

export type OnboardingField = keyof OnboardingValues
export type OnboardingErrors = Partial<Record<OnboardingField, string>>

export const emptyOnboarding: OnboardingValues = {
  connectionPeriod: '',
}

/**
 * The shape the database enforces for the connection period: a positive number
 * of months or years, e.g. `18 months`, `2 years`, `1 month`. A bare `0` is
 * rejected — a connection cannot run for zero months.
 */
export const CONNECTION_PERIOD_RE = /^[1-9][0-9]{0,2} (month|months|year|years)$/

/**
 * Normalises the connection period.
 *
 * `18 MONTHS` becomes `18 months`, `18month` becomes `18 months` and
 * `1 months` becomes `1 month`. Anything that is not a number with a unit is
 * returned unchanged so the validation message can point at it.
 */
export function normalizeConnectionPeriod(value: string): string {
  const cleaned = value.trim().toLowerCase().replace(/\s+/g, ' ')
  const match = /^([0-9]{1,3})\s*(month|months|year|years)?$/.exec(cleaned)
  if (!match) return cleaned

  const amount = Number(match[1])
  const unit = match[2]
  if (!unit || amount === 0) return cleaned

  const singular = unit.startsWith('month') ? 'month' : 'year'
  return `${amount} ${amount === 1 ? singular : `${singular}s`}`
}

/**
 * Client-side validation. The database enforces the same rule with a CHECK
 * constraint — this only exists to give immediate, accessible feedback.
 */
export function validateOnboarding(values: OnboardingValues): OnboardingErrors {
  const errors: OnboardingErrors = {}

  const period = normalizeConnectionPeriod(values.connectionPeriod)
  if (!period) {
    errors.connectionPeriod = 'Enter the connection period, for example 18 months.'
  } else if (!CONNECTION_PERIOD_RE.test(period)) {
    errors.connectionPeriod =
      'Enter the connection period as a number of months or years, for example 18 months.'
  }

  return errors
}

/**
 * The columns of `public.customer_onboarding` that the browser writes.
 *
 * The team-assigned columns are deliberately absent rather than `null`: a
 * PostgREST insert names every key in the payload as a target column, and the
 * browser has no INSERT privilege on `username`, `external_user_id` or
 * `confirmation_code`. Leaving them out lets the database default them to NULL,
 * which the row-level security insert policy also requires.
 */
export type OnboardingRecord = {
  id: string
  full_name: string
  email: string
  phone: string
  address_line_1: string
  address_line_2: string | null
  city: string
  state_region: string
  postal_code: string
  country: string
  connection_period: string
}

/** Everything the browser knows about a submission. */
export type OnboardingRecordInput = {
  /** The reference the customer quotes. Generated in the browser. */
  id: string
  fullName: string
  email: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  stateRegion: string
  postalCode: string
  country: string
  connectionPeriod: string
}

/**
 * Builds the row that is inserted into `public.customer_onboarding`.
 *
 * The result is an allow-list: exactly the columns the browser may write, and
 * nothing else. The three team-assigned columns are not included at all — the
 * database defaults them to NULL, and the browser has no column privilege for
 * them.
 *
 * Only the email address is rewritten (trimmed and lower-cased). Phone
 * numbers, postal codes and every other value are trimmed and otherwise left
 * exactly as the customer typed them.
 */
export function buildOnboardingRecord(input: OnboardingRecordInput): OnboardingRecord {
  const addressLine2 = input.addressLine2.trim()

  return {
    id: input.id,
    full_name: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    address_line_1: input.addressLine1.trim(),
    address_line_2: addressLine2 ? addressLine2 : null,
    city: input.city.trim(),
    state_region: input.stateRegion.trim(),
    postal_code: input.postalCode.trim(),
    country: input.country.trim(),
    connection_period: normalizeConnectionPeriod(input.connectionPeriod),
  }
}

/** Generates the reference the customer quotes when they call us. */
export function newOnboardingReference(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 12)}`
}

/**
 * Turns a failed insert into a message that is safe to show a customer.
 *
 * Postgres error codes are mapped to plain English. The database message and
 * the submitted values are never echoed: they can contain internals and would
 * put personal data on the screen.
 */
export function describeSubmissionError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : ''

  switch (code) {
    case '23505':
      return 'This request was already submitted, so we kept the first copy.'
    case '23502':
      return 'One of the required details is missing. Please check the form and try again.'
    case '23514':
      return 'One of the details was rejected. Please check the form and try again.'
    case '42501':
      return 'The request was refused by the database permissions. Please try again in a moment.'
    case 'PGRST301':
      return 'The request could not be authorised. Please refresh the page and try again.'
    default:
      return 'We could not save your details. Please check your connection and try again.'
  }
}

const CONTACT_KEY = 'shopfront.onboardingContact.v1'

/**
 * Remembers the phone number the customer gave us for this session, so the
 * confirmation screen can show what we will call. Session-only: nothing is
 * written to disk and nothing is shared with another browser.
 */
export function rememberSubmittedContact(reference: string, phone: string): void {
  try {
    const raw = window.sessionStorage.getItem(CONTACT_KEY)
    const map: Record<string, string> = {}
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
          if (typeof value === 'string') map[key] = value
        }
      }
    }
    map[reference] = phone
    window.sessionStorage.setItem(CONTACT_KEY, JSON.stringify(map))
  } catch {
    // no-op — the confirmation screen simply shows no phone number
  }
}

/** Returns the phone number submitted with this reference, if it is known. */
export function getSubmittedContact(reference: string): string | null {
  try {
    const raw = window.sessionStorage.getItem(CONTACT_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const value = (parsed as Record<string, unknown>)[reference]
    return typeof value === 'string' ? value : null
  } catch {
    return null
  }
}
