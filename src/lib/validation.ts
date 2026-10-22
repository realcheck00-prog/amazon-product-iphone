/**
 * Validation for the customer details the storefront collects.
 *
 * The rules are mirrored by database constraints, so a row that somehow
 * bypasses this file is still rejected by Postgres. Client-side validation
 * exists for fast, accessible feedback — it is not a security control.
 */

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

export type CheckoutFormValues = CheckoutCustomer & CheckoutShipping

export type CheckoutField = keyof CheckoutFormValues
export type CheckoutErrors = Partial<Record<CheckoutField, string>>

export const emptyCheckoutForm: CheckoutFormValues = {
  fullName: '',
  email: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  region: '',
  postalCode: '',
  country: '',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^\+?[0-9](?:[0-9\s().-]{5,18}[0-9])$/
const COUNTRY_RE = /^[A-Za-z][A-Za-z\s.'-]{1,79}$/
const POSTAL_RE = /^[A-Za-z0-9][A-Za-z0-9\s-]{0,19}$/

/**
 * Client-side validation of the customer details.
 *
 * Phone numbers and postal codes are only checked for shape, never rewritten:
 * a legitimate `+1 (555) 010-9999` or `SW1A 1AA` must survive untouched.
 */
export function validateCheckout(values: CheckoutFormValues): CheckoutErrors {
  const errors: CheckoutErrors = {}

  const fullName = values.fullName.trim()
  if (fullName.length < 2) {
    errors.fullName = 'Enter your full name.'
  } else if (fullName.length > 120) {
    errors.fullName = 'Your name is too long.'
  }

  const email = values.email.trim()
  if (!email) {
    errors.email = 'Enter your email address.'
  } else if (email.length > 254) {
    errors.email = 'That email address is too long.'
  } else if (!EMAIL_RE.test(email)) {
    errors.email = 'Enter a valid email address.'
  }

  const phone = values.phone.trim()
  if (!phone) {
    errors.phone = 'Enter your phone number.'
  } else if (phone.length > 32) {
    errors.phone = 'That phone number is too long.'
  } else if (!PHONE_RE.test(phone)) {
    errors.phone = 'Enter a valid phone number.'
  }

  const line1 = values.line1.trim()
  if (line1.length < 2) {
    errors.line1 = 'Enter your street address.'
  } else if (line1.length > 200) {
    errors.line1 = 'Your street address is too long.'
  }

  if (values.line2.trim().length > 200) {
    errors.line2 = 'Address line 2 is too long.'
  }

  const city = values.city.trim()
  if (!city) {
    errors.city = 'Enter your city.'
  } else if (city.length > 120) {
    errors.city = 'Your city name is too long.'
  }

  const region = values.region.trim()
  if (!region) {
    errors.region = 'Enter your state or region.'
  } else if (region.length > 120) {
    errors.region = 'Your state or region is too long.'
  }

  const postalCode = values.postalCode.trim()
  if (!postalCode) {
    errors.postalCode = 'Enter your postal or ZIP code.'
  } else if (postalCode.length > 20) {
    errors.postalCode = 'That postal code is too long.'
  } else if (!POSTAL_RE.test(postalCode)) {
    errors.postalCode = 'Enter a valid postal or ZIP code.'
  }

  const country = values.country.trim()
  if (!country) {
    errors.country = 'Enter your country.'
  } else if (country.length > 80) {
    errors.country = 'Your country name is too long.'
  } else if (!COUNTRY_RE.test(country)) {
    errors.country = 'Enter a valid country name.'
  }

  return errors
}

export function hasErrors(errors: CheckoutErrors): boolean {
  return Object.keys(errors).length > 0
}
