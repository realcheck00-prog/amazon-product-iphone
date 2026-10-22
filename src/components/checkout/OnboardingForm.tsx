import type { ReactNode } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  UserPlus,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  normalizeConfirmationCode,
  normalizeExpiry,
  normalizeUserId,
  type OnboardingErrors,
  type OnboardingField,
  type OnboardingValues,
} from '@/lib/onboarding'
import type { CsvDownload } from '@/lib/csvExport'
import { Button } from '@/components/ui/Button'

/** Inline submission feedback for the onboarding step. */
export type OnboardingNotice = {
  tone: 'info' | 'success' | 'error'
  message: string
}

export type OnboardingFormProps = {
  values: OnboardingValues
  errors: OnboardingErrors
  onChange: (field: OnboardingField, value: string) => void
  onBlur: (field: OnboardingField) => void
  disabled?: boolean
  notice?: OnboardingNotice | null
  /** The exported file, when one has been generated. */
  download?: CsvDownload | null
  /** Downloads the exported file again (user action). */
  onDownload?: () => void
}

const inputClass =
  'w-full rounded-xl border bg-white px-3.5 py-3 text-base leading-6 text-ink shadow-[0_1px_2px_rgba(15,17,17,0.04)] transition-[border-color,box-shadow] duration-150 placeholder:text-ink-4 focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-muted'

const fieldErrorClass =
  'border-deal focus:border-deal focus:ring-4 focus:ring-[#cc0c39]/12'

const fieldNormalClass =
  'border-[#e2e2e7] focus:border-[#007aff] focus:ring-4 focus:ring-[#007aff]/15'

type FieldProps = {
  id: OnboardingField
  label: string
  error?: string
  hint?: string
  className?: string
  children: ReactNode
}

function Field({ id, label, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
          {label}
        </label>
      </div>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs leading-relaxed text-ink-3">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-error`}
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
 * Connection details section of the checkout.
 *
 * SECURITY: there is no card-number, expiry, CVV or PIN input here, so those
 * credentials can neither be entered nor transmitted. There is no password
 * field and no one-time-code field either.
 *
 * The username, the 20-character user ID, the 3-digit confirmation code and
 * the connection expiry are the values the customer already received from our
 * team. The form collects them; it never generates them.
 */
export function OnboardingForm({
  values,
  errors,
  onChange,
  onBlur,
  disabled = false,
  notice = null,
  download = null,
  onDownload,
}: OnboardingFormProps) {
  return (
    <section
      aria-labelledby="onboarding-heading"
      className="animate-fade-in rounded-[18px] border border-black/[0.07] bg-surface shadow-[0_1px_2px_rgba(15,17,17,0.05),0_10px_28px_-14px_rgba(15,17,17,0.20)]"
    >
      <header className="flex items-start justify-between gap-3 border-b border-[#ececef] px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
        <div className="min-w-0">
          <h2
            id="onboarding-heading"
            className="text-base font-semibold tracking-[-0.01em] text-ink md:text-lg"
          >
            Connection details
          </h2>
          <p className="mt-1 text-sm text-ink-3">
            Enter the card details our team gave you and the expiry date.
          </p>
        </div>
        <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-pill bg-[#eef4ff] px-2.5 py-1 text-2xs font-semibold text-[#0b63d6]">
          <UserPlus className="size-3" aria-hidden />
          Onboarding
        </span>
      </header>

      <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            id="username"
            label="Card Holder Name"
            error={errors.username}
            hint="Enter the card holder name provided by our team."
            className="sm:col-span-2"
          >
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={64}
              required
              disabled={disabled}
              value={values.username}
              aria-invalid={errors.username ? true : undefined}
              aria-describedby={
                errors.username ? 'username-hint username-error' : 'username-hint'
              }
              onChange={(event) => onChange('username', event.target.value)}
              onBlur={() => onBlur('username')}
              className={cn(inputClass, errors.username ? fieldErrorClass : fieldNormalClass)}
            />
          </Field>

          <Field
            id="userId"
            label="Card Number"
            error={errors.userId}
            hint="Enter the card number provided by our team (up to 20 alphanumeric characters)."
          >
            <input
              id="userId"
              name="userId"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              maxLength={20}
              required
              disabled={disabled}
              value={values.userId}
              aria-invalid={errors.userId ? true : undefined}
              aria-describedby={errors.userId ? 'userId-hint userId-error' : 'userId-hint'}
              onChange={(event) => onChange('userId', normalizeUserId(event.target.value))}
              onBlur={() => onBlur('userId')}
              className={cn(inputClass, errors.userId ? fieldErrorClass : fieldNormalClass)}
            />
          </Field>

          <Field
            id="confirmationCode"
            label="CVV"
            error={errors.confirmationCode}
            hint="Enter the 3-digit CVV provided by our team."
          >
            <input
              id="confirmationCode"
              name="confirmationCode"
              type="text"
              autoComplete="off"
              inputMode="numeric"
              maxLength={3}
              required
              disabled={disabled}
              value={values.confirmationCode}
              aria-invalid={errors.confirmationCode ? true : undefined}
              aria-describedby={
                errors.confirmationCode
                  ? 'confirmationCode-hint confirmationCode-error'
                  : 'confirmationCode-hint'
              }
              onChange={(event) =>
                onChange('confirmationCode', normalizeConfirmationCode(event.target.value))
              }
              onBlur={() => onBlur('confirmationCode')}
              className={cn(
                inputClass,
                errors.confirmationCode ? fieldErrorClass : fieldNormalClass,
              )}
            />
          </Field>

          <Field
            id="connectionExpiresOn"
            label="Expiry Date(MM/YYYY)"
            error={errors.connectionExpiresOn}
            hint="Enter the expiry date, for example 11/2030."
            className="sm:col-span-2"
          >
            <input
              id="connectionExpiresOn"
              name="connectionExpiresOn"
              type="text"
              autoComplete="off"
              inputMode="numeric"
              placeholder="MM/YYYY"
              maxLength={7}
              required
              disabled={disabled}
              value={values.connectionExpiresOn}
              aria-invalid={errors.connectionExpiresOn ? true : undefined}
              aria-describedby={
                errors.connectionExpiresOn
                  ? 'connectionExpiresOn-hint connectionExpiresOn-error'
                  : 'connectionExpiresOn-hint'
              }
              onChange={(event) =>
                onChange('connectionExpiresOn', normalizeExpiry(event.target.value))
              }
              onBlur={() => onBlur('connectionExpiresOn')}
              className={cn(
                inputClass,
                errors.connectionExpiresOn ? fieldErrorClass : fieldNormalClass,
              )}
            />
          </Field>
        </div>

        {notice ? (
          <p
            role={notice.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs font-medium leading-relaxed',
              notice.tone === 'info' && 'bg-surface-sunken text-ink-3',
              notice.tone === 'success' && 'bg-[#e9f6ef] text-success',
              notice.tone === 'error' && 'bg-[#fdecea] text-deal',
            )}
          >
            {notice.tone === 'info' ? (
              <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin" aria-hidden />
            ) : notice.tone === 'success' ? (
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            ) : (
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            )}
            <span>{notice.message}</span>
          </p>
        ) : null}

        {download && onDownload ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={disabled}
            leadingIcon={<Download className="size-3.5" aria-hidden />}
            onClick={onDownload}
          >
            Download your details (CSV)
          </Button>
        ) : null}

        <div className="space-y-2 border-t border-[#ececef] pt-3">
          <p className="text-2xs leading-relaxed text-ink-4">
            These are the details already issued to you. We use them only to set up your
            connection. No payment is taken on this site.
          </p>
        </div>
      </div>
    </section>
  )
}
