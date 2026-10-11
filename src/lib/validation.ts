import type { CheckoutCustomer, CheckoutShipping } from './orders'

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
const COUNTRY_RE = /^[A-Za-z][A-Za-z\s.'-]{1,63}$/
const POSTAL_RE = /^[A-Za-z0-9][A-Za-z0-9\s-]{1,11}$/

/**
 * Client-side validation. The Edge Function validates again server-side —
 * this only exists to give immediate, accessible feedback.
 */
export function validateCheckout(values: CheckoutFormValues): CheckoutErrors {
  const errors: CheckoutErrors = {}

  if (values.fullName.trim().length < 2) {
    errors.fullName = 'Enter your full name.'
  }

  if (!values.email.trim()) {
    errors.email = 'Enter your email address.'
  } else if (!EMAIL_RE.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  if (!values.phone.trim()) {
    errors.phone = 'Enter your phone number.'
  } else if (!PHONE_RE.test(values.phone.trim())) {
    errors.phone = 'Enter a valid phone number.'
  }

  if (!values.line1.trim()) {
    errors.line1 = 'Enter your street address.'
  }

  if (values.line2.trim().length > 120) {
    errors.line2 = 'Address line 2 is too long.'
  }

  if (!values.city.trim()) {
    errors.city = 'Enter your city.'
  }

  if (!values.region.trim()) {
    errors.region = 'Enter your state or region.'
  }

  if (!values.postalCode.trim()) {
    errors.postalCode = 'Enter your postal or ZIP code.'
  } else if (!POSTAL_RE.test(values.postalCode.trim())) {
    errors.postalCode = 'Enter a valid postal or ZIP code.'
  }

  if (!values.country.trim()) {
    errors.country = 'Enter your country.'
  } else if (!COUNTRY_RE.test(values.country.trim())) {
    errors.country = 'Enter a valid country name.'
  }

  return errors
}

export function hasErrors(errors: CheckoutErrors): boolean {
  return Object.keys(errors).length > 0
}
