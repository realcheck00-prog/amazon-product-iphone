/**
 * US-market payment-card input helpers: brand detection, live formatting and
 * client-side validation.
 *
 * SECURITY: this module only formats and validates strings that live in React
 * state. Nothing here is persisted, logged, or sent to a server — the project
 * has no payment provider, so card data is never transmitted anywhere.
 */

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown'

export type PaymentCardForm = {
  cardholderName: string
  cardNumber: string
  expiry: string
  cvv: string
  billingZip: string
}

export type PaymentCardField = keyof PaymentCardForm
export type PaymentCardErrors = Partial<Record<PaymentCardField, string>>

export const emptyPaymentCard: PaymentCardForm = {
  cardholderName: '',
  cardNumber: '',
  expiry: '',
  cvv: '',
  billingZip: '',
}

const MASTERCARD_RE =
  /^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/
const AMEX_RE = /^3[47]/
const DISCOVER_RE = /^(6011|64[4-9]|65)/
const VISA_RE = /^4/

/** US ZIP or ZIP+4. */
export const US_ZIP_RE = /^\d{5}(-\d{4})?$/

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export function detectCardBrand(value: string): CardBrand {
  const digits = digitsOnly(value)
  if (VISA_RE.test(digits)) return 'visa'
  if (MASTERCARD_RE.test(digits)) return 'mastercard'
  if (AMEX_RE.test(digits)) return 'amex'
  if (DISCOVER_RE.test(digits)) return 'discover'
  return 'unknown'
}

export const cardBrandLabels: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  discover: 'Discover',
  unknown: 'Card',
}

/** American Express is 15 digits; other mainstream US cards run 13–19. */
export function maxCardDigits(brand: CardBrand): number {
  return brand === 'amex' ? 15 : 19
}

export function minCardDigits(brand: CardBrand): number {
  return brand === 'amex' ? 15 : 13
}

/** Amex groups 4-6-5; everything else groups in fours (up to 19 digits). */
export function formatCardNumber(value: string): string {
  const brand = detectCardBrand(value)
  const digits = digitsOnly(value).slice(0, maxCardDigits(brand))
  const groups = brand === 'amex' ? [4, 6, 5] : [4, 4, 4, 4, 3]

  const parts: string[] = []
  let index = 0
  for (const size of groups) {
    if (index >= digits.length) break
    parts.push(digits.slice(index, index + size))
    index += size
  }
  return parts.join(' ')
}

/** `9` -> `09/`, `1225` -> `12/25`. Always returns at most `MM/YY`. */
export function formatExpiry(value: string): string {
  const digits = digitsOnly(value).slice(0, 4)
  if (digits.length <= 2) {
    // A first digit above 1 cannot start a month, so complete it as 0X.
    return digits.length === 1 && digits > '1' ? `0${digits}/` : digits
  }
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

/** Amex uses a 4-digit code on the front; other brands use 3 on the back. */
export function expectedCvvLength(brand: CardBrand): number {
  return brand === 'amex' ? 4 : 3
}

export function formatCvv(value: string, brand: CardBrand): string {
  return digitsOnly(value).slice(0, expectedCvvLength(brand))
}

export function formatBillingZip(value: string): string {
  return value.replace(/[^\d-]/g, '').slice(0, 10)
}

/** Standard Luhn checksum. */
export function passesLuhn(digits: string): boolean {
  if (digits.length === 0) return false
  let sum = 0
  let alternate = false
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let next = digits.charCodeAt(i) - 48
    if (next < 0 || next > 9) return false
    if (alternate) {
      next *= 2
      if (next > 9) next -= 9
    }
    sum += next
    alternate = !alternate
  }
  return sum % 10 === 0
}

/**
 * Client-side validation for the card form. Gives immediate, accessible
 * feedback only — nothing entered here is transmitted to a backend.
 */
export function validatePaymentCard(
  values: PaymentCardForm,
  now: Date = new Date(),
): PaymentCardErrors {
  const errors: PaymentCardErrors = {}

  const name = values.cardholderName.trim()
  if (name.length < 2) {
    errors.cardholderName = 'Enter the name as it appears on the card.'
  } else if (name.length > 120) {
    errors.cardholderName = 'Cardholder name is too long.'
  }

  const digits = digitsOnly(values.cardNumber)
  if (!digits) {
    errors.cardNumber = 'Enter your card number.'
  } else {
    const brand = detectCardBrand(digits)
    const min = minCardDigits(brand)
    const max = maxCardDigits(brand)
    if (digits.length < min) {
      errors.cardNumber = 'Your card number is incomplete.'
    } else if (digits.length > max) {
      errors.cardNumber = 'Your card number is too long.'
    } else if (!passesLuhn(digits)) {
      errors.cardNumber = 'This card number is invalid. Check it and try again.'
    }
  }

  const expiry = values.expiry.trim()
  if (!expiry) {
    errors.expiry = 'Enter the expiration date.'
  } else {
    const match = /^(\d{2})\/(\d{2})$/.exec(expiry)
    if (!match) {
      errors.expiry = 'Use MM/YY format.'
    } else {
      const month = Number(match[1])
      const year = 2000 + Number(match[2])
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()
      if (month < 1 || month > 12) {
        errors.expiry = 'Enter a valid month between 01 and 12.'
      } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
        errors.expiry = 'This card has expired.'
      } else if (year > currentYear + 20) {
        errors.expiry = 'Enter a valid expiration date.'
      }
    }
  }

  const cvv = values.cvv
  const expectedCvv = expectedCvvLength(detectCardBrand(digits))
  if (!cvv) {
    errors.cvv =
      expectedCvv === 4
        ? 'Enter the 4-digit security code.'
        : 'Enter the 3-digit security code.'
  } else if (cvv.length !== expectedCvv) {
    errors.cvv =
      expectedCvv === 4
        ? 'American Express cards use a 4-digit code.'
        : 'Use the 3-digit code on the back of the card.'
  }

  const zip = values.billingZip.trim()
  if (!zip) {
    errors.billingZip = 'Enter your billing ZIP code.'
  } else if (!US_ZIP_RE.test(zip)) {
    errors.billingZip = 'Enter a valid 5-digit ZIP code.'
  }

  return errors
}
