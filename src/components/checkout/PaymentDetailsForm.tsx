import type { ReactNode } from 'react'
import { AlertCircle, CreditCard, Lock, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  cardBrandLabels,
  detectCardBrand,
  expectedCvvLength,
  formatBillingZip,
  formatCardNumber,
  formatCvv,
  formatExpiry,
  type PaymentCardErrors,
  type PaymentCardField,
  type PaymentCardForm,
} from '@/lib/paymentCard'

export type PaymentDetailsFormProps = {
  values: PaymentCardForm
  errors: PaymentCardErrors
  onChange: (field: PaymentCardField, value: string) => void
  onBlur: (field: PaymentCardField) => void
  disabled?: boolean
}

const paymentMode = import.meta.env.VITE_PAYMENT_MODE ?? 'demo'

const inputClass =
  'w-full rounded-xl border bg-white px-3.5 py-3 text-base leading-6 text-ink shadow-[0_1px_2px_rgba(15,17,17,0.04)] transition-[border-color,box-shadow] duration-150 placeholder:text-ink-4 focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-muted'

const fieldErrorClass =
  'border-deal focus:border-deal focus:ring-4 focus:ring-[#cc0c39]/12'

const fieldNormalClass =
  'border-[#e2e2e7] focus:border-[#007aff] focus:ring-4 focus:ring-[#007aff]/15'

type FieldProps = {
  id: PaymentCardField
  label: string
  error?: string
  hint?: string
  className?: string
  children: ReactNode
}

function Field({ id, label, error, hint, className, children }: FieldProps) {
  const errorId = `${id}-error`

  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
          {label}
        </label>
        {hint ? <span className="text-2xs text-ink-4">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 flex items-start gap-1 text-xs font-medium text-deal"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  )
}

/**
 * iOS-inspired card-details section for the US market: brand detection,
 * MM/YY + CVV formatting, five-digit ZIP validation and accessible errors.
 *
 * Card values are held in React state only — they are never sent to a server,
 * stored, or logged (the project has no payment provider configured).
 */
export function PaymentDetailsForm({
  values,
  errors,
  onChange,
  onBlur,
  disabled = false,
}: PaymentDetailsFormProps) {
  const brand = detectCardBrand(values.cardNumber)
  const cvvLength = expectedCvvLength(brand)
  const showBrandChip = brand !== 'unknown'

  return (
    <section
      aria-labelledby="payment-details-heading"
      className="animate-fade-in rounded-[18px] border border-black/[0.07] bg-surface shadow-[0_1px_2px_rgba(15,17,17,0.05),0_10px_28px_-14px_rgba(15,17,17,0.20)]"
    >
      <header className="flex items-start justify-between gap-3 border-b border-[#ececef] px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
        <div className="min-w-0">
          <h2
            id="payment-details-heading"
            className="text-base font-semibold tracking-[-0.01em] text-ink md:text-lg"
          >
            Payment Details
          </h2>
          <p className="mt-1 text-sm text-ink-3">
            Enter your card information to continue securely.
          </p>
        </div>
        <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-pill bg-[#eef4ff] px-2.5 py-1 text-2xs font-semibold text-[#0b63d6]">
          <Lock className="size-3" aria-hidden />
          Secure
        </span>
      </header>

      <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        <Field id="cardholderName" label="Cardholder Name" error={errors.cardholderName}>
          <input
            id="cardholderName"
            name="cardholderName"
            type="text"
            autoComplete="cc-name"
            autoCapitalize="words"
            spellCheck={false}
            placeholder="Alex Morgan"
            maxLength={120}
            required
            disabled={disabled}
            value={values.cardholderName}
            aria-invalid={errors.cardholderName ? true : undefined}
            aria-describedby={errors.cardholderName ? 'cardholderName-error' : undefined}
            onChange={(event) => onChange('cardholderName', event.target.value)}
            onBlur={() => onBlur('cardholderName')}
            className={cn(
              inputClass,
              errors.cardholderName ? fieldErrorClass : fieldNormalClass,
            )}
          />
        </Field>

        <Field id="cardNumber" label="Card Number" error={errors.cardNumber}>
          <div className="relative">
            <CreditCard
              className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-4"
              aria-hidden
            />
            <input
              id="cardNumber"
              name="cardNumber"
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder={brand === 'amex' ? '3782 123456 12345' : '1234 5678 9012 3456'}
              maxLength={23}
              required
              disabled={disabled}
              value={values.cardNumber}
              aria-invalid={errors.cardNumber ? true : undefined}
              aria-describedby={errors.cardNumber ? 'cardNumber-error' : undefined}
              onChange={(event) => onChange('cardNumber', formatCardNumber(event.target.value))}
              onBlur={() => onBlur('cardNumber')}
              className={cn(
                inputClass,
                errors.cardNumber ? fieldErrorClass : fieldNormalClass,
                'pl-10',
                showBrandChip ? 'pr-24' : 'pr-3.5',
              )}
            />
            {showBrandChip ? (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-surface-muted px-2 py-1 text-[10px] font-bold uppercase tracking-[0.04em] text-ink-3">
                {cardBrandLabels[brand]}
              </span>
            ) : null}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id="expiry" label="Expiration Date (MM/YY)" error={errors.expiry}>
            <input
              id="expiry"
              name="expiry"
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/YY"
              maxLength={5}
              required
              disabled={disabled}
              value={values.expiry}
              aria-invalid={errors.expiry ? true : undefined}
              aria-describedby={errors.expiry ? 'expiry-error' : undefined}
              onChange={(event) => onChange('expiry', formatExpiry(event.target.value))}
              onBlur={() => onBlur('expiry')}
              className={cn(
                inputClass,
                errors.expiry ? fieldErrorClass : fieldNormalClass,
              )}
            />
          </Field>

          <Field
            id="cvv"
            label="Security Code (CVV)"
            error={errors.cvv}
            hint={`${cvvLength} digits`}
          >
            <input
              id="cvv"
              name="cvv"
              type="password"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
              maxLength={4}
              required
              disabled={disabled}
              value={values.cvv}
              aria-invalid={errors.cvv ? true : undefined}
              aria-describedby={errors.cvv ? 'cvv-error' : undefined}
              onChange={(event) => onChange('cvv', formatCvv(event.target.value, brand))}
              onBlur={() => onBlur('cvv')}
              className={cn(
                inputClass,
                errors.cvv ? fieldErrorClass : fieldNormalClass,
              )}
            />
          </Field>
        </div>

        <Field
          id="billingZip"
          label="Billing ZIP Code"
          error={errors.billingZip}
          className="sm:max-w-[16rem]"
        >
          <input
            id="billingZip"
            name="billingZip"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="10001"
            maxLength={10}
            required
            disabled={disabled}
            value={values.billingZip}
            aria-invalid={errors.billingZip ? true : undefined}
            aria-describedby={errors.billingZip ? 'billingZip-error' : undefined}
            onChange={(event) => onChange('billingZip', formatBillingZip(event.target.value))}
            onBlur={() => onBlur('billingZip')}
            className={cn(
              inputClass,
              errors.billingZip ? fieldErrorClass : fieldNormalClass,
            )}
          />
        </Field>

        <div className="space-y-2 border-t border-[#ececef] pt-3">
          <p className="text-2xs text-ink-4">
            All amounts are charged in US Dollars (USD).
          </p>
          <p className="flex items-start gap-2 rounded-xl bg-surface-sunken px-3 py-2.5 text-2xs leading-relaxed text-ink-3">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#0b63d6]" aria-hidden />
            <span>
              Card details are checked in this browser only — they are never sent to a
              server, stored, or logged.
              {paymentMode === 'demo' ? ' This is a demo checkout, so no real charge is made.' : ''}
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}
