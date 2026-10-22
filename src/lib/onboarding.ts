/**
 * Customer onboarding: the account-detail rules and the row that is written to
 * the `public.customer_onboarding` table.
 *
 * This module is deliberately dependency-free — it imports nothing — so the
 * rules can be unit-tested without a browser, a bundler or a Supabase client.
 *
 * The customer already has their username, user ID and confirmation code from
 * our team. This form collects those existing values; it never generates them.
 *
 * There is NO card handling anywhere in this module: there is no card number,
 * expiry, CVV, PIN or card-validation rule in this file. The onboarding flow
 * takes no payment and collects no credential of any kind.
 */

export type OnboardingValues = {
  /** The username the team gave the customer. */
  username: string
  /** The 20-character alphanumeric user ID the team gave the customer. */
  userId: string
  /** The 3-digit confirmation code the team gave the customer. */
  confirmationCode: string
  /** The last month the connection is valid, as `MM/YYYY`. */
  connectionExpiresOn: string
}

export type OnboardingField = keyof OnboardingValues
export type OnboardingErrors = Partial<Record<OnboardingField, string>>

export const emptyOnboarding: OnboardingValues = {
  username: '',
  userId: '',
  confirmationCode: '',
  connectionExpiresOn: '',
}

/**
 * The database shape of the confirmation code: exactly three digits.
 */
export const CONFIRMATION_CODE_RE = /^[0-9]{3}$/

/** The user ID is an identifier, not a number: up to 20 letters or digits. */
export const USER_ID_RE = /^[A-Za-z0-9]{1,20}$/

/**
 * The expiry is a calendar month, not a duration: `MM/YYYY` with a four-digit
 * year. It is stored as text, never as a `Date` or a timestamp.
 */
export const EXPIRY_RE = /^(0[1-9]|1[0-2])\/[0-9]{4}$/

/** Maximum length of the username, matching the database CHECK constraint. */
export const USERNAME_MAX_LENGTH = 64

/**
 * Normalises the expiry to `MM/YYYY`.
 *
 * `112030` becomes `11/2030`, and `11 / 2030` becomes `11/2030`. Anything that
 * is not six digits (with an optional slash) is returned trimmed, so the
 * validation message can point at it.
 */
export function normalizeExpiry(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  const slash = trimmed.indexOf('/')
  if (slash >= 0) {
    const rawMonth = trimmed.slice(0, slash).replace(/\D/g, '').slice(0, 2)
    const year = trimmed.slice(slash + 1).replace(/\D/g, '').slice(0, 4)
    const month = rawMonth.length === 1 ? `0${rawMonth}` : rawMonth
    if (!month && !year) return ''
    return year ? `${month}/${year}` : month
  }

  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2, 6)}`
}

/** Keeps the confirmation code numeric and at most three digits while typing. */
export function normalizeConfirmationCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 3)
}

/** Keeps the user ID alphanumeric and at most 20 characters while typing. */
export function normalizeUserId(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').slice(0, 20)
}

/**
 * Client-side validation. The database enforces the same rules with CHECK
 * constraints — this only exists to give immediate, accessible feedback.
 *
 * The username and user ID are identifiers, not credentials: case and leading
 * zeros are preserved exactly as entered.
 */
export function validateOnboarding(values: OnboardingValues): OnboardingErrors {
  const errors: OnboardingErrors = {}

  const username = values.username.trim()
  if (!username) {
    errors.username = 'Enter the username provided by our team.'
  } else if (username.length > USERNAME_MAX_LENGTH) {
    errors.username = `The username must be ${USERNAME_MAX_LENGTH} characters or fewer.`
  }

  const userId = values.userId.trim()
  if (!userId) {
    errors.userId = 'Enter the user ID provided by our team.'
  } else if (!USER_ID_RE.test(userId)) {
    errors.userId = 'Enter up to 20 letters or digits. Leading zeros and letter casing are kept.'
  }

  const code = values.confirmationCode.trim()
  if (!code) {
    errors.confirmationCode = 'Enter the 3-digit confirmation code provided by our team.'
  } else if (!CONFIRMATION_CODE_RE.test(code)) {
    errors.confirmationCode = 'Enter exactly 3 digits, for example 007.'
  }

  const expiry = normalizeExpiry(values.connectionExpiresOn)
  if (!expiry) {
    errors.connectionExpiresOn = 'Enter the last valid month and year, for example 11/2030.'
  } else if (!EXPIRY_RE.test(expiry)) {
    errors.connectionExpiresOn =
      'Use MM/YYYY with a month from 01 to 12 and a four-digit year, for example 11/2030.'
  }

  return errors
}

/** The columns of `public.customer_onboarding` that the browser writes. */
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
  username: string
  external_user_id: string
  confirmation_code: string
  connection_valid_until: string
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
  username: string
  userId: string
  confirmationCode: string
  connectionExpiresOn: string
}

/**
 * Builds the row that is inserted into `public.customer_onboarding`.
 *
 * The result is an allow-list: exactly the columns the browser may write, and
 * nothing else. No card, bank or credential column exists in the row type, so
 * one can never be sent.
 *
 * Only the email address is rewritten (trimmed and lower-cased). Usernames,
 * user IDs, confirmation codes, phone numbers, postal codes and the expiry are
 * trimmed and otherwise left exactly as the customer entered them — leading
 * zeros and letter casing included.
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
    username: input.username.trim(),
    external_user_id: input.userId.trim(),
    confirmation_code: input.confirmationCode.trim(),
    connection_valid_until: normalizeExpiry(input.connectionExpiresOn),
  }
}

/** Generates the reference the customer quotes when they contact us. */
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
      return 'That username or user ID is already registered. Check the details our team gave you.'
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

/** What the confirmation screen shows about the submission. */
export type SubmittedSummary = {
  phone: string
  username: string
  userId: string
  validUntil: string
}

const SUMMARY_KEY = 'shopfront.onboardingSummary.v1'

/**
 * Remembers the submitted details for this session, so the confirmation screen
 * can show them without reading the database (the browser has no SELECT
 * privilege). Session-only: nothing is written to disk and nothing is shared
 * with another browser.
 */
export function rememberSubmittedSummary(reference: string, summary: SubmittedSummary): void {
  try {
    const raw = window.sessionStorage.getItem(SUMMARY_KEY)
    const map: Record<string, SubmittedSummary> = {}
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
          if (
            value &&
            typeof value === 'object' &&
            typeof (value as SubmittedSummary).phone === 'string' &&
            typeof (value as SubmittedSummary).username === 'string' &&
            typeof (value as SubmittedSummary).userId === 'string' &&
            typeof (value as SubmittedSummary).validUntil === 'string'
          ) {
            map[key] = value as SubmittedSummary
          }
        }
      }
    }
    map[reference] = summary
    window.sessionStorage.setItem(SUMMARY_KEY, JSON.stringify(map))
  } catch {
    // no-op — the confirmation screen simply shows no summary
  }
}

/** Returns the summary submitted with this reference, if it is known. */
export function getSubmittedSummary(reference: string): SubmittedSummary | null {
  try {
    const raw = window.sessionStorage.getItem(SUMMARY_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const value = (parsed as Record<string, unknown>)[reference]
    if (!value || typeof value !== 'object') return null
    const summary = value as Partial<SubmittedSummary>
    if (
      typeof summary.phone !== 'string' ||
      typeof summary.username !== 'string' ||
      typeof summary.userId !== 'string' ||
      typeof summary.validUntil !== 'string'
    ) {
      return null
    }
    return {
      phone: summary.phone,
      username: summary.username,
      userId: summary.userId,
      validUntil: summary.validUntil,
    }
  } catch {
    return null
  }
}
