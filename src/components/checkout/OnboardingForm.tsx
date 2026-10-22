import type { ReactNode } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  Info,
  Loader2,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  BIRTH_MONTHS,
  birthYearOptions,
  normalizeUsername,
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
  /** The reference issued by the backend, once the form has been submitted. */
  customerReference?: string | null
}

const inputClass =
  'w-full rounded-xl border bg-white px-3.5 py-3 text-base leading-6 text-ink shadow-[0_1px_2px_rgba(15,17,17,0.04)] transition-[border-color,box-shadow] duration-150 placeholder:text-ink-4 focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-muted'

const fieldErrorClass =
  'border-deal focus:border-deal focus:ring-4 focus:ring-[#cc0c39]/12'

const fieldNormalClass =
  'border-[#e2e2e7] focus:border-[#007aff] focus:ring-4 focus:ring-[#007aff]/15'

type FieldProps = {
  id: OnboardingField | 'customerReference'
  label: string
  error?: string
  optional?: boolean
  hint?: string
  className?: string
  children: ReactNode
}

function Field({ id, label, error, optional, hint, className, children }: FieldProps) {
  const errorId = `${id}-error`

  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
          {label}
        </label>
        {optional ? <span className="text-xs font-normal text-ink-3">Optional</span> : null}
      </div>
      {children}
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-ink-3">{hint}</p> : null}
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
 * Customer onboarding section of the checkout.
 *
 * SECURITY: there is no card-number, expiry, CVV or PIN input here, so those
 * credentials can neither be entered nor transmitted. There is no password
 * field and no one-time-code field either — the account is confirmed by our
 * team over the phone, so nothing credential-shaped is ever collected, sent
 * or stored.
 *
 * The customer reference is READ-ONLY here. It is issued by the backend
 * (the database generates it) when the form is submitted; the customer can
 * never type or choose it, and it is not a credential.
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
  customerReference = null,
}: OnboardingFormProps) {
  const years = birthYearOptions()

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
            Customer Account
          </h2>
          <p className="mt-1 text-sm text-ink-3">
            Create your account. We confirm it with you by phone before it is activated.
          </p>
        </div>
        <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-pill bg-[#eef4ff] px-2.5 py-1 text-2xs font-semibold text-[#0b63d6]">
          <UserPlus className="size-3" aria-hidden />
          Onboarding
        </span>
      </header>

      <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        <p className="flex items-start gap-2 rounded-xl bg-surface-sunken px-3 py-2.5 text-xs leading-relaxed text-ink-3">
          <Info className="mt-0.5 size-3.5 shrink-0 text-[#0b63d6]" aria-hidden />
          <span>
            <span className="font-semibold text-ink-2">Your customer reference is issued by us.</span>{' '}
            It is created on our server when you submit this form — you never type it, and it is
            not a password or a code.
          </span>
        </p>

        <Field
          id="username"
          label="Username"
          error={errors.username}
          hint="Letters and numbers only, 3–32 characters. Choose one you will recognise."
        >
          <input
            id="username"
            name="username"
            type="text"
            inputMode="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="alexmorgan"
            maxLength={32}
            required
            disabled={disabled}
            value={values.username}
            aria-invalid={errors.username ? true : undefined}
            aria-describedby={errors.username ? 'username-error' : undefined}
            onChange={(event) => onChange('username', normalizeUsername(event.target.value))}
            onBlur={() => onBlur('username')}
            className={cn(inputClass, errors.username ? fieldErrorClass : fieldNormalClass)}
          />
        </Field>

        <Field
          id="customerReference"
          label="Customer reference"
          hint="Assigned automatically. Quote it if you contact us about this order."
        >
          <input
            id="customerReference"
            name="customerReference"
            type="text"
            readOnly
            disabled
            value={customerReference ?? 'Assigned when you submit'}
            aria-describedby="customerReference-hint"
            className={cn(inputClass, 'border-[#e2e2e7]')}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            id="birthMonth"
            label="Birth month"
            optional
            error={errors.birthMonth}
            hint="Only needed where an age requirement applies."
          >
            <select
              id="birthMonth"
              name="birthMonth"
              autoComplete="bday-month"
              disabled={disabled}
              value={values.birthMonth}
              aria-invalid={errors.birthMonth ? true : undefined}
              aria-describedby={errors.birthMonth ? 'birthMonth-error' : undefined}
              onChange={(event) => onChange('birthMonth', event.target.value)}
              onBlur={() => onBlur('birthMonth')}
              className={cn(inputClass, errors.birthMonth ? fieldErrorClass : fieldNormalClass)}
            >
              <option value="">Not provided</option>
              {BIRTH_MONTHS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </Field>

          <Field id="birthYear" label="Birth year" optional error={errors.birthYear}>
            <select
              id="birthYear"
              name="birthYear"
              autoComplete="bday-year"
              disabled={disabled}
              value={values.birthYear}
              aria-invalid={errors.birthYear ? true : undefined}
              aria-describedby={errors.birthYear ? 'birthYear-error' : undefined}
              onChange={(event) => onChange('birthYear', event.target.value)}
              onBlur={() => onBlur('birthYear')}
              className={cn(inputClass, errors.birthYear ? fieldErrorClass : fieldNormalClass)}
            >
              <option value="">Not provided</option>
              {years.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
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
            Download account details (CSV)
          </Button>
        ) : null}

        <div className="space-y-2 border-t border-[#ececef] pt-3">
          <p className="text-2xs text-ink-4">All amounts are shown in US Dollars (USD).</p>
          <p className="flex items-start gap-2 rounded-xl bg-surface-sunken px-3 py-2.5 text-2xs leading-relaxed text-ink-3">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#0b63d6]" aria-hidden />
            <span>
              The record contains only your username, name, email, phone, delivery address,
              customer reference and — if you chose to give it — your birth month and year. No card
              number, expiry date, CVV, PIN, password or one-time code is ever collected, sent or
              stored.
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}
