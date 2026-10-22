/**
 * Customer onboarding: the form state, the validation rules and the payload
 * that is sent to the `complete-onboarding` Edge Function.
 *
 * This module is deliberately dependency-free — it imports nothing — so the
 * rules can be unit-tested without a browser, a bundler or a Supabase client.
 *
 * There is NO card handling anywhere in this module, and there never will be:
 * there is no card number, expiry, CVV, PIN or card-validation rule in this
 * file. The only credential-shaped value the application accepts is the
 * per-order capability token that authorises the checkout itself.
 *
 * The user ID is supplied by the customer: it is the identifier they already
 * have. It is validated (letters and numbers, at most 20 characters) and it
 * is UNIQUE, so it cannot be claimed twice. It is a label and an identifier —
 * never a credential, and it never grants access to anything.
 */

/** The onboarding fields the customer fills in. */
export type OnboardingValues = {
  /** Chosen by the customer. Lowercase alphanumeric, 3–32 characters. */
  username: string
  /** The customer's own ID number. Letters and numbers, at most 20 characters. */
  userId: string
  /** Optional. '' means "not provided". */
  birthMonth: string
  /** Optional. '' means "not provided". */
  birthYear: string
}

export type OnboardingField = keyof OnboardingValues
export type OnboardingErrors = Partial<Record<OnboardingField, string>>

export const emptyOnboarding: OnboardingValues = {
  username: '',
  userId: '',
  birthMonth: '',
  birthYear: '',
}

/** The shape the database enforces: lowercase alphanumeric, 3–32 characters. */
export const USERNAME_RE = /^[a-z0-9]{3,32}$/

/**
 * The shape the database enforces for the user ID: letters and numbers only,
 * at most 20 characters. A 10, 15, 16 or 20 character ID is all valid — the
 * only limit is the length.
 */
export const USER_ID_RE = /^[A-Za-z0-9]{1,20}$/

/** The longest user ID the form and the database accept. */
export const MAX_USER_ID_LENGTH = 20

/** Oldest birth year the form offers. */
export const MIN_BIRTH_YEAR = 1900

/**
 * Normalises what the customer types: lowercase, and only letters and
 * numbers. Anything else is dropped as it is typed, so the value can never
 * reach the server in a shape the database rejects.
 */
export function normalizeUsername(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32)
}

/**
 * Normalises the user ID: uppercase letters and numbers only, capped at the
 * maximum length, so the value can never reach the server in a shape the
 * database rejects. The case is normalised because the database compares user
 * IDs case-insensitively — `abc123` and `ABC123` are the same account.
 */
export function normalizeUserId(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, MAX_USER_ID_LENGTH)
}

/** The month options offered by the form, as `value`/`label` pairs. */
export const BIRTH_MONTHS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

/** The birth years offered by the form, newest first. */
export function birthYearOptions(now: Date = new Date()): number[] {
  const years: number[] = []
  for (let year = now.getFullYear(); year >= MIN_BIRTH_YEAR; year -= 1) {
    years.push(year)
  }
  return years
}

/**
 * Client-side validation. The Edge Function validates the same rules again
 * server-side, and the database enforces them a third time with constraints —
 * this only exists to give immediate, accessible feedback.
 */
export function validateOnboarding(
  values: OnboardingValues,
  now: Date = new Date(),
): OnboardingErrors {
  const errors: OnboardingErrors = {}

  const username = normalizeUsername(values.username)
  if (username.length < 3) {
    errors.username = 'Choose a username of at least 3 letters or numbers.'
  } else if (!USERNAME_RE.test(username)) {
    errors.username = 'Usernames may only contain letters and numbers.'
  }

  const userId = normalizeUserId(values.userId)
  if (!userId) {
    errors.userId = 'Enter your user ID number.'
  } else if (!USER_ID_RE.test(userId)) {
    errors.userId = 'The user ID may only contain letters and numbers.'
  }

  const month = values.birthMonth
  if (month) {
    const parsed = Number(month)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) {
      errors.birthMonth = 'Choose a valid month.'
    }
  }

  const year = values.birthYear
  if (year) {
    const parsed = Number(year)
    const currentYear = now.getFullYear()
    if (!Number.isInteger(parsed) || parsed < MIN_BIRTH_YEAR || parsed > currentYear) {
      errors.birthYear = `Choose a year between ${MIN_BIRTH_YEAR} and ${currentYear}.`
    }
  }

  // A month without a year (or the other way round) cannot be a date.
  if (month && !year) {
    errors.birthYear = 'Enter the birth year too, or leave both empty.'
  }
  if (year && !month) {
    errors.birthMonth = 'Enter the birth month too, or leave both empty.'
  }

  return errors
}

/** Everything the Edge Function needs to create the onboarding record. */
export type CompleteOnboardingInput = {
  /** The public order reference. */
  orderNumber: string
  /** The per-order capability token that authorises this checkout. */
  accessToken: string
  username: string
  /** The customer's own user ID number. */
  userId: string
  fullName: string
  email: string
  phone: string
  birthMonth: number | null
  birthYear: number | null
  addressLine1: string
  addressLine2: string
  city: string
  region: string
  postalCode: string
  country: string
}

/** The body posted to the `complete-onboarding` Edge Function. */
export type CompleteOnboardingPayload = {
  orderNumber: string
  accessToken: string
  username: string
  userId: string
  fullName: string
  email: string
  phone: string
  birthMonth: number | null
  birthYear: number | null
  addressLine1: string
  addressLine2: string
  city: string
  region: string
  postalCode: string
  country: string
}

/**
 * Builds the request body.
 *
 * The result is an allow-list: exactly the fields the Edge Function accepts,
 * and nothing else. A card number, CVV, PIN, expiry, one-time code or
 * password is not part of this type, so it cannot be transmitted.
 */
export function buildOnboardingPayload(
  input: CompleteOnboardingInput,
): CompleteOnboardingPayload {
  return {
    orderNumber: input.orderNumber,
    accessToken: input.accessToken,
    username: normalizeUsername(input.username),
    userId: normalizeUserId(input.userId),
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    birthMonth: input.birthMonth,
    birthYear: input.birthYear,
    addressLine1: input.addressLine1.trim(),
    addressLine2: input.addressLine2.trim(),
    city: input.city.trim(),
    region: input.region.trim(),
    postalCode: input.postalCode.trim(),
    country: input.country.trim(),
  }
}

const USER_ID_KEY = 'shopfront.userIds.v1'

/**
 * Remembers the user ID used for this browser session so the confirmation
 * screen can show it. Session-only: nothing is persisted to disk and nothing
 * is shared with another browser.
 */
export function rememberUserId(orderNumber: string, userId: string): void {
  try {
    const raw = window.sessionStorage.getItem(USER_ID_KEY)
    const map: Record<string, string> = {}
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        for (const [order, value] of Object.entries(parsed as Record<string, unknown>)) {
          if (typeof value === 'string') map[order] = value
        }
      }
    }
    map[orderNumber] = userId
    window.sessionStorage.setItem(USER_ID_KEY, JSON.stringify(map))
  } catch {
    // no-op — the user ID is still shown on the checkout screen
  }
}

/** Returns the user ID used for this order in this session, if any. */
export function getRememberedUserId(orderNumber: string): string | null {
  try {
    const raw = window.sessionStorage.getItem(USER_ID_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const value = (parsed as Record<string, unknown>)[orderNumber]
    return typeof value === 'string' ? value : null
  } catch {
    return null
  }
}
